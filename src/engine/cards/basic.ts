import type { CardDef } from "../types";

export const ORE = "ore";
export const ALLOY = "alloy";
export const FUSION_CELL = "fusion-cell";
export const HABITAT = "habitat";
export const BIODOME = "biodome";
export const ARCOLOGY = "arcology";
export const MALWARE = "malware";

export const BASIC_CARDS: CardDef[] = [
  { id: ORE, name: "Ore", cost: 0, types: ["treasure"], text: "1 Credit", coins: 1 },
  { id: ALLOY, name: "Alloy", cost: 3, types: ["treasure"], text: "2 Credits", coins: 2 },
  {
    id: FUSION_CELL,
    name: "Fusion Cell",
    cost: 6,
    types: ["treasure"],
    text: "3 Credits",
    coins: 3,
  },
  { id: HABITAT, name: "Habitat", cost: 2, types: ["victory"], text: "1 VP", vp: 1 },
  { id: BIODOME, name: "Biodome", cost: 5, types: ["victory"], text: "3 VP", vp: 3 },
  { id: ARCOLOGY, name: "Arcology", cost: 8, types: ["victory"], text: "6 VP", vp: 6 },
  { id: MALWARE, name: "Malware", cost: 0, types: ["curse"], text: "-1 VP", vp: -1 },
];
