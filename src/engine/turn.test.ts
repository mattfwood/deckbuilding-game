import { describe, expect, it } from "vitest";
import { CROWN, FARM, INGOT, PENNY } from "./cards";
import { EngineError } from "./errors";
import { applyAction } from "./reducer";
import { newGame, run, withCards } from "./test-helpers";

const fivePennies = [PENNY, PENNY, PENNY, PENNY, PENNY];

describe("turn loop", () => {
  it("plays treasures, buys a card, and gains it to the discard pile", () => {
    let s = withCards(newGame(), 0, { hand: fivePennies });
    s = run(s, { type: "playAllTreasures", player: 0 });
    expect(s).toMatchObject({ phase: "buy", coins: 5 });

    s = run(s, { type: "buy", player: 0, cardId: CROWN });
    expect(s.coins).toBe(2);
    expect(s.buys).toBe(0);
    expect(s.supply[CROWN]).toBe(39);
    expect(s.players[0].discard).toContain(CROWN);
  });

  it("rejects buys you can't afford, or without buys left", () => {
    const s = withCards(newGame(), 0, { hand: fivePennies });
    const played = run(s, { type: "playAllTreasures", player: 0 });
    expect(() => applyAction(played, { type: "buy", player: 0, cardId: INGOT })).toThrow(
      EngineError,
    );
    const bought = run(played, { type: "buy", player: 0, cardId: FARM });
    expect(() => applyAction(bought, { type: "buy", player: 0, cardId: PENNY })).toThrow(/no buys/);
  });

  it("does not mutate the input state", () => {
    const s = newGame();
    const before = structuredClone(s);
    run(s, { type: "playAllTreasures", player: 0 }, { type: "endPhase", player: 0 });
    expect(s).toEqual(before);
  });

  it("cleans up, draws 5, and passes the turn", () => {
    let s = newGame();
    s = run(s, { type: "endPhase", player: 0 }, { type: "endPhase", player: 0 });
    const p0 = s.players[0];
    expect(p0.hand).toHaveLength(5);
    expect(p0.inPlay).toHaveLength(0);
    expect(p0.discard).toHaveLength(5);
    expect(p0.turnsTaken).toBe(1);
    expect(s).toMatchObject({ currentPlayer: 1, turnNumber: 2, phase: "action", coins: 0 });
  });

  it("reshuffles the discard pile when the deck runs out", () => {
    let s = withCards(newGame(), 0, { deck: [PENNY, PENNY], discard: [CROWN, CROWN, CROWN] });
    s = run(s, { type: "endPhase", player: 0 }, { type: "endPhase", player: 0 });
    const p0 = s.players[0];
    expect(p0.hand).toHaveLength(5);
    expect(p0.deck.length + p0.hand.length + p0.discard.length).toBe(10);
    expect(s.log.some((e) => e.message.includes("shuffles"))).toBe(true);
  });

  it("enforces turn order and phases", () => {
    const s = withCards(newGame(), 0, { hand: ["scribe", PENNY, PENNY, PENNY, PENNY] });
    expect(() => applyAction(s, { type: "endPhase", player: 1 })).toThrow(/not your turn/);
    expect(() => applyAction(s, { type: "playAction", player: 0, cardId: PENNY })).toThrow(
      EngineError,
    );
    expect(() => applyAction(s, { type: "playAction", player: 0, cardId: "caravan" })).toThrow(
      /not in hand/,
    );
    const inBuy = run(s, { type: "playTreasure", player: 0, cardId: PENNY });
    expect(() => applyAction(inBuy, { type: "playAction", player: 0, cardId: "scribe" })).toThrow(
      /action phase/,
    );
  });

  it("requires an action to play an action card", () => {
    const s = withCards(newGame(), 0, { hand: ["tax-collector", "tax-collector"] });
    const after = run(s, { type: "playAction", player: 0, cardId: "tax-collector" });
    expect(after.actions).toBe(0);
    expect(() =>
      applyAction(after, { type: "playAction", player: 0, cardId: "tax-collector" }),
    ).toThrow(/no actions/);
  });
});
