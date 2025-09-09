import { describe, it, expect } from "bun:test";
import { resolveEnvironment, formatNamespacedKey } from "../src/utils/env";

describe("env", () => {
  it("resolves from explicit first", () => {
    expect(resolveEnvironment("staging")).toBe("staging");
  });
  it("formats namespaced keys", () => {
    expect(formatNamespacedKey("flag", "production", "a")).toBe("flag__production__a");
  });
});

