import { describe, expect, it } from "vitest";
import { ALLOY, HABITAT, ORE, getPlayerView } from "@/engine";
import { newGame, run, withCards } from "@/engine/test-helpers";
import { diffTurn } from "./turnFx";

const view = (s: Parameters<typeof getPlayerView>[0], seat = 0) => getPlayerView(s, seat);

describe("diffTurn", () => {
  it("reports cards drawn by a played action, and which ones they are", () => {
    const s = withCards(newGame(), 0, {
      hand: ["survey-drone", ORE, HABITAT],
      deck: [ALLOY, ORE, HABITAT, ORE],
    });
    const after = run(s, { type: "playAction", player: 0, cardId: "survey-drone" });
    const fx = diffTurn(view(s), view(after), 1);
    expect(fx).toMatchObject({ seat: 0, cards: 3, actions: 0 });
    // Hand was [Ore, Habitat] after playing; Alloy, Ore, Habitat were drawn onto the end.
    expect(view(after).hand).toEqual([ORE, HABITAT, ALLOY, ORE, HABITAT]);
    expect(fx.freshHand).toEqual([2, 3, 4]);
  });

  it("shows a card's full +Actions, though playing it spent one", () => {
    const s = withCards(newGame(), 0, { hand: ["overclock", ORE] });
    const after = run(s, { type: "playAction", player: 0, cardId: "overclock" });
    expect(diffTurn(view(s), view(after), 1)).toMatchObject({ actions: 2, credits: 1, cards: 0 });
  });

  it("reports buys and credits", () => {
    const s = withCards(newGame(), 0, { hand: ["mining-rig", ORE] });
    const after = run(s, { type: "playAction", player: 0, cardId: "mining-rig" });
    expect(diffTurn(view(s), view(after), 1)).toMatchObject({ buys: 1, credits: 3 });
  });

  it("ignores spending, discarding, and new turns", () => {
    const s = withCards(newGame(), 0, { hand: [ORE, ORE, ORE, ORE, ORE] });
    const played = run(s, { type: "playAllTreasures", player: 0 });
    expect(diffTurn(view(s), view(played), 1)).toMatchObject({ credits: 5, cards: 0 });

    const bought = run(played, { type: "buy", player: 0, cardId: ALLOY });
    expect(diffTurn(view(played), view(bought), 2).seat).toBeNull();

    const nextTurn = run(bought, { type: "endPhase", player: 0 });
    expect(diffTurn(view(bought), view(nextTurn), 3).seat).toBeNull();
  });

  it("reports an opponent's draws to everyone, without revealing their cards", () => {
    let s = newGame(2);
    s = run(s, { type: "endPhase", player: 0 }, { type: "endPhase", player: 0 });
    s = withCards(s, 1, { hand: ["survey-drone", ORE], deck: [ORE, ORE, ORE] });
    const after = run(s, { type: "playAction", player: 1, cardId: "survey-drone" });
    const fx = diffTurn(view(s, 0), view(after, 0), 1);
    expect(fx).toMatchObject({ seat: 1, cards: 3 });
    expect(fx.freshHand).toEqual([]);
  });
});
