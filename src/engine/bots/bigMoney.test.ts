import { describe, expect, it } from "vitest";
import { getActor } from "../actor";
import { BLIGHT, FARM, PENNY } from "../cards";
import { applyAction } from "../reducer";
import { newGame, totalCards, withCards } from "../test-helpers";
import type { GameState } from "../types";
import { chooseBotAction } from "./bigMoney";

function playOut(s: GameState, maxSteps = 20_000): GameState {
  const total = totalCards(s);
  for (let i = 0; i < maxSteps && s.phase !== "gameOver"; i++) {
    const actor = getActor(s)!;
    s = applyAction(s, chooseBotAction(s, actor));
    expect(totalCards(s)).toBe(total);
  }
  return s;
}

describe("bigMoney bot", () => {
  it.each([
    [2, "bot-a"],
    [2, "bot-b"],
    [3, "bot-c"],
    [4, "bot-d"],
    [4, "bot-e"],
  ])("bot-only %i-player game finishes with every card accounted for (%s)", (n, seed) => {
    const end = playOut(newGame(n, seed));
    expect(end.phase).toBe("gameOver");
    expect(end.result!.winners.length).toBeGreaterThan(0);
  });

  it("buys kingdom cards, so attacks and decisions get exercised", () => {
    const end = playOut(newGame(3, "bot-f"));
    const messages = end.log.map((e) => e.message).join("\n");
    expect(messages).toMatch(/plays (Moneylender|Vassal|Harbinger|Workshop)/);
  });

  it("trashes junk with Chapel and keeps good cards", () => {
    let s = withCards(newGame(), 0, { hand: ["chapel", BLIGHT, FARM, "ingot", "crown"] });
    s = applyAction(s, chooseBotAction(s, 0));
    expect(s.pendingDecision).toMatchObject({ purpose: "trash" });
    s = applyAction(s, chooseBotAction(s, 0));
    expect(s.trash).toEqual([BLIGHT, FARM]);
  });

  it("discards its worst card", () => {
    let s = withCards(newGame(), 0, { hand: ["harbinger", "ingot"], deck: [PENNY, FARM, "crown"] });
    s = applyAction(s, chooseBotAction(s, 0));
    s = applyAction(s, chooseBotAction(s, 0));
    expect(s.players[0].discard).toEqual([FARM]);
  });

  it("refuses to act out of turn", () => {
    expect(() => chooseBotAction(newGame(), 1)).toThrow();
  });
});
