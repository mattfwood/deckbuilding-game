import { hasType, type CardId, type PlayerView } from "@/engine";

/**
 * What the last update gave the player whose turn it is, worked out by
 * comparing two consecutive views. Drives the "+2 actions" style feedback.
 * Only gains are reported; spending is the player's own doing and needs no fanfare.
 */
export interface TurnFx {
  /** Changes on every update, so animations keyed on it replay. */
  id: number;
  /** Whose turn the gains belong to, or null when there's nothing to show. */
  seat: number | null;
  cards: number;
  actions: number;
  buys: number;
  credits: number;
  /** Hand indices (in the new view) of the cards just drawn, when it's your turn. */
  freshHand: number[];
}

export function noFx(id: number): TurnFx {
  return { id, seat: null, cards: 0, actions: 0, buys: 0, credits: 0, freshHand: [] };
}

export function hasGains(fx: TurnFx): boolean {
  return fx.cards + fx.actions + fx.buys + fx.credits > 0;
}

export function diffTurn(prev: PlayerView, next: PlayerView, id: number): TurnFx {
  // A new turn (or the end of the game) resets everything: those draws aren't a card's doing.
  if (
    next.phase === "gameOver" ||
    next.turnNumber !== prev.turnNumber ||
    next.currentPlayer !== prev.currentPlayer
  ) {
    return noFx(id);
  }
  const seat = next.currentPlayer;
  const before = prev.players[seat];
  const after = next.players[seat];

  // Cards leave the hand by being played (into play) or by decisions (discard,
  // trash); they only arrive by drawing. So hand growth plus what went into play
  // is what was drawn. Discards and trashes come out negative and are ignored.
  const playedNow = after.inPlay.slice(before.inPlay.length);
  const cards = Math.max(0, after.handCount - before.handCount + playedNow.length);

  // Playing an action spends one, so add those back to show the card's full "+N Actions".
  const actionsPlayed = playedNow.filter((id) => hasType(id, "action")).length;
  const actions = Math.max(0, next.actions - prev.actions + actionsPlayed);
  const buys = Math.max(0, next.buys - prev.buys);
  const credits = Math.max(0, next.coins - prev.coins);

  const freshHand = seat === next.you && cards > 0 ? newCards(prev.hand, next.hand, cards) : [];
  const fx = { id, seat, cards, actions, buys, credits, freshHand };
  return hasGains(fx) ? fx : noFx(id);
}

/**
 * Which cards in `after` weren't in `before`. Drawn cards are appended to the
 * hand, so of several copies of one card the later ones are the new ones.
 */
function newCards(before: CardId[], after: CardId[], drawn: number): number[] {
  const left = new Map<CardId, number>();
  for (const id of before) left.set(id, (left.get(id) ?? 0) + 1);
  const fresh: number[] = [];
  after.forEach((id, i) => {
    const n = left.get(id) ?? 0;
    if (n > 0) left.set(id, n - 1);
    else fresh.push(i);
  });
  return fresh.slice(-drawn);
}
