import type { GameState } from "./types";

/** The seat that must act next: whoever owns the pending decision, else the current player. */
export function getActor(s: GameState): number | null {
  if (s.phase === "gameOver") return null;
  return s.pendingDecision ? s.pendingDecision.player : s.currentPlayer;
}
