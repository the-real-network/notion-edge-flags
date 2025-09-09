import { describe, it, expect } from "bun:test";
import { stableHash, bucketPercent } from "../src/core/hash";

describe("hash", () => {
  it("is stable for same input", () => {
    expect(stableHash("abc")).toBe(stableHash("abc"));
  });
  it("buckets 0..99", () => {
    for (let i = 0; i < 100; i++) {
      const b = bucketPercent("key", String(i));
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(100);
    }
  });
});

