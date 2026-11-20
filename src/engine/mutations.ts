/**
 * Low-level helpers that mutate a draft GameState in place. Only call these on
 * a state that applyAction has already cloned.
 */
import { EngineError } from "./errors";
import { shuffle } from "./rng";
import type { CardId, GameState } from "./types";

export function log(s: GameState, player: number | null, message: string): void {
  s.log.push({ turn: s.turnNumber, player, message });
}

export function playerName(s: GameState, player: number): string {
  return s.players[player].name;
}

/** Draws up to `count` cards, reshuffling the discard pile when the deck runs out. */
export function drawCards(s: GameState, player: number, count: number): number {
  const p = s.players[player];
  let drawn = 0;
  while (drawn < count) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) break;
      [p.deck, s.rng] = shuffle(p.discard, s.rng);
      p.discard = [];
      log(s, player, `${p.name} shuffles their deck.`);
    }
    p.hand.push(p.deck.shift()!);
    drawn++;
  }
  return drawn;
}

/** Moves one card from the supply to a player's discard pile. Returns false if the pile is empty. */
export function gainCard(s: GameState, player: number, cardId: CardId): boolean {
  if ((s.supply[cardId] ?? 0) <= 0) return false;
  s.supply[cardId]--;
  s.players[player].discard.push(cardId);
  return true;
}

/** Returns `hand` with `cards` removed (as a multiset). Throws if any card is missing. */
export function removeFromHand(hand: readonly CardId[], cards: readonly CardId[]): CardId[] {
  const remaining = hand.slice();
  for (const card of cards) {
    const i = remaining.indexOf(card);
    if (i === -1) throw new EngineError(`Card not in hand: ${card}`);
    remaining.splice(i, 1);
  }
  return remaining;
}
