import { describe, expect, it } from "vitest";
import { BLIGHT, CROWN, FARM, INGOT, PENNY, TOWN } from "./cards";
import { EngineError } from "./errors";
import { applyAction } from "./reducer";
import { newGame, run, withCards } from "./test-helpers";
import type { CardId, GameState } from "./types";

function play(s: GameState, cardId: CardId, player = 0) {
  return applyAction(s, { type: "playAction", player, cardId });
}

const deck = [CROWN, INGOT, TOWN, PENNY, PENNY];

describe("kingdom cards", () => {
  it("Campfire: +2 Actions, +1 Coin", () => {
    const s = play(withCards(newGame(), 0, { hand: ["campfire"] }), "campfire");
    expect(s).toMatchObject({ actions: 2, coins: 1 });
  });

  it("Caravan: +2 Cards, +1 Action, +1 Buy", () => {
    const s = play(withCards(newGame(), 0, { hand: ["caravan"], deck }), "caravan");
    expect(s.players[0].hand).toEqual([CROWN, INGOT]);
    expect(s).toMatchObject({ actions: 1, buys: 2 });
  });

  it("Tax Collector: +1 Buy, +3 Coins", () => {
    const s = play(withCards(newGame(), 0, { hand: ["tax-collector"] }), "tax-collector");
    expect(s).toMatchObject({ buys: 2, coins: 3 });
  });

  it("Scribe: draws 3, then must discard exactly 1", () => {
    let s = play(withCards(newGame(), 0, { hand: ["scribe", FARM], deck }), "scribe");
    expect(s.players[0].hand).toEqual([FARM, CROWN, INGOT, TOWN]);
    expect(s.pendingDecision).toMatchObject({ kind: "selectFromHand", min: 1, max: 1 });

    const discardNone = { kind: "selectFromHand" as const, cards: [] };
    expect(() =>
      applyAction(s, { type: "resolveDecision", player: 0, response: discardNone }),
    ).toThrow(EngineError);

    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromHand", cards: [FARM] },
    });
    expect(s.pendingDecision).toBeNull();
    expect(s.players[0].hand).toEqual([CROWN, INGOT, TOWN]);
    expect(s.players[0].discard).toEqual([FARM]);
  });

  it("Shrine: +1 Coin, trash 0-2 cards", () => {
    let s = play(withCards(newGame(), 0, { hand: ["shrine", FARM, FARM, PENNY] }), "shrine");
    expect(s.coins).toBe(1);
    expect(s.pendingDecision).toMatchObject({ min: 0, max: 2, purpose: "trash" });
    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromHand", cards: [FARM, FARM] },
    });
    expect(s.trash).toEqual([FARM, FARM]);
    expect(s.players[0].hand).toEqual([PENNY]);
  });

  it("Shrine with an empty hand asks nothing", () => {
    const s = play(withCards(newGame(), 0, { hand: ["shrine"] }), "shrine");
    expect(s.pendingDecision).toBeNull();
  });

  it("Builder: +1 Action, gain a card costing up to 4", () => {
    let s = play(withCards(newGame(), 0, { hand: ["builder"] }), "builder");
    expect(s.actions).toBe(1);
    const d = s.pendingDecision;
    expect(d?.kind).toBe("selectFromSupply");
    if (d?.kind !== "selectFromSupply") return;
    expect(d.options).toContain("scribe");
    expect(d.options).not.toContain(INGOT);

    expect(() =>
      applyAction(s, {
        type: "resolveDecision",
        player: 0,
        response: { kind: "selectFromSupply", cardId: INGOT },
      }),
    ).toThrow(EngineError);

    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromSupply", cardId: "scribe" },
    });
    expect(s.players[0].discard).toEqual(["scribe"]);
    expect(s.supply.scribe).toBe(9);
  });

  it("Alchemist: trash a card, gain one costing up to 3 more", () => {
    let s = play(withCards(newGame(), 0, { hand: ["alchemist", CROWN] }), "alchemist");
    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromHand", cards: [CROWN] },
    });
    expect(s.trash).toEqual([CROWN]);
    const d = s.pendingDecision;
    expect(d).toMatchObject({ kind: "selectFromSupply", maxCost: 6 });
    s = run(s, {
      type: "resolveDecision",
      player: 0,
      response: { kind: "selectFromSupply", cardId: INGOT },
    });
    expect(s.players[0].discard).toEqual([INGOT]);
  });

  it("Raider: each other player discards a card, in turn order", () => {
    let s = newGame(3);
    s = withCards(s, 0, { hand: ["raider"], deck });
    s = play(s, "raider");
    expect(s).toMatchObject({ coins: 1 });
    expect(s.players[0].hand).toEqual([CROWN]);
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

  it("Warlock: each other player gains a Blight", () => {
    let s = withCards(newGame(3), 0, { hand: ["warlock"], deck });
    s = play(s, "warlock");
    expect(s.actions).toBe(1);
    expect(s.players[1].discard).toEqual([BLIGHT]);
    expect(s.players[2].discard).toEqual([BLIGHT]);
    expect(s.supply[BLIGHT]).toBe(18);
  });

  it("Palisade: +1 Card, +1 Action", () => {
    const s = play(withCards(newGame(), 0, { hand: ["palisade"], deck }), "palisade");
    expect(s.players[0].hand).toEqual([CROWN]);
    expect(s.actions).toBe(1);
  });

  it("Palisade: revealing it blocks an attack; declining does not", () => {
    let s = withCards(newGame(3), 0, { hand: ["warlock"], deck });
    s = withCards(s, 1, { hand: ["palisade", PENNY] });
    s = withCards(s, 2, { hand: ["palisade", PENNY] });
    s = play(s, "warlock");
    expect(s.pendingDecision).toMatchObject({ kind: "revealReaction", player: 1 });

    s = run(
      s,
      { type: "resolveDecision", player: 1, response: { kind: "revealReaction", reveal: true } },
      { type: "resolveDecision", player: 2, response: { kind: "revealReaction", reveal: false } },
    );
    expect(s.players[1].discard).toEqual([]);
    expect(s.players[2].discard).toEqual([BLIGHT]);
    // Revealing keeps the card in hand.
    expect(s.players[1].hand).toContain("palisade");
  });

  it("attacks do nothing in a solo game", () => {
    const after = play(withCards(newGame(1), 0, { hand: ["warlock"], deck }), "warlock");
    expect(after.pendingDecision).toBeNull();
    expect(after.supply[BLIGHT]).toBe(10);
  });

  it("an empty gain pile is skipped, not an error", () => {
    let s = withCards(newGame(), 0, { hand: ["warlock"], deck });
    s = { ...s, supply: { ...s.supply, [BLIGHT]: 0 } };
    const after = play(s, "warlock");
    expect(after.players[1].discard).toEqual([]);
  });
});
