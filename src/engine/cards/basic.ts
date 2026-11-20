import type { CardDef } from "../types";

export const PENNY = "penny";
export const CROWN = "crown";
export const INGOT = "ingot";
export const FARM = "farm";
export const TOWN = "town";
export const CAPITAL = "capital";
export const BLIGHT = "blight";

export const BASIC_CARDS: CardDef[] = [
  { id: PENNY, name: "Penny", cost: 0, types: ["treasure"], text: "1 Coin", coins: 1 },
  { id: CROWN, name: "Crown", cost: 3, types: ["treasure"], text: "2 Coins", coins: 2 },
  { id: INGOT, name: "Ingot", cost: 6, types: ["treasure"], text: "3 Coins", coins: 3 },
  { id: FARM, name: "Farm", cost: 2, types: ["victory"], text: "1 VP", vp: 1 },
  { id: TOWN, name: "Town", cost: 5, types: ["victory"], text: "3 VP", vp: 3 },
  { id: CAPITAL, name: "Capital", cost: 8, types: ["victory"], text: "6 VP", vp: 6 },
  { id: BLIGHT, name: "Blight", cost: 0, types: ["curse"], text: "-1 VP", vp: -1 },
];
