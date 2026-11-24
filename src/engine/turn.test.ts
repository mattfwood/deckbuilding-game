import { describe, expect, it } from "vitest";
import { ALLOY, HABITAT, FUSION_CELL, ORE } from "./cards";
import { EngineError } from "./errors";
import { applyAction } from "./reducer";
import { newGame, run, withCards } from "./test-helpers";

const fiveOre = [ORE, ORE, ORE, ORE, ORE];

describe("turn loop", () => {
  it("plays treasures, buys a card, and gains it to the discard pile", () => {
    let s = withCards(newGame(), 0, { hand: fiveOre });
    s = run(s, { type: "playAllTreasures", player: 0 });
    expect(s).toMatchObject({ phase: "buy", coins: 5 });

    s = run(s, { type: "buy", player: 0, cardId: ALLOY });
    expect(s.coins).toBe(2);
    expect(s.buys).toBe(0);
    expect(s.supply[ALLOY]).toBe(39);
    expect(s.players[0].discard).toContain(ALLOY);
  });

  it("rejects buys you can't afford, or without buys left", () => {
    const s = withCards(newGame(), 0, { hand: fiveOre });
    const played = run(s, { type: "playAllTreasures", player: 0 });
    expect(() => applyAction(played, { type: "buy", player: 0, cardId: FUSION_CELL })).toThrow(
      EngineError,
    );
    const bought = run(played, { type: "buy", player: 0, cardId: HABITAT });
    expect(() => applyAction(bought, { type: "buy", player: 0, cardId: ORE })).toThrow(/no buys/);
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
    let s = withCards(newGame(), 0, { deck: [ORE, ORE], discard: [ALLOY, ALLOY, ALLOY] });
    s = run(s, { type: "endPhase", player: 0 }, { type: "endPhase", player: 0 });
    const p0 = s.players[0];
    expect(p0.hand).toHaveLength(5);
    expect(p0.deck.length + p0.hand.length + p0.discard.length).toBe(10);
    expect(s.log.some((e) => e.message.includes("shuffles"))).toBe(true);
  });

  it("enforces turn order and phases", () => {
    const s = withCards(newGame(), 0, { hand: ["survey-drone", ORE, ORE, ORE, ORE] });
    expect(() => applyAction(s, { type: "endPhase", player: 1 })).toThrow(/not your turn/);
    expect(() => applyAction(s, { type: "playAction", player: 0, cardId: ORE })).toThrow(
      EngineError,
    );
    expect(() => applyAction(s, { type: "playAction", player: 0, cardId: "supply-drop" })).toThrow(
      /not in hand/,
    );
    const inBuy = run(s, { type: "playTreasure", player: 0, cardId: ORE });
    expect(() =>
      applyAction(inBuy, { type: "playAction", player: 0, cardId: "survey-drone" }),
    ).toThrow(/action phase/);
  });

  it("requires an action to play an action card", () => {
    const s = withCards(newGame(), 0, { hand: ["mining-rig", "mining-rig"] });
    const after = run(s, { type: "playAction", player: 0, cardId: "mining-rig" });
    expect(after.actions).toBe(0);
    expect(() =>
      applyAction(after, { type: "playAction", player: 0, cardId: "mining-rig" }),
    ).toThrow(/no actions/);
  });
});
