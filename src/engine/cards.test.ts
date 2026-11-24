import { describe, expect, it } from "vitest";
import { MALWARE, ALLOY, HABITAT, FUSION_CELL, ORE, BIODOME } from "./cards";
import { EngineError } from "./errors";
import { applyAction } from "./reducer";
import { newGame, run, withCards } from "./test-helpers";
import type { CardId, GameState } from "./types";

function play(s: GameState, cardId: CardId, player = 0) {
  return applyAction(s, { type: "playAction", player, cardId });
}

const deck = [ALLOY, FUSION_CELL, BIODOME, ORE, ORE];

describe("kingdom cards", () => {
  it("Overclock: +2 Actions, +1 Coin", () => {
    const s = play(withCards(newGame(), 0, { hand: ["overclock"] }), "overclock");
    expect(s).toMatchObject({ actions: 2, coins: 1 });
  });

  it("Supply Drop: +2 Cards, +1 Action, +1 Buy", () => {
    const s = play(withCards(newGame(), 0, { hand: ["supply-drop"], deck }), "supply-drop");
    expect(s.players[0].hand).toEqual([ALLOY, FUSION_CELL]);
    expect(s).toMatchObject({ actions: 1, buys: 2 });
  });

  it("Mining Rig: +1 Buy, +3 Coins", () => {
    const s = play(withCards(newGame(), 0, { hand: ["mining-rig"] }), "mining-rig");
    expect(s).toMatchObject({ buys: 2, coins: 3 });
  });

  it("Survey Drone: draws 3, then must discard exactly 1", () => {
    let s = play(
      withCards(newGame(), 0, { hand: ["survey-drone", HABITAT], deck }),
      "survey-drone",
    );
    expect(s.players[0].hand).toEqual([HABITAT, ALLOY, FUSION_CELL, BIODOME]);
    expect(s.pendingDecision).toMatchObject({ kind: "selectFromHand", min: 1, max: 1 });

    const discardNone = { kind: "selectFromHand" as const, cards: [] };
    expect(() =>
      applyAction(s, { type: "resolveDecision", player: 0, response: discardNone }),
    ).toThrow(EngineError);

    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromHand", cards: [HABITAT] },
    });
    expect(s.pendingDecision).toBeNull();
    expect(s.players[0].hand).toEqual([ALLOY, FUSION_CELL, BIODOME]);
    expect(s.players[0].discard).toEqual([HABITAT]);
  });

  it("Reclaimer: +1 Coin, trash 0-2 cards", () => {
    let s = play(
      withCards(newGame(), 0, { hand: ["reclaimer", HABITAT, HABITAT, ORE] }),
      "reclaimer",
    );
    expect(s.coins).toBe(1);
    expect(s.pendingDecision).toMatchObject({ min: 0, max: 2, purpose: "trash" });
    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromHand", cards: [HABITAT, HABITAT] },
    });
    expect(s.trash).toEqual([HABITAT, HABITAT]);
    expect(s.players[0].hand).toEqual([ORE]);
  });

  it("Reclaimer with an empty hand asks nothing", () => {
    const s = play(withCards(newGame(), 0, { hand: ["reclaimer"] }), "reclaimer");
    expect(s.pendingDecision).toBeNull();
  });

  it("Fabricator: +1 Action, gain a card costing up to 4", () => {
    let s = play(withCards(newGame(), 0, { hand: ["fabricator"] }), "fabricator");
    expect(s.actions).toBe(1);
    const d = s.pendingDecision;
    expect(d?.kind).toBe("selectFromSupply");
    if (d?.kind !== "selectFromSupply") return;
    expect(d.options).toContain("survey-drone");
    expect(d.options).not.toContain(FUSION_CELL);

    expect(() =>
      applyAction(s, {
        type: "resolveDecision",
        player: 0,
        response: { kind: "selectFromSupply", cardId: FUSION_CELL },
      }),
    ).toThrow(EngineError);

    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromSupply", cardId: "survey-drone" },
    });
    expect(s.players[0].discard).toEqual(["survey-drone"]);
    expect(s.supply["survey-drone"]).toBe(9);
  });

  it("Matter Converter: trash a card, gain one costing up to 3 more", () => {
    let s = play(
      withCards(newGame(), 0, { hand: ["matter-converter", ALLOY] }),
      "matter-converter",
    );
    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromHand", cards: [ALLOY] },
    });
    expect(s.trash).toEqual([ALLOY]);
    const d = s.pendingDecision;
    expect(d).toMatchObject({ kind: "selectFromSupply", maxCost: 6 });
    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromSupply", cardId: FUSION_CELL },
    });
    expect(s.players[0].discard).toEqual([FUSION_CELL]);
  });

  it("EMP Burst: each other player discards a card, in turn order", () => {
    let s = newGame(3);
    s = withCards(s, 0, { hand: ["emp-burst"], deck });
    s = play(s, "emp-burst");
    expect(s).toMatchObject({ coins: 1 });
    expect(s.players[0].hand).toEqual([ALLOY]);
    expect(s.pendingDecision).toMatchObject({ player: 1, purpose: "discard" });

    // The current player can't act while a victim is deciding.
    expect(() => applyAction(s, { type: "endPhase", player: 0 })).toThrow(/Waiting/);
    // Only the victim can answer.
    const card1 = s.players[1].hand[0];
    expect(() =>
      applyAction(s, {
        type: "resolveDecision",
        player: 0,
        response: { kind: "selectFromHand", cards: [card1] },
      }),
    ).toThrow(/another player/);

    s = run(s, {
      type: "resolveDecision",
      player: 1,
      response: { kind: "selectFromHand", cards: [card1] },
    });
    expect(s.players[1].hand).toHaveLength(4);
    expect(s.pendingDecision).toMatchObject({ player: 2 });
    const card2 = s.players[2].hand[0];
    s = run(s, {
      type: "resolveDecision",
      player: 2,
      response: { kind: "selectFromHand", cards: [card2] },
    });
    expect(s.pendingDecision).toBeNull();
    expect(s.players[2].hand).toHaveLength(4);
  });

  it("Infiltrator: each other player gains a Malware", () => {
    let s = withCards(newGame(3), 0, { hand: ["infiltrator"], deck });
    s = play(s, "infiltrator");
    expect(s.actions).toBe(1);
    expect(s.players[1].discard).toEqual([MALWARE]);
    expect(s.players[2].discard).toEqual([MALWARE]);
    expect(s.supply[MALWARE]).toBe(18);
  });

  it("Perimeter Shield: +1 Card, +1 Action", () => {
    const s = play(
      withCards(newGame(), 0, { hand: ["perimeter-shield"], deck }),
      "perimeter-shield",
    );
    expect(s.players[0].hand).toEqual([ALLOY]);
    expect(s.actions).toBe(1);
  });

  it("Perimeter Shield: revealing it blocks an attack; declining does not", () => {
    let s = withCards(newGame(3), 0, { hand: ["infiltrator"], deck });
    s = withCards(s, 1, { hand: ["perimeter-shield", ORE] });
    s = withCards(s, 2, { hand: ["perimeter-shield", ORE] });
    s = play(s, "infiltrator");
    expect(s.pendingDecision).toMatchObject({ kind: "revealReaction", player: 1 });

    s = run(
      s,
      { type: "resolveDecision", player: 1, response: { kind: "revealReaction", reveal: true } },
      { type: "resolveDecision", player: 2, response: { kind: "revealReaction", reveal: false } },
    );
    expect(s.players[1].discard).toEqual([]);
    expect(s.players[2].discard).toEqual([MALWARE]);
    // Revealing keeps the card in hand.
    expect(s.players[1].hand).toContain("perimeter-shield");
  });

  it("attacks do nothing in a solo game", () => {
    const after = play(withCards(newGame(1), 0, { hand: ["infiltrator"], deck }), "infiltrator");
    expect(after.pendingDecision).toBeNull();
    expect(after.supply[MALWARE]).toBe(10);
  });

  it("an empty gain pile is skipped, not an error", () => {
    let s = withCards(newGame(), 0, { hand: ["infiltrator"], deck });
    s = { ...s, supply: { ...s.supply, [MALWARE]: 0 } };
    const after = play(s, "infiltrator");
    expect(after.players[1].discard).toEqual([]);
  });
});
