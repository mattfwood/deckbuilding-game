import type { CardDef } from "../types";
import { BLIGHT } from "./basic";

/** Placeholder kingdom cards for Realm. Rename / rebalance freely. */
// export const KINGDOM_CARDS: CardDef[] = [
//   {
//     id: "campfire",
//     name: "Campfire",
//     cost: 2,
//     types: ["action"],
//     text: "+2 Actions\n+1 Coin",
//     onPlay: () => [
//       { kind: "addActions", amount: 2 },
//       { kind: "addCoins", amount: 1 },
//     ],
//   },
//   {
//     id: "shrine",
//     name: "Shrine",
//     cost: 2,
//     types: ["action"],
//     text: "+1 Coin\nTrash up to 2 cards from your hand.",
//     onPlay: (p) => [
//       { kind: "addCoins", amount: 1 },
//       { kind: "trashFromHand", player: p, min: 0, max: 2 },
//     ],
//   },
//   {
//     id: "palisade",
//     name: "Palisade",
//     cost: 3,
//     types: ["action", "reaction"],
//     text: "+1 Card\n+1 Action\nWhen another player plays an Attack, you may reveal this from your hand to be unaffected by it.",
//     onPlay: (p) => [
//       { kind: "draw", player: p, count: 1 },
//       { kind: "addActions", amount: 1 },
//     ],
//   },
//   {
//     id: "scribe",
//     name: "Scribe",
//     cost: 4,
//     types: ["action"],
//     text: "+3 Cards\nDiscard a card.",
//     onPlay: (p) => [
//       { kind: "draw", player: p, count: 3 },
//       { kind: "discardFromHand", player: p, min: 1, max: 1 },
//     ],
//   },
//   {
//     id: "builder",
//     name: "Builder",
//     cost: 4,
//     types: ["action"],
//     text: "+1 Action\nGain a card costing up to 4.",
//     onPlay: (p) => [
//       { kind: "addActions", amount: 1 },
//       { kind: "chooseGain", player: p, maxCost: 4 },
//     ],
//   },
//   {
//     id: "raider",
//     name: "Raider",
//     cost: 4,
//     types: ["action", "attack"],
//     text: "+1 Card\n+1 Coin\nEach other player discards a card.",
//     onPlay: (p) => [
//       { kind: "draw", player: p, count: 1 },
//       { kind: "addCoins", amount: 1 },
//       { kind: "attack", attacker: p, effect: { kind: "discard", count: 1 } },
//     ],
//   },
//   {
//     id: "tax-collector",
//     name: "Tax Collector",
//     cost: 5,
//     types: ["action"],
//     text: "+1 Buy\n+3 Coins",
//     onPlay: () => [
//       { kind: "addBuys", amount: 1 },
//       { kind: "addCoins", amount: 3 },
//     ],
//   },
//   {
//     id: "caravan",
//     name: "Caravan",
//     cost: 5,
//     types: ["action"],
//     text: "+2 Cards\n+1 Action\n+1 Buy",
//     onPlay: (p) => [
//       { kind: "draw", player: p, count: 2 },
//       { kind: "addActions", amount: 1 },
//       { kind: "addBuys", amount: 1 },
//     ],
//   },
//   {
//     id: "alchemist",
//     name: "Alchemist",
//     cost: 5,
//     types: ["action"],
//     text: "Trash a card from your hand. Gain a card costing up to 3 more than it.",
//     onPlay: (p) => [{ kind: "trashToGain", player: p, plus: 3 }],
//   },
//   {
//     id: "warlock",
//     name: "Warlock",
//     cost: 5,
//     types: ["action", "attack"],
//     text: "+1 Card\n+1 Action\nEach other player gains a Blight.",
//     onPlay: (p) => [
//       { kind: "draw", player: p, count: 1 },
//       { kind: "addActions", amount: 1 },
//       { kind: "attack", attacker: p, effect: { kind: "gain", cardId: BLIGHT } },
//     ],
//   },
// ];

export const KINGDOM_CARDS: CardDef[] = [
  {
    id: "cellar",
    name: "Cellar",
    cost: 2,
    types: ["action"],
    text: "+2 Actions\n+1 Coin",
    onPlay: () => [
      { kind: "addActions", amount: 2 },
      { kind: "addCoins", amount: 1 },
    ],
  },
  {
    id: "chapel",
    name: "Chapel",
    cost: 2,
    types: ["action"],
    text: "+1 Coin\nTrash up to 2 cards from your hand.",
    onPlay: (p) => [
      { kind: "addCoins", amount: 1 },
      { kind: "trashFromHand", player: p, min: 0, max: 2 },
    ],
  },
  {
    id: "moat",
    name: "Moat",
    cost: 3,
    types: ["action", "reaction"],
    text: "+1 Card\n+1 Action\nWhen another player plays an Attack, you may reveal this from your hand to be unaffected by it.",
    onPlay: (p) => [
      { kind: "draw", player: p, count: 1 },
      { kind: "addActions", amount: 1 },
    ],
  },
  {
    id: "harbinger",
    name: "Harbinger",
    cost: 4,
    types: ["action"],
    text: "+3 Cards\nDiscard a card.",
    onPlay: (p) => [
      { kind: "draw", player: p, count: 3 },
      { kind: "discardFromHand", player: p, min: 1, max: 1 },
    ],
  },
  {
    id: "merchant",
    name: "Merchant",
    cost: 4,
    types: ["action"],
    text: "+1 Action\nGain a card costing up to 4.",
    onPlay: (p) => [
      { kind: "addActions", amount: 1 },
      { kind: "chooseGain", player: p, maxCost: 4 },
    ],
  },
  {
    id: "vassal",
    name: "Vassal",
    cost: 4,
    types: ["action", "attack"],
    text: "+1 Card\n+1 Coin\nEach other player discards a card.",
    onPlay: (p) => [
      { kind: "draw", player: p, count: 1 },
      { kind: "addCoins", amount: 1 },
      { kind: "attack", attacker: p, effect: { kind: "discard", count: 1 } },
    ],
  },
  {
    id: "village",
    name: "Village",
    cost: 3,
    types: ["action"],
    text: "+1 Buy\n+3 Coins",
    onPlay: () => [
      { kind: "addBuys", amount: 1 },
      { kind: "addCoins", amount: 3 },
    ],
  },
  {
    id: "workshop",
    name: "Workshop",
    cost: 3,
    types: ["action"],
    text: "+2 Cards\n+1 Action\n+1 Buy",
    onPlay: (p) => [
      { kind: "draw", player: p, count: 2 },
      { kind: "addActions", amount: 1 },
      { kind: "addBuys", amount: 1 },
    ],
  },
  {
    id: "militia",
    name: "Militia",
    cost: 4,
    types: ["action"],
    text: "Trash a card from your hand. Gain a card costing up to 3 more than it.",
    onPlay: (p) => [{ kind: "trashToGain", player: p, plus: 3 }],
  },
  {
    id: "moneylender",
    name: "Moneylender",
    cost: 4,
    types: ["action", "attack"],
    text: "+1 Card\n+1 Action\nEach other player gains a Blight.",
    onPlay: (p) => [
      { kind: "draw", player: p, count: 1 },
      { kind: "addActions", amount: 1 },
      { kind: "attack", attacker: p, effect: { kind: "gain", cardId: BLIGHT } },
    ],
  },
];
