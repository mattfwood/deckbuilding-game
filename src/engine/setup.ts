import {
  MALWARE,
  ARCOLOGY,
  ALLOY,
  HABITAT,
  FUSION_CELL,
  KINGDOM_CARD_IDS,
  ORE,
  BIODOME,
  getCard,
} from "./cards";
import { EngineError } from "./errors";
import { drawCards, log } from "./mutations";
import { seedFromString, shuffle } from "./rng";
import type { CardId, GameState } from "./types";

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;
export const HAND_SIZE = 5;
export const KINGDOM_PILE_SIZE = 10;

export interface CreateGameOptions {
  seed: string;
  players: { id: string; name: string }[];
  /** Kingdom cards in the supply. Defaults to every kingdom card. */
  kingdom?: CardId[];
}

export function startingDeck(): CardId[] {
  return [...Array(7).fill(ORE), ...Array(3).fill(HABITAT)];
}

export function createGame({
  seed,
  players,
  kingdom = [...KINGDOM_CARD_IDS],
}: CreateGameOptions): GameState {
  const n = players.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) {
    throw new EngineError(`Starhold needs ${MIN_PLAYERS}-${MAX_PLAYERS} players.`);
  }
  if (new Set(kingdom).size !== kingdom.length) {
    throw new EngineError("Kingdom cards must be unique.");
  }
  for (const id of kingdom) {
    if (!KINGDOM_CARD_IDS.includes(id)) throw new EngineError(`Not a kingdom card: ${id}`);
  }

  const victoryPile = n <= 2 ? 8 : 12;
  const supply: Record<CardId, number> = {
    [ORE]: 60 - 7 * n,
    [ALLOY]: 40,
    [FUSION_CELL]: 30,
    [HABITAT]: victoryPile,
    [BIODOME]: victoryPile,
    [ARCOLOGY]: victoryPile,
    [MALWARE]: 10 * Math.max(n - 1, 1),
  };
  for (const id of kingdom) {
    supply[id] = getCard(id).types.includes("victory") ? victoryPile : KINGDOM_PILE_SIZE;
  }

  let rng = seedFromString(seed);
  const playerStates = players.map((p) => {
    let deck: CardId[];
    [deck, rng] = shuffle(startingDeck(), rng);
    return { id: p.id, name: p.name, deck, hand: [], discard: [], inPlay: [], turnsTaken: 0 };
  });

  const state: GameState = {
    seed,
    rng,
    players: playerStates,
    supply,
    kingdom: [...kingdom],
    trash: [],
    currentPlayer: 0,
    turnNumber: 1,
    phase: "action",
    actions: 1,
    buys: 1,
    coins: 0,
    queue: [],
    pendingDecision: null,
    log: [],
    result: null,
  };

  for (let i = 0; i < n; i++) drawCards(state, i, HAND_SIZE);
  log(state, 0, `Turn 1: ${state.players[0].name}`);
  return state;
}
