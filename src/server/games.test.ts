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
  type PlaySnapshot,
} from "./games";

/** Narrow a snapshot to a started game, failing the test if it's still a lobby. */
function play(snap: GameSnapshot): PlaySnapshot {
  if (snap.status === "lobby") throw new Error("Expected a started game, got a lobby.");
  return snap;
}

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("game service (Postgres)", () => {
  const db = createPrismaClient(url!);
  const raw = createGameService(db);
  // Same service, with results narrowed to started games for these tests.
  const svc = {
    ...raw,
    act: async (...a: Parameters<typeof raw.act>) => play(await raw.act(...a)),
    stepBot: async (...a: Parameters<typeof raw.stepBot>) => play(await raw.stepBot(...a)),
    getSnapshot: async (...a: Parameters<typeof raw.getSnapshot>) =>
      play(await raw.getSnapshot(...a)),
  };
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
  async function botsUntilMe(snap: PlaySnapshot): Promise<PlaySnapshot> {
    while (snap.view.actor !== null && snap.seats[snap.view.actor].kind === "bot") {
      snap = await svc.stepBot(snap.gameId, ME);
    }
    return snap;
  }

  /** End my turn, or give the simplest answer to a decision I owe. */
  function myMinimalMove(snap: PlaySnapshot): Action | Action[] {
    const d = snap.view.pendingDecision;
    if (!d) return endTurn;
    const resolve = (response: Extract<Action, { type: "resolveDecision" }>["response"]) => ({
      type: "resolveDecision" as const,
      player: 0,
      response,
    });
    switch (d.kind) {
      case "selectFromHand":
        return resolve({ kind: "selectFromHand", cards: snap.view.hand.slice(0, d.min) });
      case "selectFromSupply":
        return resolve({ kind: "selectFromSupply", cardId: d.options[0] });
      case "revealReaction":
        return resolve({ kind: "revealReaction", reveal: false });
    }
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
      { type: "buy", player: 0, cardId: "arcology" }, // can't afford
      { type: "launchMissiles", player: 0 },
      [
        { type: "endPhase", player: 0 },
        { type: "buy", player: 0, cardId: "arcology" },
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
      // I never buy anything, so the bots end the game. Their attacks may
      // still ask me to choose: answer with the simplest legal response.
      snap = await svc.act(snap.gameId, ME, myMinimalMove(snap));
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
  describe("lobbies", () => {
    const FRIEND = "guest-friend";

    async function lobby() {
      const id = await raw.createLobby({ guestId: ME, name: "Me" });
      const snap = await raw.getSnapshot(id, ME);
      if (snap.status !== "lobby") throw new Error("expected a lobby");
      return snap;
    }

    async function seatsOf(gameId: string) {
      return (await raw.getSnapshot(gameId, ME)).seats.map((s) => `${s.name}:${s.kind}`);
    }

    it("lets a friend join by invite code, then the host starts", async () => {
      const host = await lobby();
      expect(host).toMatchObject({ you: 0, isHost: true, seats: [{ name: "Me", kind: "human" }] });

      const invite = await raw.getInvite(host.inviteCode, FRIEND);
      expect(invite).toMatchObject({ gameId: host.gameId, hostName: "Me", joined: false });

      expect(await raw.joinLobby(host.inviteCode, FRIEND, "Pat")).toBe(host.gameId);
      expect(await raw.joinLobby(host.inviteCode, FRIEND, "Pat")).toBe(host.gameId); // idempotent
      expect(await seatsOf(host.gameId)).toEqual(["Me:human", "Pat:human"]);

      const friend = await raw.getSnapshot(host.gameId, FRIEND);
      expect(friend).toMatchObject({ status: "lobby", you: 1, isHost: false });

      await expect(raw.startGame(host.gameId, FRIEND)).rejects.toThrow("Only the host");
      const started = play(await raw.startGame(host.gameId, ME));
      expect(started.view.players.map((p) => p.name)).toEqual(["Me", "Pat"]);

      // Each player sees their own seat and hand, and moves only on their turn.
      const pat = await svc.getSnapshot(host.gameId, FRIEND);
      expect(pat.view.you).toBe(1);
      await expect(svc.act(host.gameId, FRIEND, { type: "endPhase", player: 1 })).rejects.toThrow(
        EngineError,
      );
      await svc.act(host.gameId, ME, endTurn);
      const patTurn = await svc.act(host.gameId, FRIEND, { type: "endPhase", player: 1 });
      expect(patTurn.view.phase).toBe("buy");

      await expect(raw.joinLobby(host.inviteCode, "latecomer", "Late")).rejects.toThrow(
        "already started",
      );
    });

    it("rejects bad invite codes and keeps lobbies private to their seats", async () => {
      const host = await lobby();
      await expect(raw.getInvite("nope", FRIEND)).rejects.toThrow(GameNotFoundError);
      await expect(raw.joinLobby("nope", FRIEND, "Pat")).rejects.toThrow(GameNotFoundError);
      await expect(raw.getSnapshot(host.gameId, FRIEND)).rejects.toThrow(GameNotFoundError);
      await expect(raw.poll(host.gameId, FRIEND, 0)).rejects.toThrow(GameNotFoundError);
    });

    it("renames clashing names and caps the table at four seats", async () => {
      const host = await lobby();
      await raw.joinLobby(host.inviteCode, "a", "Me");
      await raw.joinLobby(host.inviteCode, "b", "  Me  ");
      await raw.joinLobby(host.inviteCode, "c", "Cy");
      expect(await seatsOf(host.gameId)).toEqual([
        "Me:human",
        "Me 2:human",
        "Me 3:human",
        "Cy:human",
      ]);
      await expect(raw.joinLobby(host.inviteCode, "d", "Dee")).rejects.toThrow("full");
      await expect(raw.addBot(host.gameId, ME)).rejects.toThrow("full");
    });

    it("adds and removes seats, shifting later seats down", async () => {
      const host = await lobby();
      await raw.joinLobby(host.inviteCode, FRIEND, "Pat");
      await raw.addBot(host.gameId, ME);
      await raw.joinLobby(host.inviteCode, "guest-sam", "Sam");
      expect(await seatsOf(host.gameId)).toEqual(["Me:human", "Pat:human", "Ada:bot", "Sam:human"]);

      await expect(raw.addBot(host.gameId, FRIEND)).rejects.toThrow("Only the host");
      await expect(raw.removeSeat(host.gameId, FRIEND, 3)).rejects.toThrow("Only the host");
      await expect(raw.removeSeat(host.gameId, ME, 0)).rejects.toThrow("cancel");

      await raw.removeSeat(host.gameId, ME, 2); // host removes the bot
      await raw.removeSeat(host.gameId, FRIEND, 1); // Pat leaves
      expect(await seatsOf(host.gameId)).toEqual(["Me:human", "Sam:human"]);
      expect(await raw.getSnapshot(host.gameId, "guest-sam")).toMatchObject({ you: 1 });
      await expect(raw.getSnapshot(host.gameId, FRIEND)).rejects.toThrow(GameNotFoundError);
    });

    it("needs two players to start, and nothing plays before then", async () => {
      const host = await lobby();
      await expect(raw.startGame(host.gameId, ME)).rejects.toThrow("Invite a friend");
      await expect(raw.act(host.gameId, ME, endTurn)).rejects.toThrow("hasn't started");
      expect(await raw.stepBot(host.gameId, ME)).toMatchObject({ status: "lobby" });

      await raw.addBot(host.gameId, ME);
      const started = play(await raw.startGame(host.gameId, ME));
      expect(started.seats).toEqual([
        { name: "Me", kind: "human" },
        { name: "Ada", kind: "bot" },
      ]);
    });

    it("bumps the version on every change, so polls only return news", async () => {
      const host = await lobby();
      expect(await raw.poll(host.gameId, ME, host.version)).toBeNull();

      await raw.joinLobby(host.inviteCode, FRIEND, "Pat");
      const afterJoin = await raw.poll(host.gameId, ME, host.version);
      expect(afterJoin?.seats).toHaveLength(2);
      expect(await raw.poll(host.gameId, ME, afterJoin!.version)).toBeNull();

      const started = play(await raw.startGame(host.gameId, ME));
      const moved = await svc.act(host.gameId, ME, endTurn);
      expect(moved.version).toBe(started.version + 2);
      const friendSees = await raw.poll(host.gameId, FRIEND, started.version);
      expect(friendSees && play(friendSees).view.currentPlayer).toBe(1);
    });

    it("lets only the host cancel, and the lobby is gone for everyone", async () => {
      const host = await lobby();
      await raw.joinLobby(host.inviteCode, FRIEND, "Pat");
      await expect(raw.cancelLobby(host.gameId, FRIEND)).rejects.toThrow(GameNotFoundError);
      await raw.cancelLobby(host.gameId, ME);
      await expect(raw.poll(host.gameId, FRIEND, 0)).rejects.toThrow(GameNotFoundError);
      expect(await db.gamePlayer.count()).toBe(0);
    });

    it("never lets a join slip in after the game starts", async () => {
      for (let round = 0; round < 5; round++) {
        const host = await lobby();
        await raw.addBot(host.gameId, ME);
        const results = await Promise.allSettled([
          raw.joinLobby(host.inviteCode, `a${round}`, "A"),
          raw.startGame(host.gameId, ME),
          raw.joinLobby(host.inviteCode, `b${round}`, "B"),
        ]);
        expect(results[1].status).toBe("fulfilled");
        for (const r of [results[0], results[2]]) {
          if (r.status === "rejected") expect(String(r.reason)).toMatch(/already started/);
        }
        // Whoever made it in is in the engine's game too.
        clearStateCache();
        const snap = await svc.getSnapshot(host.gameId, ME);
        expect(snap.view.players).toHaveLength(snap.seats.length);
        const rows = await db.gamePlayer.count({ where: { gameId: host.gameId } });
        expect(rows).toBe(snap.seats.length);
      }
    });
  });
});
