import { describe, expect, it } from "vitest";
import { nextFloat, seedFromString, shuffle } from "@/engine/rng";

describe("rng", () => {
  it("is deterministic for the same seed", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], seedFromString("game-1"));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], seedFromString("game-1"));
    expect(a).toEqual(b);
  });

  it("produces different orders for different seeds", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const [a] = shuffle(items, seedFromString("game-1"));
    const [b] = shuffle(items, seedFromString("game-2"));
    expect(a).not.toEqual(b);
  });

  it("shuffle keeps every item and does not mutate the input", () => {
    const items = ["a", "b", "c", "d", "e"];
    const [out] = shuffle(items, seedFromString("x"));
    expect(items).toEqual(["a", "b", "c", "d", "e"]);
    expect([...out].sort()).toEqual(items);
  });

  it("nextFloat stays in [0, 1)", () => {
    let s = seedFromString("range");
    for (let i = 0; i < 1000; i++) {
      let v: number;
      [v, s] = nextFloat(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
