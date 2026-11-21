import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("rate limiter", () => {
  it("allows up to the limit per window, per key, then resets", () => {
    let t = 0;
    const rl = createRateLimiter(() => t);
    const limit = { max: 3, windowMs: 1000 };

    expect([1, 2, 3, 4].map(() => rl.allow("a", limit))).toEqual([true, true, true, false]);
    expect(rl.allow("b", limit)).toBe(true);

    t = 999;
    expect(rl.allow("a", limit)).toBe(false);
    t = 1000;
    expect(rl.allow("a", limit)).toBe(true);
  });
});
