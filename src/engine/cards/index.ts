import type { CardDef, CardId, CardType } from "../types";
import { BASIC_CARDS } from "./basic";
import { KINGDOM_CARDS } from "./kingdom";

export * from "./basic";
export { KINGDOM_CARDS } from "./kingdom";

export const CARDS: Readonly<Record<CardId, CardDef>> = Object.fromEntries(
  [...BASIC_CARDS, ...KINGDOM_CARDS].map((c) => [c.id, c]),
);

export const KINGDOM_CARD_IDS: readonly CardId[] = KINGDOM_CARDS.map((c) => c.id);

export function getCard(id: CardId): CardDef {
  const card = CARDS[id];
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}

export function hasType(id: CardId, type: CardType): boolean {
  return getCard(id).types.includes(type);
}

export function cardNames(ids: readonly CardId[]): string {
  return ids.map((id) => getCard(id).name).join(", ");
}
