import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getItems, patchItems } from "../src/sync/edge-config";
import { installEdgeConfigFetchMock } from "./_mocks/mock-edge-config";

let undo: (() => void) | null = null;
const store = new Map<string, unknown>();

beforeEach(() => {
  store.clear();
  undo = installEdgeConfigFetchMock(store, "test");
});

afterEach(() => {
  undo?.();
  undo = null;
});

describe("edge-config", () => {
  it("reads items by keys", async () => {
    store.set("a", 1);
    store.set("b", "x");
    const result = await getItems(["a", "b", "c"], { edgeConfigId: "test", token: "t" });
    expect(result).toEqual({ a: 1, b: "x", c: null });
  });

  it("writes items via patch", async () => {
    await patchItems([
      { operation: "upsert", key: "flag1", value: true },
      { operation: "upsert", key: "flag2", value: 42 }
    ], { edgeConfigId: "test", token: "t" });
    expect(store.get("flag1")).toBe(true);
    expect(store.get("flag2")).toBe(42);
  });

  it("handles complex values", async () => {
    const obj = { rules: [{ if: { country: "US" }, then: true }] };
    await patchItems([{ operation: "upsert", key: "complex", value: obj }], { edgeConfigId: "test", token: "t" });
    expect(store.get("complex")).toEqual(obj);
  });
});
