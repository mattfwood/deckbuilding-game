import type { RngState } from "./rng";

export type CardId = string;

export type CardType = "treasure" | "victory" | "curse" | "action" | "attack" | "reaction";

/** What an attack does to each player it hits (data only, so it can live in state). */
export type VictimEffect = { kind: "discard"; count: number } | { kind: "gain"; cardId: CardId };

/**
 * A unit of pending work. Card effects compile to a list of steps, which the
 * engine runs in order. Steps are plain data so GameState stays serializable.
 */
export type Step =
  | { kind: "draw"; player: number; count: number }
  | { kind: "addActions"; amount: number }
  | { kind: "addBuys"; amount: number }
  | { kind: "addCoins"; amount: number }
  | { kind: "discardFromHand"; player: number; min: number; max: number }
  | { kind: "trashFromHand"; player: number; min: number; max: number }
  | { kind: "trashToGain"; player: number; plus: number }
  | { kind: "chooseGain"; player: number; maxCost: number }
  | { kind: "gain"; player: number; cardId: CardId }
  | { kind: "attack"; attacker: number; effect: VictimEffect }
  | { kind: "attackVictim"; player: number; effect: VictimEffect };

export interface CardDef {
  readonly id: CardId;
  readonly name: string;
  readonly cost: number;
  readonly types: readonly CardType[];
  readonly text: string;
  /** Coins produced when played (treasures). */
  readonly coins?: number;
  /** Victory points at game end. */
  readonly vp?: number;
  /** Steps to run when played as an action. */
  readonly onPlay?: (player: number) => Step[];
}

/** A choice the engine is waiting on. May belong to a player other than the current one. */
export type Decision =
  | {
      kind: "selectFromHand";
      player: number;
      purpose: "discard" | "trash" | "trashToGain";
      min: number;
      max: number;
      /** For trashToGain: how much more the gained card may cost. */
      plus?: number;
      prompt: string;
    }
  | {
      kind: "selectFromSupply";
      player: number;
      purpose: "gain";
      maxCost: number;
      options: CardId[];
      prompt: string;
    }
  | {
      kind: "revealReaction";
      player: number;
      reactionCard: CardId;
      effect: VictimEffect;
      prompt: string;
    };

export type DecisionResponse =
  | { kind: "selectFromHand"; cards: CardId[] }
  | { kind: "selectFromSupply"; cardId: CardId }
  | { kind: "revealReaction"; reveal: boolean };

export type Action =
  | { type: "playAction"; player: number; cardId: CardId }
  | { type: "playTreasure"; player: number; cardId: CardId }
  | { type: "playAllTreasures"; player: number }
  | { type: "buy"; player: number; cardId: CardId }
  /** Action phase → buy phase; buy phase → cleanup and next player's turn. */
  | { type: "endPhase"; player: number }
  | { type: "resolveDecision"; player: number; response: DecisionResponse };

export type Phase = "action" | "buy" | "gameOver";

export interface PlayerState {
  id: string;
  name: string;
  /** Index 0 is the top of the deck. */
  deck: CardId[];
  hand: CardId[];
  discard: CardId[];
  inPlay: CardId[];
  turnsTaken: number;
}

export interface LogEntry {
  turn: number;
  player: number | null;
  message: string;
}

export interface GameResult {
  scores: number[];
  /** Seat indexes of the winner(s); more than one means a shared win. */
  winners: number[];
}

export interface GameState {
  seed: string;
  rng: RngState;
  players: PlayerState[];
  supply: Record<CardId, number>;
  kingdom: CardId[];
  trash: CardId[];
  currentPlayer: number;
  turnNumber: number;
  phase: Phase;
  actions: number;
  buys: number;
  coins: number;
  queue: Step[];
  pendingDecision: Decision | null;
  log: LogEntry[];
  result: GameResult | null;
}
