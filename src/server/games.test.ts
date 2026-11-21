import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { EngineError, type Action } from "@/engine";
import { Prisma } from "@/generated/prisma/client";
import { createPrismaClient } from "./db";
import {
  ConflictError,
  GameNotFoundError,
  clearStateCache,
  createGameService,
  type GameSnapshot,
} from "./games";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("game service (Postgres)", () => {
  const db = createPrismaClient(url!);
  const svc = createGameService(db);
  const ME = "guest-me";

  beforeEach(async () => {
    await db.$executeRawUnsafe(`TRUNCATE "GameAction", "GamePlayer", "Game" CASCADE`);
    clearStateCache();
  });
  afterAll(() => db.$disconnect());

  async function newGame(botCount = 1) {
    const id = await svc.createGame({ guestId: ME, name: "Me", botCount });
    return svc.getSnapshot(id, ME);
  }

  /** Let bots move until it's my turn again (or the game ends). */
  async function botsUntilMe(snap: GameSnapshot): Promise<GameSnapshot> {
    while (snap.view.actor !== null && snap.seats[snap.view.actor].kind === "bot") {
      snap = await svc.stepBot(snap.gameId, ME);
    }
    return snap;
  }

  const endTurn: Action[] = [
    { type: "endPhase", player: 0 },
    { type: "endPhase", player: 0 },
  ];

  it("creates a game with the caller in seat 0 and bots after", async () => {
    const snap = await newGame(2);
    expect(snap.seq).toBe(0);
    expect(snap.seats).toEqual([
      { name: "Me", kind: "human" },
      { name: "Ada", kind: "bot" },
      { name: "Bram", kind: "bot" },
    ]);
    expect(snap.view.you).toBe(0);
    expect(snap.view.actor).toBe(0);
    expect(snap.view.hand).toHaveLength(5);
  });

  it("never sends the seed, RNG, or other players' hands", async () => {
    const snap = await newGame();
    const json = JSON.stringify(snap);
    const game = await db.game.findUniqueOrThrow({ where: { id: snap.gameId } });
    expect(json).not.toContain(game.seed);
    expect(snap.view).not.toHaveProperty("rng");
    expect(snap.view.players[1]).not.toHaveProperty("hand");
    expect(snap.view.players[1].handCount).toBe(5);
  });

  it("hides games from guests who aren't seated in them", async () => {
    const snap = await newGame();
    await expect(svc.getSnapshot(snap.gameId, "someone-else")).rejects.toThrow(GameNotFoundError);
    await expect(svc.act(snap.gameId, "someone-else", endTurn)).rejects.toThrow(GameNotFoundError);
    await expect(svc.stepBot(snap.gameId, "someone-else")).rejects.toThrow(GameNotFoundError);
    await expect(svc.getSnapshot("no-such-game", ME)).rejects.toThrow(GameNotFoundError);
  });

  it("appends accepted actions to the log, a batch at a time", async () => {
    const snap = await newGame();
    const next = await svc.act(snap.gameId, ME, endTurn);
    expect(next.seq).toBe(2);
    expect(next.view.currentPlayer).toBe(1);
    const rows = await db.gameAction.findMany({
      where: { gameId: snap.gameId },
      orderBy: { seq: "asc" },
    });
    expect(rows.map((r) => [r.seq, r.seat])).toEqual([
      [0, 0],
      [1, 0],
    ]);
    expect(rows[0].payload).toEqual({ type: "endPhase", player: 0 });
  });

  it("rejects bad input, other seats, and illegal moves without writing anything", async () => {
    const { gameId } = await newGame();
    const attempts: unknown[] = [
      { type: "endPhase", player: 1 }, // not my seat
      { type: "buy", player: 0, cardId: "not-a-card" },
      { type: "buy", player: 0, cardId: "capital" }, // can't afford
      { type: "launchMissiles", player: 0 },
      [
        { type: "endPhase", player: 0 },
        { type: "buy", player: 0, cardId: "capital" },
      ], // all or nothing
      [],
      "endPhase",
    ];
    for (const input of attempts) {
      await expect(svc.act(gameId, ME, input)).rejects.toThrow(EngineError);
    }
    expect(await db.gameAction.count({ where: { gameId } })).toBe(0);
  });

  it("stores only the fields an action needs", async () => {
    const { gameId } = await newGame();
    await svc.act(gameId, ME, { type: "endPhase", player: 0, extra: "x".repeat(1000) });
    const row = await db.gameAction.findFirstOrThrow({ where: { gameId } });
    expect(row.payload).toEqual({ type: "endPhase", player: 0 });
  });

  it("steps bots one action at a time, and does nothing on a human's move", async () => {
    let snap = await newGame();
    expect((await svc.stepBot(snap.gameId, ME)).seq).toBe(0);

    snap = await svc.act(snap.gameId, ME, endTurn);
    const afterOne = await svc.stepBot(snap.gameId, ME);
    expect(afterOne.seq).toBe(snap.seq + 1);

    snap = await botsUntilMe(afterOne);
    expect(snap.view.actor).toBe(0);
    expect(snap.view.turnNumber).toBe(3);
  });

  it("rebuilds the same state from the log alone", async () => {
    let snap = await newGame(3);
    for (let i = 0; i < 3; i++) snap = await botsUntilMe(await svc.act(snap.gameId, ME, endTurn));

    clearStateCache();
    const replayed = await svc.getSnapshot(snap.gameId, ME);
    expect(replayed).toEqual(snap);
  });

  it("refuses a second action for the same log slot", async () => {
    const { gameId } = await newGame();
    await svc.act(gameId, ME, { type: "endPhase", player: 0 });
    await expect(
      db.gameAction.create({
        data: { gameId, seq: 0, seat: 0, payload: { type: "endPhase", player: 0 } },
      }),
    ).rejects.toSatisfy(
      (e) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002",
    );
  });

  it("keeps the log consistent when requests race", async () => {
    let snap = await newGame(3);
    snap = await svc.act(snap.gameId, ME, endTurn);

    // Several tabs all asking for the next bot move at once.
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => svc.stepBot(snap.gameId, ME)),
    );
    for (const r of results) {
      if (r.status === "rejected") expect(r.reason).toBeInstanceOf(ConflictError);
    }

    const rows = await db.gameAction.findMany({
      where: { gameId: snap.gameId },
      orderBy: { seq: "asc" },
    });
    expect(rows.map((r) => r.seq)).toEqual(rows.map((_, i) => i));
    clearStateCache();
    const replayed = await svc.getSnapshot(snap.gameId, ME);
    expect(replayed.seq).toBe(rows.length);
  });

  it("plays a whole game to the end and marks it finished", async () => {
    let snap = await newGame(2);
    while (snap.view.phase !== "gameOver") {
      snap = await botsUntilMe(snap);
      if (snap.view.phase === "gameOver") break;
      // I never buy anything, so the bots end the game.
      snap = await svc.act(snap.gameId, ME, endTurn);
    }
    expect(snap.view.result).not.toBeNull();
    const game = await db.game.findUniqueOrThrow({ where: { id: snap.gameId } });
    expect(game.status).toBe("finished");

    const [summary] = await svc.listGames(ME);
    expect(summary).toMatchObject({
      id: snap.gameId,
      status: "finished",
      opponents: ["Ada", "Bram"],
    });
    await expect(svc.act(snap.gameId, ME, endTurn)).rejects.toThrow(EngineError);
  }, 30_000);

  it("validates game setup", async () => {
    for (const botCount of [0, 4, Number.NaN]) {
      await expect(svc.createGame({ guestId: ME, name: "Me", botCount })).rejects.toThrow(
        EngineError,
      );
    }
    const id = await svc.createGame({ guestId: ME, name: "   ", botCount: 1 });
    expect((await svc.getSnapshot(id, ME)).seats[0].name).toBe("Player");
  });
});
