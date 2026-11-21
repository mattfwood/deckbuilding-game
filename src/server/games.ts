import "server-only";
import { randomUUID } from "node:crypto";
import {
  BOT_NAMES,
  EngineError,
  KINGDOM_CARD_IDS,
  applyAction,
  chooseBotAction,
  createGame as createEngineGame,
  getActor,
  getPlayerView,
  type Action,
  type CardId,
  type GameState,
  type PlayerView,
} from "@/engine";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { parseAction } from "./parseAction";

export const MAX_BOTS = BOT_NAMES.length;
/** Most actions one request may submit (e.g. "play all treasures, then buy"). */
export const MAX_BATCH = 4;

/** The game doesn't exist, or the caller has no seat in it. Same error for both, so ids can't be probed. */
export class GameNotFoundError extends Error {}
/** Someone else's action landed first; the caller should take the fresh snapshot and retry. */
export class ConflictError extends Error {}

export interface SeatInfo {
  name: string;
  kind: "human" | "bot";
}

/** Everything a client gets about a game: its own view, never the full state. */
export interface GameSnapshot {
  gameId: string;
  /** Number of actions in the log. Increases by one for every accepted action. */
  seq: number;
  seats: SeatInfo[];
  view: PlayerView;
}

export interface GameSummary {
  id: string;
  status: "active" | "finished";
  opponents: string[];
  turnNumber: number;
  updatedAt: Date;
}

interface GameConfig {
  kingdom: CardId[];
}

interface Loaded {
  id: string;
  seats: (SeatInfo & { guestId: string | null })[];
  state: GameState;
  seq: number;
}

/**
 * Replayed states, keyed by game id. The log is append-only and the engine is
 * deterministic, so a cached state for the first `seq` actions never goes
 * stale: we only replay whatever was appended since. Safe across instances.
 */
const CACHE_LIMIT = 200;
const stateCache = new Map<string, { seq: number; state: GameState }>();

function remember(id: string, seq: number, state: GameState) {
  stateCache.delete(id);
  stateCache.set(id, { seq, state });
  if (stateCache.size > CACHE_LIMIT) stateCache.delete(stateCache.keys().next().value!);
}

/** For tests. */
export function clearStateCache() {
  stateCache.clear();
}

export function createGameService(db: PrismaClient) {
  async function load(gameId: string): Promise<Loaded> {
    const cached = stateCache.get(gameId);
    const game = await db.game.findUnique({
      where: { id: gameId },
      include: {
        players: { orderBy: { seat: "asc" } },
        actions: {
          where: { seq: { gte: cached?.seq ?? 0 } },
          orderBy: { seq: "asc" },
        },
      },
    });
    if (!game) throw new GameNotFoundError("Game not found.");

    let state: GameState;
    let seq: number;
    if (cached) {
      state = cached.state;
      seq = cached.seq;
    } else {
      const config = game.config as unknown as GameConfig;
      state = createEngineGame({
        seed: game.seed,
        players: game.players.map((p) => ({ id: p.id, name: p.name })),
        kingdom: config.kingdom,
      });
      seq = 0;
    }
    for (const row of game.actions) {
      if (row.seq !== seq) throw new Error(`Game ${gameId} has a gap in its log at ${seq}.`);
      state = applyAction(state, row.payload as unknown as Action);
      seq++;
    }
    remember(gameId, seq, state);

    return {
      id: game.id,
      seats: game.players.map((p) => ({ name: p.name, kind: p.kind, guestId: p.guestId })),
      state,
      seq,
    };
  }

  function seatOf(game: Loaded, guestId: string): number {
    const seat = game.seats.findIndex((s) => s.kind === "human" && s.guestId === guestId);
    if (seat < 0) throw new GameNotFoundError("Game not found.");
    return seat;
  }

  function snapshot(game: Loaded, seat: number): GameSnapshot {
    return {
      gameId: game.id,
      seq: game.seq,
      seats: game.seats.map(({ name, kind }) => ({ name, kind })),
      view: getPlayerView(game.state, seat),
    };
  }

  /** Validate and apply actions in memory, then append them to the log in one transaction. */
  async function commit(game: Loaded, entries: { seat: number; action: Action }[]) {
    let state = game.state;
    for (const { action } of entries) state = applyAction(state, action);

    try {
      await db.$transaction([
        db.gameAction.createMany({
          data: entries.map(({ seat, action }, i) => ({
            gameId: game.id,
            seq: game.seq + i,
            seat,
            payload: action as unknown as Prisma.InputJsonValue,
          })),
        }),
        db.game.update({
          where: { id: game.id },
          data: { status: state.phase === "gameOver" ? "finished" : "active" },
        }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictError("The game moved on before your action arrived.");
      }
      throw e;
    }

    const seq = game.seq + entries.length;
    remember(game.id, seq, state);
    return { ...game, state, seq };
  }

  return {
    async createGame(opts: { guestId: string; name: string; botCount: number }): Promise<string> {
      const botCount = Math.trunc(opts.botCount);
      if (!(botCount >= 1 && botCount <= MAX_BOTS)) {
        throw new EngineError(`Choose between 1 and ${MAX_BOTS} bots.`);
      }
      const name = opts.name.trim().slice(0, 24) || "Player";
      const seats: (SeatInfo & { guestId: string | null })[] = [
        { name, kind: "human", guestId: opts.guestId },
        ...BOT_NAMES.slice(0, botCount).map((n) => ({
          name: n,
          kind: "bot" as const,
          guestId: null,
        })),
      ];
      const config: GameConfig = { kingdom: [...KINGDOM_CARD_IDS] };
      const seed = randomUUID();
      // Fail before writing anything if the engine rejects this setup.
      createEngineGame({
        seed,
        players: seats.map((s, i) => ({ id: String(i), name: s.name })),
        kingdom: config.kingdom,
      });

      const game = await db.game.create({
        data: {
          seed,
          config: config as unknown as Prisma.InputJsonValue,
          players: { create: seats.map((s, seat) => ({ ...s, seat })) },
        },
      });
      return game.id;
    },

    async getSnapshot(gameId: string, guestId: string): Promise<GameSnapshot> {
      const game = await load(gameId);
      return snapshot(game, seatOf(game, guestId));
    },

    /** Apply the caller's actions, in order. All or nothing. */
    async act(gameId: string, guestId: string, input: unknown): Promise<GameSnapshot> {
      const raw = Array.isArray(input) ? input : [input];
      if (raw.length === 0 || raw.length > MAX_BATCH) {
        throw new EngineError(`Send between 1 and ${MAX_BATCH} actions.`);
      }
      const game = await load(gameId);
      const seat = seatOf(game, guestId);
      const actions = raw.map(parseAction);
      for (const a of actions) {
        if (a.player !== seat) throw new EngineError("You can only act for your own seat.");
      }
      const next = await commit(
        game,
        actions.map((action) => ({ seat, action })),
      );
      return snapshot(next, seat);
    },

    /**
     * Make one move for whichever bot must act. A no-op if it's not a bot's
     * move, so a repeated or late call is harmless. Only seated players may ask.
     */
    async stepBot(gameId: string, guestId: string): Promise<GameSnapshot> {
      const game = await load(gameId);
      const seat = seatOf(game, guestId);
      const actor = getActor(game.state);
      if (actor === null || game.seats[actor].kind !== "bot") return snapshot(game, seat);
      try {
        const next = await commit(game, [
          { seat: actor, action: chooseBotAction(game.state, actor) },
        ]);
        return snapshot(next, seat);
      } catch (e) {
        // Another request already moved this bot: just report where things are now.
        if (e instanceof ConflictError) return snapshot(await load(gameId), seat);
        throw e;
      }
    },

    async listGames(guestId: string): Promise<GameSummary[]> {
      const rows = await db.game.findMany({
        where: { players: { some: { guestId } } },
        include: { players: { orderBy: { seat: "asc" } } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });
      return Promise.all(
        rows.map(async (row) => {
          const game = await load(row.id);
          return {
            id: row.id,
            status: row.status,
            opponents: row.players.filter((p) => p.guestId !== guestId).map((p) => p.name),
            turnNumber: game.state.turnNumber,
            updatedAt: row.updatedAt,
          };
        }),
      );
    },
  };
}

export type GameService = ReturnType<typeof createGameService>;
