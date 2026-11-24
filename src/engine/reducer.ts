import { cardNames, getCard, hasType } from "./cards";
import { resolveDecision } from "./decisions";
import { EngineError } from "./errors";
import { drawCards, gainCard, log, removeFromHand } from "./mutations";
import { computeResult, isGameOver } from "./scoring";
import { HAND_SIZE } from "./setup";
import { runQueue } from "./steps";
import type { Action, CardId, GameState } from "./types";

/**
 * The single entry point for changing game state. Pure: returns a new state
 * and never mutates `state`. Throws EngineError for illegal actions.
 */
export function applyAction(state: GameState, action: Action): GameState {
  if (state.phase === "gameOver") throw new EngineError("The game is over.");
  const s = structuredClone(state);

  if (action.type === "resolveDecision") {
    resolveDecision(s, action.player, action.response);
    runQueue(s);
    return s;
  }

  if (s.pendingDecision) throw new EngineError("Waiting for a decision.");
  if (action.player !== s.currentPlayer) throw new EngineError("It's not your turn.");

  switch (action.type) {
    case "playAction":
      playAction(s, action.cardId);
      break;
    case "playTreasure":
      playTreasure(s, action.cardId);
      break;
    case "playAllTreasures":
      for (const id of s.players[s.currentPlayer].hand.filter((c) => hasType(c, "treasure"))) {
        playTreasure(s, id);
      }
      break;
    case "buy":
      buy(s, action.cardId);
      break;
    case "endPhase":
      if (s.phase === "action") s.phase = "buy";
      else cleanupAndAdvance(s);
      break;
  }
  return s;
}

function playAction(s: GameState, cardId: CardId): void {
  if (s.phase !== "action") throw new EngineError("You can only play actions in the action phase.");
  if (s.actions <= 0) throw new EngineError("You have no actions left.");
  if (!hasType(cardId, "action")) throw new EngineError(`${cardId} is not an action.`);
  const p = s.players[s.currentPlayer];
  p.hand = removeFromHand(p.hand, [cardId]);
  p.inPlay.push(cardId);
  s.actions--;
  log(s, s.currentPlayer, `${p.name} plays ${cardNames([cardId])}.`);
  s.queue.unshift(...(getCard(cardId).onPlay?.(s.currentPlayer) ?? []));
  runQueue(s);
}

function playTreasure(s: GameState, cardId: CardId): void {
  if (!hasType(cardId, "treasure")) throw new EngineError(`${cardId} is not a treasure.`);
  const p = s.players[s.currentPlayer];
  p.hand = removeFromHand(p.hand, [cardId]);
  p.inPlay.push(cardId);
  s.phase = "buy";
  s.coins += getCard(cardId).coins ?? 0;
}

function buy(s: GameState, cardId: CardId): void {
  if (!(cardId in s.supply)) throw new EngineError(`${cardId} is not in the supply.`);
  if (s.supply[cardId] <= 0) throw new EngineError(`The ${cardId} pile is empty.`);
  if (s.buys <= 0) throw new EngineError("You have no buys left.");
  const cost = getCard(cardId).cost;
  if (cost > s.coins) throw new EngineError(`You need ${cost} credits; you have ${s.coins}.`);
  s.phase = "buy";
  s.coins -= cost;
  s.buys--;
  gainCard(s, s.currentPlayer, cardId);
  log(s, s.currentPlayer, `${s.players[s.currentPlayer].name} buys ${cardNames([cardId])}.`);
}

function cleanupAndAdvance(s: GameState): void {
  const current = s.currentPlayer;
  const p = s.players[current];
  p.discard.push(...p.inPlay, ...p.hand);
  p.inPlay = [];
  p.hand = [];
  drawCards(s, current, HAND_SIZE);
  p.turnsTaken++;

  if (isGameOver(s)) {
    s.phase = "gameOver";
    s.result = computeResult(s);
    const names = s.result.winners.map((i) => s.players[i].name).join(" and ");
    log(s, null, `Game over. ${names} ${s.result.winners.length > 1 ? "share the win" : "wins"}!`);
    return;
  }

  s.currentPlayer = (current + 1) % s.players.length;
  s.turnNumber++;
  s.phase = "action";
  s.actions = 1;
  s.buys = 1;
  s.coins = 0;
  log(s, s.currentPlayer, `Turn ${s.turnNumber}: ${s.players[s.currentPlayer].name}`);
}
