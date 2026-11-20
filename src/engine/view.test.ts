import { describe, expect, it } from "vitest";
import { newGame } from "./test-helpers";
import { getPlayerView } from "./view";

describe("getPlayerView", () => {
  it("shows your hand but only counts for everyone", () => {
    const s = newGame(3);
    const view = getPlayerView(s, 1);
    expect(view.you).toBe(1);
    expect(view.hand).toEqual(s.players[1].hand);
    expect(view.players[0]).toMatchObject({ handCount: 5, deckCount: 5, discardCount: 0 });
    expect(view.players[0]).not.toHaveProperty("hand");
    expect(view.players[0]).not.toHaveProperty("deck");
  });

  it("never leaks the seed, RNG state, or other hands", () => {
    const s = newGame(2, "secret-seed");
    const json = JSON.stringify(getPlayerView(s, 0));
    expect(json).not.toContain("secret-seed");
    expect(Object.keys(getPlayerView(s, 0))).not.toContain("rng");
    expect(Object.keys(getPlayerView(s, 0))).not.toContain("queue");
  });

  it("is a copy, not a reference into state", () => {
    const s = newGame();
    const view = getPlayerView(s, 0);
    view.hand.push("ingot");
    expect(s.players[0].hand).toHaveLength(5);
  });
});
