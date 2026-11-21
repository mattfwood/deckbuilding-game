/**
 * A simple bot: mostly money, plus a few kingdom actions. Good enough to give
 * a human a game and to fuzz-test the engine. Decides one Action at a time.
 */
import { getActor } from "../actor";
import { BLIGHT, CAPITAL, CROWN, FARM, INGOT, PENNY, TOWN, getCard, hasType } from "../cards";
import { allCards } from "../scoring";
import type { Action, CardId, Decision, GameState } from "../types";

/**
 * Kingdom cards the bot likes to buy, best first. Derived from the card data
 * rather than hard-coded ids, so it survives cards being renamed or swapped:
 * attacks first, then pricier cards.
 */
function kingdomPreference(kingdom: CardId[]): CardId[] {
  const score = (id: CardId) => (hasType(id, "attack") ? 100 : 0) + getCard(id).cost;
  return [...kingdom].sort((a, b) => score(b) - score(a) || a.localeCompare(b));
}
const MAX_KINGDOM_ACTIONS = 3;

/** Cards the bot is happiest to lose, worst first. */
const JUNK_ORDER: CardId[] = [BLIGHT, FARM, PENNY, TOWN, CAPITAL, CROWN];

export function chooseBotAction(s: GameState, player: number): Action {
  if (getActor(s) !== player) throw new Error(`Seat ${player} is not the one to act.`);
  if (s.pendingDecision) {
    return { type: "resolveDecision", player, response: decide(s, s.pendingDecision) };
  }

  const hand = s.players[player].hand;
  if (s.phase === "action" && s.actions > 0) {
    const action = pickActionToPlay(hand);
    if (action) return { type: "playAction", player, cardId: action };
  }
  if (hand.some((c) => hasType(c, "treasure"))) return { type: "playAllTreasures", player };
  if (s.buys > 0) {
    const target = pickBuy(s, player, s.coins);
    if (target) return { type: "buy", player, cardId: target };
  }
  // Action phase → buy phase, or buy phase → cleanup.
  return { type: "endPhase", player };
}

/** Play non-terminal actions (ones that give +Actions) before terminal ones. */
function pickActionToPlay(hand: CardId[]): CardId | undefined {
  const actions = hand.filter((c) => hasType(c, "action"));
  const gainsActions = (c: CardId) =>
    getCard(c)
      .onPlay?.(0)
      .some((st) => st.kind === "addActions") ?? false;
  return actions.find(gainsActions) ?? actions.sort((a, b) => getCard(b).cost - getCard(a).cost)[0];
}

function pickBuy(s: GameState, player: number, coins: number): CardId | undefined {
  const available = (id: CardId) => (s.supply[id] ?? 0) > 0 && getCard(id).cost <= coins;
  const capitalsLeft = s.supply[CAPITAL];
  const owned = allCards(s.players[player]);
  const kingdomActions = owned.filter((c) => s.kingdom.includes(c)).length;

  const wants: CardId[] = [];
  if (capitalsLeft <= 4) wants.push(CAPITAL, TOWN);
  wants.push(CAPITAL, INGOT);
  if (capitalsLeft <= 6) wants.push(TOWN);
  if (kingdomActions < MAX_KINGDOM_ACTIONS) {
    wants.push(...kingdomPreference(s.kingdom));
  }
  wants.push(CROWN);
  if (capitalsLeft <= 2) wants.push(FARM);
  return wants.find(available);
}

function decide(s: GameState, d: Decision) {
  switch (d.kind) {
    case "revealReaction":
      return { kind: "revealReaction" as const, reveal: true };

    case "selectFromSupply": {
      const byCost = [...d.options].sort((a, b) => getCard(b).cost - getCard(a).cost);
      const pick =
        [CAPITAL, INGOT, ...kingdomPreference(s.kingdom), CROWN].find((id) =>
          d.options.includes(id),
        ) ??
        byCost.find((id) => id !== BLIGHT) ??
        byCost[0];
      return { kind: "selectFromSupply" as const, cardId: pick };
    }

    case "selectFromHand": {
      const hand = s.players[d.player].hand;
      const ranked = [...hand].sort((a, b) => junkRank(a) - junkRank(b));
      let count = d.min;
      if (d.purpose === "trash") {
        // Trash only real junk, as many as allowed.
        const junk = ranked.filter((c) => c === BLIGHT || c === FARM || c === PENNY);
        count = Math.max(d.min, Math.min(d.max, junk.length));
      }
      return { kind: "selectFromHand" as const, cards: ranked.slice(0, count) };
    }
  }
}

function junkRank(id: CardId): number {
  const i = JUNK_ORDER.indexOf(id);
  // Unlisted cards (kingdom actions, Ingot) are kept: rank them after the junk, cheapest first.
  return i === -1 ? JUNK_ORDER.length + getCard(id).cost : i;
}
