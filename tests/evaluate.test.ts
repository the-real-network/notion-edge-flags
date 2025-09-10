import { describe, it, expect } from "bun:test";
import { rolloutPercent, ruleSet, evaluateFlag } from "../src/core/evaluate";

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

  it("evaluateFlag returns false when flag is disabled", () => {
    const result = evaluateFlag({
      key: "test",
      flag: { enabled: false, value: true }
    });
    expect(result).toBe(false);
  });

  it("evaluateFlag returns true for simple enabled flag", () => {
    const result = evaluateFlag({
      key: "test",
      flag: { enabled: true, value: "config" }
    });
    expect(result).toBe(true);
  });

  it("evaluateFlag handles percent rollout", () => {
    const result0 = evaluateFlag({
      key: "test",
      flag: { enabled: true, value: 0, type: "percent" },
      unitId: "user123"
    });
    const result100 = evaluateFlag({
      key: "test",
      flag: { enabled: true, value: 100, type: "percent" },
      unitId: "user123"
    });
    expect(result0).toBe(false);
    expect(result100).toBe(true);
  });

  it("evaluateFlag handles rule sets", () => {
    const result = evaluateFlag({
      key: "test",
      flag: { 
        enabled: true, 
        value: { rules: [{ else: true }] }, 
        type: "rules" 
      },
      context: {}
    });
    expect(result).toBe(true);
  });
});

