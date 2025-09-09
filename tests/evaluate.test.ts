import { describe, it, expect } from "bun:test";
import { rolloutPercent, ruleSet } from "../src/core/evaluate";

describe("evaluate", () => {
  it("rolloutPercent inclusions respect percent", () => {
    const in0 = rolloutPercent({ key: "A", percent: 0, unitId: "u1" });
    const in100 = rolloutPercent({ key: "A", percent: 100, unitId: "u1" });
    expect(in0).toBe(false);
    expect(in100).toBe(true);
  });
  it("ruleSet default returns else when present", () => {
    const v = ruleSet({ key: "k", value: { rules: [{ else: true }] }, context: {} });
    expect(v).toBe(true);
  });
});

