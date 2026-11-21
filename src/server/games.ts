import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import {
  BOT_NAMES,
  EngineError,
  KINGDOM_CARD_IDS,
  MAX_PLAYERS,
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
export const MAX_NAME_LENGTH = 24;

/** The game doesn't exist, or the caller has no seat in it. Same error for both, so ids can't be probed. */
export class GameNotFoundError extends Error {}
/** Someone else's action landed first; the caller should take the fresh snapshot and retry. */
export class ConflictError extends Error {}

export interface SeatInfo {
  name: string;
  kind: "human" | "bot";
}

/** A game still gathering players. */
export interface LobbySnapshot {
  status: "lobby";
  gameId: string;
  /** Bumps on every change; pollers send it back to ask "anything new?". */
  version: number;
  seats: SeatInfo[];
  you: number;
  /** Seat 0 created the game and decides when it starts. */
  isHost: boolean;
  /** For the invite link. Only ever sent to players already seated. */
  inviteCode: string;
  maxSeats: number;
}

/** A game in progress or over: this player's view, never the full state. */
export interface PlaySnapshot {
  status: "active" | "finished";
  gameId: string;
  version: number;
  /** Number of actions in the log. */
  seq: number;
  seats: SeatInfo[];
  view: PlayerView;
}

export type GameSnapshot = LobbySnapshot | PlaySnapshot;

export interface GameSummary {
  id: string;
  status: "lobby" | "active" | "finished";
  opponents: string[];
  turnNumber: number;
  updatedAt: Date;
}

/** What someone holding an invite link may see before joining. */
export interface InviteInfo {
  gameId: string;
  status: "lobby" | "active" | "finished";
  hostName: string;
  seats: SeatInfo[];
  maxSeats: number;
  /** Already seated in this game. */
  joined: boolean;
}

interface GameConfig {
  kingdom: CardId[];
}

type SeatRow = SeatInfo & { guestId: string | null };

interface Loaded {
  id: string;
  status: "lobby" | "active" | "finished";
  version: number;
  inviteCode: string;
  seats: SeatRow[];
  /** Null while in the lobby: there is no engine state until the game starts. */
  state: GameState | null;
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

function newInviteCode(): string {
  return randomBytes(12).toString("base64url");
}

/** Trim, collapse spaces, cap the length, and avoid clashing with names already seated. */
function cleanName(raw: string, taken: string[] = []): string {
  const base = String(raw).replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH) || "Player";
  let name = base;
  for (let n = 2; taken.includes(name); n++) name = `${base} ${n}`;
  return name;
}

function notFound(): never {
  throw new GameNotFoundError("Game not found.");
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
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
    if (!game) notFound();
    const base = {
      id: game.id,
      status: game.status,
      version: game.version,
      inviteCode: game.inviteCode,
      seats: game.players.map((p) => ({ name: p.name, kind: p.kind, guestId: p.guestId })),
    };
    if (game.status === "lobby") return { ...base, state: null, seq: 0 };

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
    return { ...base, state, seq };
  }

  function seatOf(seats: SeatRow[], guestId: string): number {
    const seat = seats.findIndex((s) => s.kind === "human" && s.guestId === guestId);
    if (seat < 0) notFound();
    return seat;
  }

  function snapshot(game: Loaded, seat: number): GameSnapshot {
    const seats = game.seats.map(({ name, kind }) => ({ name, kind }));
    if (game.status === "lobby" || !game.state) {
      return {
        status: "lobby",
        gameId: game.id,
        version: game.version,
        seats,
        you: seat,
        isHost: seat === 0,
        inviteCode: game.inviteCode,
        maxSeats: MAX_PLAYERS,
      };
    }
    return {
      status: game.status,
      gameId: game.id,
      version: game.version,
      seq: game.seq,
      seats,
      view: getPlayerView(game.state, seat),
    };
  }

  function started(game: Loaded): Loaded & { state: GameState } {
    if (!game.state) throw new EngineError("The game hasn't started yet.");
    return game as Loaded & { state: GameState };
  }

  /** Validate and apply actions in memory, then append them to the log in one transaction. */
  async function commit(
    game: Loaded & { state: GameState },
    entries: { seat: number; action: Action }[],
  ): Promise<Loaded> {
    let state = game.state;
    for (const { action } of entries) state = applyAction(state, action);

    let version: number;
    try {
      const [, updated] = await db.$transaction([
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
          data: {
            status: state.phase === "gameOver" ? "finished" : "active",
            version: { increment: entries.length },
          },
        }),
      ]);
      version = updated.version;
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictError("The game moved on before your action arrived.");
      }
      throw e;
    }

    const seq = game.seq + entries.length;
    remember(game.id, seq, state);
    return {
      ...game,
      status: state.phase === "gameOver" ? "finished" : "active",
      state,
      seq,
      version,
    };
  }

  /**
   * Change a lobby's seats. Locks the game row, so lobby changes (and starting
   * the game) happen one at a time: nobody can join a game that just started.
   */
  async function inLobby(
    gameId: string,
    fn: (tx: Prisma.TransactionClient, seats: SeatRow[]) => Promise<void>,
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ status: string }[]>`
        SELECT status::text FROM "Game" WHERE id = ${gameId} FOR UPDATE`;
      if (locked.length === 0) notFound();
      if (locked[0].status !== "lobby") throw new EngineError("This game has already started.");
      const players = await tx.gamePlayer.findMany({
        where: { gameId },
        orderBy: { seat: "asc" },
      });
      await fn(
        tx,
        players.map((p) => ({ name: p.name, kind: p.kind, guestId: p.guestId })),
      );
      await tx.game.update({ where: { id: gameId }, data: { version: { increment: 1 } } });
    });
  }

  function requireHost(seats: SeatRow[], guestId: string) {
    if (seatOf(seats, guestId) !== 0) throw new EngineError("Only the host can do that.");
  }

  async function getSnapshot(gameId: string, guestId: string): Promise<GameSnapshot> {
    const game = await load(gameId);
    return snapshot(game, seatOf(game.seats, guestId));
  }

  async function createRow(guestId: string, name: string, status: "lobby" | "active", bots = 0) {
    const seats: SeatRow[] = [
      { name: cleanName(name), kind: "human", guestId },
      ...BOT_NAMES.slice(0, bots).map((n) => ({ name: n, kind: "bot" as const, guestId: null })),
    ];
    const config: GameConfig = { kingdom: [...KINGDOM_CARD_IDS] };
    const game = await db.game.create({
      data: {
        seed: randomUUID(),
        status,
        inviteCode: newInviteCode(),
        config: config as unknown as Prisma.InputJsonValue,
        players: { create: seats.map((s, seat) => ({ ...s, seat })) },
      },
    });
    return game.id;
  }

  return {
    /** A game against bots that starts right away. */
    async createGame(opts: { guestId: string; name: string; botCount: number }): Promise<string> {
      const botCount = Math.trunc(opts.botCount);
      if (!(botCount >= 1 && botCount <= MAX_BOTS)) {
        throw new EngineError(`Choose between 1 and ${MAX_BOTS} bots.`);
      }
      return createRow(opts.guestId, opts.name, "active", botCount);
    },

    /** A game that waits in a lobby for friends to join by invite link. */
    async createLobby(opts: { guestId: string; name: string }): Promise<string> {
      return createRow(opts.guestId, opts.name, "lobby");
    },

    async getInvite(code: string, guestId: string | null): Promise<InviteInfo> {
      const game = await db.game.findUnique({
        where: { inviteCode: code },
        include: { players: { orderBy: { seat: "asc" } } },
      });
      if (!game) throw new GameNotFoundError("That invite link isn't valid.");
      return {
        gameId: game.id,
        status: game.status,
        hostName: game.players[0]?.name ?? "",
        seats: game.players.map(({ name, kind }) => ({ name, kind })),
        maxSeats: MAX_PLAYERS,
        joined: guestId !== null && game.players.some((p) => p.guestId === guestId),
      };
    },

    /** Take an open seat. Joining a game you're already in just returns its id. */
    async joinLobby(code: string, guestId: string, name: string): Promise<string> {
      const game = await db.game.findUnique({
        where: { inviteCode: code },
        include: { players: { where: { guestId } } },
      });
      if (!game) throw new GameNotFoundError("That invite link isn't valid.");
      if (game.players.length > 0) return game.id;

      try {
        await inLobby(game.id, async (tx, seats) => {
          if (seats.length >= MAX_PLAYERS) throw new EngineError("This game is full.");
          await tx.gamePlayer.create({
            data: {
              gameId: game.id,
              seat: seats.length,
              kind: "human",
              guestId,
              name: cleanName(
                name,
                seats.map((s) => s.name),
              ),
            },
          });
        });
      } catch (e) {
        // The same guest joining twice at once: the other request seated them.
        if (isUniqueViolation(e)) return game.id;
        throw e;
      }
      return game.id;
    },

    async addBot(gameId: string, guestId: string): Promise<GameSnapshot> {
      await inLobby(gameId, async (tx, seats) => {
        requireHost(seats, guestId);
        if (seats.length >= MAX_PLAYERS) throw new EngineError("This game is full.");
        const name = BOT_NAMES.find((n) => !seats.some((s) => s.name === n));
        if (!name) throw new EngineError("No more bots available.");
        await tx.gamePlayer.create({
          data: { gameId, seat: seats.length, kind: "bot", guestId: null, name },
        });
      });
      return getSnapshot(gameId, guestId);
    },

    /**
     * Free a seat: the host may remove anyone else, and anyone may remove
     * themselves (except the host, who cancels instead). Later seats shift down.
     */
    async removeSeat(gameId: string, guestId: string, seat: number): Promise<void> {
      await inLobby(gameId, async (tx, seats) => {
        const mine = seatOf(seats, guestId);
        if (!Number.isInteger(seat) || seat <= 0 || seat >= seats.length) {
          throw new EngineError(
            seat === 0 ? "The host can't leave; cancel the game instead." : "No such seat.",
          );
        }
        if (mine !== 0 && mine !== seat) throw new EngineError("Only the host can do that.");
        await tx.gamePlayer.delete({ where: { gameId_seat: { gameId, seat } } });
        for (let s = seat + 1; s < seats.length; s++) {
          await tx.gamePlayer.update({
            where: { gameId_seat: { gameId, seat: s } },
            data: { seat: s - 1 },
          });
        }
      });
    },

    async startGame(gameId: string, guestId: string): Promise<GameSnapshot> {
      await inLobby(gameId, async (tx, seats) => {
        requireHost(seats, guestId);
        if (seats.length < 2) throw new EngineError("Invite a friend or add a bot first.");
        await tx.game.update({ where: { id: gameId }, data: { status: "active" } });
      });
      return getSnapshot(gameId, guestId);
    },

    /** The host abandons a lobby. Deletes it, so everyone else's poll finds it gone. */
    async cancelLobby(gameId: string, guestId: string): Promise<void> {
      await db.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ status: string }[]>`
          SELECT status::text FROM "Game" WHERE id = ${gameId} FOR UPDATE`;
        if (locked.length === 0) notFound();
        const host = await tx.gamePlayer.findUnique({
          where: { gameId_seat: { gameId, seat: 0 } },
        });
        if (host?.guestId !== guestId) notFound();
        if (locked[0].status !== "lobby") throw new EngineError("This game has already started.");
        await tx.game.delete({ where: { id: gameId } });
      });
    },

    getSnapshot,

    /**
     * For polling: null if nothing changed since `version`, else a fresh
     * snapshot. The unchanged case is one small query with no replay.
     */
    async poll(gameId: string, guestId: string, version: number): Promise<GameSnapshot | null> {
      const game = await db.game.findUnique({
        where: { id: gameId },
        select: { version: true, players: { where: { guestId }, select: { seat: true } } },
      });
      if (!game || game.players.length === 0) notFound();
      if (game.version === version) return null;
      return getSnapshot(gameId, guestId);
    },

    /** Apply the caller's actions, in order. All or nothing. */
    async act(gameId: string, guestId: string, input: unknown): Promise<GameSnapshot> {
      const raw = Array.isArray(input) ? input : [input];
      if (raw.length === 0 || raw.length > MAX_BATCH) {
        throw new EngineError(`Send between 1 and ${MAX_BATCH} actions.`);
      }
      const game = await load(gameId);
      const seat = seatOf(game.seats, guestId);
      const actions = raw.map(parseAction);
      for (const a of actions) {
        if (a.player !== seat) throw new EngineError("You can only act for your own seat.");
      }
      const next = await commit(
        started(game),
        actions.map((action) => ({ seat, action })),
      );
      return snapshot(next, seat);
    },

    /**
     * Make one move for whichever bot must act. A no-op if it's not a bot's
     * move, so a repeated or late call is harmless: any seated player's client
     * may drive the bots, and several may try at once.
     */
    async stepBot(gameId: string, guestId: string): Promise<GameSnapshot> {
      const game = await load(gameId);
      const seat = seatOf(game.seats, guestId);
      if (!game.state) return snapshot(game, seat);
      const actor = getActor(game.state);
      if (actor === null || game.seats[actor].kind !== "bot") return snapshot(game, seat);
      try {
        const next = await commit(started(game), [
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
            turnNumber: game.state?.turnNumber ?? 0,
            updatedAt: row.updatedAt,
          };
        }),
      );
    },
  };
}

export type GameService = ReturnType<typeof createGameService>;
