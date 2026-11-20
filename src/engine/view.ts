import type { CardId, GameState } from "./types";

export interface PublicPlayerView {
  id: string;
  name: string;
  handCount: number;
  deckCount: number;
  discardCount: number;
  /** The face-up top card of the discard pile. */
  discardTop: CardId | null;
  inPlay: CardId[];
  turnsTaken: number;
}

/** What one player is allowed to see. Never includes the seed, RNG, or anyone else's hand. */
export interface PlayerView extends Omit<GameState, "seed" | "rng" | "players" | "queue"> {
  you: number;
  hand: CardId[];
  players: PublicPlayerView[];
}

export function getPlayerView(state: GameState, player: number): PlayerView {
  return structuredClone({
    you: player,
    hand: state.players[player].hand,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      handCount: p.hand.length,
      deckCount: p.deck.length,
      discardCount: p.discard.length,
      discardTop: p.discard.at(-1) ?? null,
      inPlay: p.inPlay,
      turnsTaken: p.turnsTaken,
    })),
    supply: state.supply,
    kingdom: state.kingdom,
    trash: state.trash,
    currentPlayer: state.currentPlayer,
    turnNumber: state.turnNumber,
    phase: state.phase,
    actions: state.actions,
    buys: state.buys,
    coins: state.coins,
    pendingDecision: state.pendingDecision,
    log: state.log,
    result: state.result,
  });
}
