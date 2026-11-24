import type { CardDef } from "../types";
import { MALWARE } from "./basic";

/** Kingdom cards for Starhold: tools and threats for a young colony on a new world. */
// export const KINGDOM_CARDS: CardDef[] = [
//   {
//     id: "campfire",
//     name: "Campfire",
//     cost: 2,
//     types: ["action"],
//     text: "+2 Actions\n+1 Credit",
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
//     text: "+1 Credit\nTrash up to 2 cards from your hand.",
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
//     text: "+1 Card\n+1 Credit\nEach other player discards a card.",
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
//     text: "+1 Buy\n+3 Credits",
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
//     text: "+1 Card\n+1 Action\nEach other player gains a Malware.",
//     onPlay: (p) => [
//       { kind: "draw", player: p, count: 1 },
//       { kind: "addActions", amount: 1 },
//       { kind: "attack", attacker: p, effect: { kind: "gain", cardId: MALWARE } },
//     ],
//   },
// ];

export const KINGDOM_CARDS: CardDef[] = [
  {
    id: "overclock",
    name: "Overclock",
    cost: 2,
    types: ["action"],
    text: "+2 Actions\n+1 Credit",
    onPlay: () => [
      { kind: "addActions", amount: 2 },
      { kind: "addCoins", amount: 1 },
    ],
  },
  {
    id: "reclaimer",
    name: "Reclaimer",
    cost: 2,
    types: ["action"],
    text: "+1 Credit\nTrash up to 2 cards from your hand.",
    onPlay: (p) => [
      { kind: "addCoins", amount: 1 },
      { kind: "trashFromHand", player: p, min: 0, max: 2 },
    ],
  },
  {
    id: "perimeter-shield",
    name: "Perimeter Shield",
    cost: 3,
    types: ["action", "reaction"],
    text: "+1 Card\n+1 Action\nWhen another player plays an Attack, you may reveal this from your hand to be unaffected by it.",
    onPlay: (p) => [
      { kind: "draw", player: p, count: 1 },
      { kind: "addActions", amount: 1 },
    ],
  },
  {
    id: "survey-drone",
    name: "Survey Drone",
    cost: 4,
    types: ["action"],
    text: "+3 Cards\nDiscard a card.",
    onPlay: (p) => [
      { kind: "draw", player: p, count: 3 },
      { kind: "discardFromHand", player: p, min: 1, max: 1 },
    ],
  },
  {
    id: "fabricator",
    name: "Fabricator",
    cost: 4,
    types: ["action"],
    text: "+1 Action\nGain a card costing up to 4.",
    onPlay: (p) => [
      { kind: "addActions", amount: 1 },
      { kind: "chooseGain", player: p, maxCost: 4 },
    ],
  },
  {
    id: "emp-burst",
    name: "EMP Burst",
    cost: 4,
    types: ["action", "attack"],
    text: "+1 Card\n+1 Credit\nEach other player discards a card.",
    onPlay: (p) => [
      { kind: "draw", player: p, count: 1 },
      { kind: "addCoins", amount: 1 },
      { kind: "attack", attacker: p, effect: { kind: "discard", count: 1 } },
    ],
  },
  {
    id: "mining-rig",
    name: "Mining Rig",
    cost: 3,
    types: ["action"],
    text: "+1 Buy\n+3 Credits",
    onPlay: () => [
      { kind: "addBuys", amount: 1 },
      { kind: "addCoins", amount: 3 },
    ],
  },
  {
    id: "supply-drop",
    name: "Supply Drop",
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
    id: "matter-converter",
    name: "Matter Converter",
    cost: 4,
    types: ["action"],
    text: "Trash a card from your hand. Gain a card costing up to 3 more than it.",
    onPlay: (p) => [{ kind: "trashToGain", player: p, plus: 3 }],
  },
  {
    id: "infiltrator",
    name: "Infiltrator",
    cost: 4,
    types: ["action", "attack"],
    text: "+1 Card\n+1 Action\nEach other player gains a Malware.",
    onPlay: (p) => [
      { kind: "draw", player: p, count: 1 },
      { kind: "addActions", amount: 1 },
      { kind: "attack", attacker: p, effect: { kind: "gain", cardId: MALWARE } },
    ],
  },
];
