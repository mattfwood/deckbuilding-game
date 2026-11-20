import { CAPITAL, getCard } from "./cards";
import type { GameResult, GameState, PlayerState } from "./types";

export function allCards(p: PlayerState) {
  return [...p.deck, ...p.hand, ...p.discard, ...p.inPlay];
}

export function victoryPoints(p: PlayerState): number {
  return allCards(p).reduce((sum, id) => sum + (getCard(id).vp ?? 0), 0);
}

export function emptyPileCount(s: GameState): number {
  return Object.values(s.supply).filter((count) => count === 0).length;
}

/** The game ends when the Capital pile is empty or any three supply piles are empty. */
export function isGameOver(s: GameState): boolean {
  return s.supply[CAPITAL] === 0 || emptyPileCount(s) >= 3;
}

/** Highest VP wins; ties go to whoever took fewer turns; remaining ties share the win. */
export function computeResult(s: GameState): GameResult {
  const scores = s.players.map(victoryPoints);
  const best = Math.max(...scores);
  const tied = s.players.map((_, i) => i).filter((i) => scores[i] === best);
  const fewestTurns = Math.min(...tied.map((i) => s.players[i].turnsTaken));
  const winners = tied.filter((i) => s.players[i].turnsTaken === fewestTurns);
  return { scores, winners };
}
