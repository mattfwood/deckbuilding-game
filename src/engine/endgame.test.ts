import { describe, expect, it } from "vitest";
import { ARCOLOGY, ALLOY, HABITAT, FUSION_CELL, ORE, BIODOME, getCard } from "./cards";
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
  it("ends when the Arcology pile is empty, after the turn", () => {
    let s = withCards(newGame(), 0, {
      hand: [FUSION_CELL, FUSION_CELL, ALLOY, ORE, ORE],
      deck: [HABITAT, HABITAT, HABITAT, ORE, ORE],
    });
    s = { ...s, supply: { ...s.supply, [ARCOLOGY]: 1 } };
    s = run(
      s,
      { type: "playAllTreasures", player: 0 },
      { type: "buy", player: 0, cardId: ARCOLOGY },
    );
    expect(s.phase).toBe("buy");
    s = run(s, { type: "endPhase", player: 0 });
    expect(s.phase).toBe("gameOver");
    expect(s.result).toEqual({ scores: [9, 3], winners: [0] });
    expect(() => applyAction(s, { type: "endPhase", player: 1 })).toThrow(EngineError);
  });

  it("ends when any three piles are empty", () => {
    let s = newGame();
    s = { ...s, supply: { ...s.supply, "survey-drone": 0, reclaimer: 0 } };
    s = endTurn(s);
    expect(s.phase).toBe("action");
    s = { ...s, supply: { ...s.supply, "supply-drop": 0 } };
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

  it("counts VP from every zone, including Malware", () => {
    const s = newGame();
    s.players[0].inPlay = [BIODOME];
    s.players[0].discard = ["malware"];
    expect(victoryPoints(s.players[0])).toBe(3 + 3 - 1);
  });
});

describe("full simulated game", () => {
  /** A simple "money-only" policy for both players. */
  function botTurn(s: GameState): GameState {
    const p = s.currentPlayer;
    s = run(s, { type: "playAllTreasures", player: p });
    const target = [ARCOLOGY, FUSION_CELL, BIODOME, ALLOY].find(
      (id) => getCard(id).cost <= s.coins && s.supply[id] > 0 && !(id === BIODOME && s.coins >= 6),
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
