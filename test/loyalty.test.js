import { describe, it, expect } from "vitest";
import { earnedRewards, availableRewards, shirtsUntilNextReward } from "../src/loyalty.js";

describe("earnedRewards", () => {
  it("earns one reward per 10 shirts, rounded down", () => {
    expect(earnedRewards(0)).toBe(0);
    expect(earnedRewards(9)).toBe(0);
    expect(earnedRewards(10)).toBe(1);
    expect(earnedRewards(19)).toBe(1);
    expect(earnedRewards(20)).toBe(2);
  });

  it("treats missing/null totals as 0", () => {
    expect(earnedRewards(undefined)).toBe(0);
    expect(earnedRewards(null)).toBe(0);
  });
});

describe("availableRewards", () => {
  it("subtracts redeemed from earned", () => {
    expect(availableRewards({ total_shirts: 25, redeemed_rewards: 1 })).toBe(1); // earned 2, redeemed 1
  });

  it("never goes negative, even with bad/stale data (redeemed > earned)", () => {
    expect(availableRewards({ total_shirts: 5, redeemed_rewards: 3 })).toBe(0);
  });

  it("handles a missing customer record", () => {
    expect(availableRewards(null)).toBe(0);
    expect(availableRewards(undefined)).toBe(0);
  });

  it("regression: does not fall for the `a||0-b||0` operator-precedence trap", () => {
    // `earned_rewards||0-redeemed_rewards||0` parses as
    // `earned_rewards || (0-redeemed_rewards) || 0`, which is 2 here (the
    // truthy earned_rewards short-circuits the whole expression) instead of
    // the correct 2 - 1 = 1. This was a real bug in the app; guard against
    // it coming back the same way if this logic is ever inlined again.
    const rec = { total_shirts: 25, earned_rewards: 2, redeemed_rewards: 1 };
    expect(availableRewards(rec)).toBe(1);
    expect(availableRewards(rec)).not.toBe(rec.earned_rewards);
  });
});

describe("shirtsUntilNextReward", () => {
  it("counts down to the next multiple of 10", () => {
    expect(shirtsUntilNextReward(0)).toBe(10);
    expect(shirtsUntilNextReward(1)).toBe(9);
    expect(shirtsUntilNextReward(9)).toBe(1);
  });

  it("shows a full 10 remaining right after hitting a reward, not 0", () => {
    expect(shirtsUntilNextReward(10)).toBe(10);
    expect(shirtsUntilNextReward(20)).toBe(10);
  });
});
