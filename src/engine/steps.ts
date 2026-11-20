import { cardNames, getCard, hasType } from "./cards";
import { drawCards, gainCard, log, playerName } from "./mutations";
import type { GameState, Step, VictimEffect } from "./types";

/** Runs queued steps until the queue is empty or a step needs a player decision. */
export function runQueue(s: GameState): void {
  while (!s.pendingDecision && s.queue.length > 0) {
    executeStep(s, s.queue.shift()!);
  }
}

/** The step an attack applies to one victim. */
export function victimStep(player: number, effect: VictimEffect): Step {
  return effect.kind === "discard"
    ? { kind: "discardFromHand", player, min: effect.count, max: effect.count }
    : { kind: "gain", player, cardId: effect.cardId };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function executeStep(s: GameState, step: Step): void {
  switch (step.kind) {
    case "draw":
      drawCards(s, step.player, step.count);
      return;

    case "addActions":
      s.actions += step.amount;
      return;

    case "addBuys":
      s.buys += step.amount;
      return;

    case "addCoins":
      s.coins += step.amount;
      return;

    case "discardFromHand":
    case "trashFromHand": {
      const handSize = s.players[step.player].hand.length;
      const max = Math.min(step.max, handSize);
      if (max === 0) return;
      const min = Math.min(step.min, max);
      const verb = step.kind === "discardFromHand" ? "Discard" : "Trash";
      s.pendingDecision = {
        kind: "selectFromHand",
        player: step.player,
        purpose: step.kind === "discardFromHand" ? "discard" : "trash",
        min,
        max,
        prompt:
          min === max ? `${verb} ${plural(max, "card")}.` : `${verb} up to ${plural(max, "card")}.`,
      };
      return;
    }

    case "trashToGain":
      if (s.players[step.player].hand.length === 0) return;
      s.pendingDecision = {
        kind: "selectFromHand",
        player: step.player,
        purpose: "trashToGain",
        min: 1,
        max: 1,
        plus: step.plus,
        prompt: `Trash a card. You'll gain a card costing up to ${step.plus} more.`,
      };
      return;

    case "chooseGain": {
      const options = Object.keys(s.supply).filter(
        (id) => s.supply[id] > 0 && getCard(id).cost <= step.maxCost,
      );
      if (options.length === 0) {
        log(s, step.player, `${playerName(s, step.player)} has nothing to gain.`);
        return;
      }
      s.pendingDecision = {
        kind: "selectFromSupply",
        player: step.player,
        purpose: "gain",
        maxCost: step.maxCost,
        options,
        prompt: `Gain a card costing up to ${step.maxCost}.`,
      };
      return;
    }

    case "gain":
      if (gainCard(s, step.player, step.cardId)) {
        log(s, step.player, `${playerName(s, step.player)} gains ${cardNames([step.cardId])}.`);
      }
      return;

    case "attack": {
      const n = s.players.length;
      const victims: Step[] = [];
      for (let i = 1; i < n; i++) {
        victims.push({
          kind: "attackVictim",
          player: (step.attacker + i) % n,
          effect: step.effect,
        });
      }
      s.queue.unshift(...victims);
      return;
    }

    case "attackVictim": {
      const reaction = s.players[step.player].hand.find((c) => hasType(c, "reaction"));
      if (reaction) {
        s.pendingDecision = {
          kind: "revealReaction",
          player: step.player,
          reactionCard: reaction,
          effect: step.effect,
          prompt: `Reveal ${getCard(reaction).name} to be unaffected by the attack?`,
        };
      } else {
        s.queue.unshift(victimStep(step.player, step.effect));
      }
      return;
    }
  }
}
