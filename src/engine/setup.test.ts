import { describe, expect, it } from "vitest";
import { BLIGHT, CAPITAL, FARM, KINGDOM_CARD_IDS, PENNY } from "./cards";
import { EngineError } from "./errors";
import { createGame } from "./setup";
import { allCards } from "./scoring";
import { newGame } from "./test-helpers";

describe("createGame", () => {
  it("deals each player a shuffled 7 Penny / 3 Farm deck and a 5-card hand", () => {
    const s = newGame(2);
    for (const p of s.players) {
      expect(p.hand).toHaveLength(5);
      expect(p.deck).toHaveLength(5);
      const cards = allCards(p);
      expect(cards.filter((c) => c === PENNY)).toHaveLength(7);
      expect(cards.filter((c) => c === FARM)).toHaveLength(3);
    }
  });

  it("sizes piles by player count", () => {
    const two = newGame(2);
    expect(two.supply[CAPITAL]).toBe(8);
    expect(two.supply[BLIGHT]).toBe(10);
    expect(two.supply[PENNY]).toBe(46);

    const four = newGame(4);
    expect(four.supply[CAPITAL]).toBe(12);
    expect(four.supply[BLIGHT]).toBe(30);
    for (const id of KINGDOM_CARD_IDS) expect(four.supply[id]).toBe(10);
  });

  it("starts on player 0's action phase", () => {
    const s = newGame();
    expect(s).toMatchObject({ currentPlayer: 0, phase: "action", actions: 1, buys: 1, coins: 0 });
  });

  it("is deterministic for a given seed", () => {
    expect(newGame(3, "abc")).toEqual(newGame(3, "abc"));
    expect(newGame(3, "abc").players[0].hand).not.toEqual(newGame(3, "xyz").players[0].deck);
  });

  it("rejects bad player counts and kingdoms", () => {
    expect(() => createGame({ seed: "s", players: [] })).toThrow(EngineError);
    const five = Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, name: `${i}` }));
    expect(() => createGame({ seed: "s", players: five })).toThrow(EngineError);
    const one = [{ id: "a", name: "A" }];
    expect(() => createGame({ seed: "s", players: one, kingdom: ["nope"] })).toThrow(EngineError);
    expect(() => createGame({ seed: "s", players: one, kingdom: ["scribe", "scribe"] })).toThrow(
      EngineError,
    );
  });

  it("supports a custom kingdom", () => {
    const s = createGame({ seed: "s", players: [{ id: "a", name: "A" }], kingdom: ["scribe"] });
    expect(s.kingdom).toEqual(["scribe"]);
    expect(s.supply.scribe).toBe(10);
    expect(s.supply.warlock).toBeUndefined();
  });
});
