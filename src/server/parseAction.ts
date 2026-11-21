import { CARDS, EngineError, type Action, type CardId, type DecisionResponse } from "@/engine";

/**
 * Turn untrusted client input into a well-formed Action, or throw. Rebuilds the
 * object field by field, so nothing unexpected ends up in the stored log. The
 * engine still decides whether the move is legal.
 */
export function parseAction(input: unknown): Action {
  const o = asObject(input, "action");
  const player = o.player;
  if (!Number.isInteger(player)) throw bad("action.player");
  const p = player as number;

  switch (o.type) {
    case "playAction":
    case "playTreasure":
    case "buy":
      return { type: o.type, player: p, cardId: cardId(o.cardId) };
    case "playAllTreasures":
    case "endPhase":
      return { type: o.type, player: p };
    case "resolveDecision":
      return { type: "resolveDecision", player: p, response: parseResponse(o.response) };
    default:
      throw bad("action.type");
  }
}

function parseResponse(input: unknown): DecisionResponse {
  const o = asObject(input, "response");
  switch (o.kind) {
    case "selectFromHand": {
      if (!Array.isArray(o.cards) || o.cards.length > 20) throw bad("response.cards");
      return { kind: "selectFromHand", cards: o.cards.map(cardId) };
    }
    case "selectFromSupply":
      return { kind: "selectFromSupply", cardId: cardId(o.cardId) };
    case "revealReaction":
      if (typeof o.reveal !== "boolean") throw bad("response.reveal");
      return { kind: "revealReaction", reveal: o.reveal };
    default:
      throw bad("response.kind");
  }
}

function cardId(input: unknown): CardId {
  if (typeof input !== "string" || !Object.hasOwn(CARDS, input)) throw bad("card");
  return input;
}

function asObject(input: unknown, what: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw bad(what);
  return input as Record<string, unknown>;
}

function bad(what: string) {
  return new EngineError(`Invalid ${what}.`);
}
