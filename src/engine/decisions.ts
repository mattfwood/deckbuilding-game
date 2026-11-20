import { cardNames, getCard } from "./cards";
import { EngineError } from "./errors";
import { gainCard, log, playerName, removeFromHand } from "./mutations";
import { victimStep } from "./steps";
import type { CardId, Decision, DecisionResponse, GameState } from "./types";

/** Validates and applies a player's answer to the pending decision. Does not run the queue. */
export function resolveDecision(s: GameState, player: number, response: DecisionResponse): void {
  const d = s.pendingDecision;
  if (!d) throw new EngineError("There is no decision to make.");
  if (d.player !== player) throw new EngineError("This decision belongs to another player.");

  if (d.kind === "selectFromHand" && response.kind === "selectFromHand") {
    return resolveHandSelection(s, d, response.cards);
  }
  if (d.kind === "selectFromSupply" && response.kind === "selectFromSupply") {
    if (!d.options.includes(response.cardId)) {
      throw new EngineError(`You can't gain ${response.cardId} here.`);
    }
    s.pendingDecision = null;
    gainCard(s, d.player, response.cardId);
    log(s, d.player, `${playerName(s, d.player)} gains ${cardNames([response.cardId])}.`);
    return;
  }
  if (d.kind === "revealReaction" && response.kind === "revealReaction") {
    s.pendingDecision = null;
    if (response.reveal) {
      log(
        s,
        d.player,
        `${playerName(s, d.player)} reveals ${cardNames([d.reactionCard])} and is unaffected.`,
      );
    } else {
      s.queue.unshift(victimStep(d.player, d.effect));
    }
    return;
  }
  throw new EngineError(`Expected a "${d.kind}" response.`);
}

function resolveHandSelection(
  s: GameState,
  d: Extract<Decision, { kind: "selectFromHand" }>,
  cards: CardId[],
): void {
  if (cards.length < d.min || cards.length > d.max) {
    throw new EngineError(
      d.min === d.max
        ? `Choose exactly ${d.min} card(s).`
        : `Choose between ${d.min} and ${d.max} cards.`,
    );
  }
  const p = s.players[d.player];
  p.hand = removeFromHand(p.hand, cards);
  s.pendingDecision = null;
  const name = playerName(s, d.player);

  switch (d.purpose) {
    case "discard":
      p.discard.push(...cards);
      log(s, d.player, `${name} discards ${cards.length ? cardNames(cards) : "nothing"}.`);
      return;
    case "trash":
      s.trash.push(...cards);
      log(s, d.player, `${name} trashes ${cards.length ? cardNames(cards) : "nothing"}.`);
      return;
    case "trashToGain": {
      const [card] = cards;
      s.trash.push(card);
      log(s, d.player, `${name} trashes ${cardNames([card])}.`);
      s.queue.unshift({
        kind: "chooseGain",
        player: d.player,
        maxCost: getCard(card).cost + (d.plus ?? 0),
      });
      return;
    }
  }
}
