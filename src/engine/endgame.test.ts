import { describe, expect, it } from "vitest";
import { CAPITAL, CROWN, FARM, INGOT, PENNY, TOWN, getCard } from "./cards";
import { EngineError } from "./errors";
import { applyAction } from "./reducer";
import { computeResult, victoryPoints } from "./scoring";
import { newGame, run, totalCards, withCards } from "./test-helpers";
import type { GameState } from "./types";

function endTurn(s: GameState): GameState {
  const p = s.currentPlayer;
  return run(s, { type: "endPhase", player: p }, { type: "endPhase", player: p });
}

describe("game end", () => {
  it("ends when the Capital pile is empty, after the turn", () => {
    let s = withCards(newGame(), 0, {
      hand: [INGOT, INGOT, CROWN, PENNY, PENNY],
      deck: [FARM, FARM, FARM, PENNY, PENNY],
    });
    s = { ...s, supply: { ...s.supply, [CAPITAL]: 1 } };
    s = run(
      s,
      { type: "playAllTreasures", player: 0 },
      { type: "buy", player: 0, cardId: CAPITAL },
    );
    expect(s.phase).toBe("buy");
    s = run(s, { type: "endPhase", player: 0 });
    expect(s.phase).toBe("gameOver");
    expect(s.result).toEqual({ scores: [9, 3], winners: [0] });
    expect(() => applyAction(s, { type: "endPhase", player: 1 })).toThrow(EngineError);
  });

  it("ends when any three piles are empty", () => {
    let s = newGame();
    s = { ...s, supply: { ...s.supply, scribe: 0, shrine: 0 } };
    s = endTurn(s);
    expect(s.phase).toBe("action");
    s = { ...s, supply: { ...s.supply, caravan: 0 } };
    s = endTurn(s);
    expect(s.phase).toBe("gameOver");
  });

  it("breaks ties by fewer turns, then shares the win", () => {
    const s = newGame();
    expect(computeResult(s).winners).toEqual([0, 1]);
    s.players[0].turnsTaken = 3;
    s.players[1].turnsTaken = 2;
    expect(computeResult(s).winners).toEqual([1]);
  });

  it("counts VP from every zone, including Blights", () => {
    const s = newGame();
    s.players[0].inPlay = [TOWN];
    s.players[0].discard = ["blight"];
    expect(victoryPoints(s.players[0])).toBe(3 + 3 - 1);
  });
});

describe("full simulated game", () => {
  /** A simple "money-only" policy for both players. */
  function botTurn(s: GameState): GameState {
    const p = s.currentPlayer;
    s = run(s, { type: "playAllTreasures", player: p });
    const target = [CAPITAL, INGOT, TOWN, CROWN].find(
      (id) => getCard(id).cost <= s.coins && s.supply[id] > 0 && !(id === TOWN && s.coins >= 6),
    );
    if (target) s = run(s, { type: "buy", player: p, cardId: target });
    if (s.phase !== "buy") s = run(s, { type: "endPhase", player: p });
    return run(s, { type: "endPhase", player: p });
  }

  it.each(["seed-a", "seed-b", "seed-c"])("finishes and conserves cards (%s)", (seed) => {
    let s = newGame(2, seed);
    const total = totalCards(s);
    let turns = 0;
    while (s.phase !== "gameOver" && turns < 200) {
      s = botTurn(s);
      turns++;
      expect(totalCards(s)).toBe(total);
      for (const p of s.players) expect(p.hand).toHaveLength(5);
    }
    expect(s.phase).toBe("gameOver");
    expect(s.result?.winners.length).toBeGreaterThan(0);
  });
});
