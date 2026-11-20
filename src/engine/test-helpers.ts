import { applyAction } from "./reducer";
import { allCards } from "./scoring";
import { createGame } from "./setup";
import type { Action, CardId, GameState } from "./types";

export function newGame(numPlayers = 2, seed = "test-seed"): GameState {
  return createGame({
    seed,
    players: Array.from({ length: numPlayers }, (_, i) => ({
      id: `p${i}`,
      name: ["Alice", "Bob", "Cara", "Dev"][i],
    })),
  });
}

/** Overwrite a player's hand/deck for a focused test. */
export function withCards(
  s: GameState,
  player: number,
  cards: { hand?: CardId[]; deck?: CardId[]; discard?: CardId[] },
): GameState {
  const next = structuredClone(s);
  const p = next.players[player];
  if (cards.hand) p.hand = [...cards.hand];
  if (cards.deck) p.deck = [...cards.deck];
  if (cards.discard) p.discard = [...cards.discard];
  return next;
}

export function run(s: GameState, ...actions: Action[]): GameState {
  return actions.reduce(applyAction, s);
}

/** Every card in the game: supply + all players + trash. Should never change. */
export function totalCards(s: GameState): number {
  const supply = Object.values(s.supply).reduce((a, b) => a + b, 0);
  const owned = s.players.reduce((n, p) => n + allCards(p).length, 0);
  return supply + owned + s.trash.length;
}
