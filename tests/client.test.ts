import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createFlagsClient } from "../src/core/client";
import { installEdgeConfigFetchMock } from "./_mocks/mock-edge-config";

let undo: (() => void) | null = null;
const store = new Map<string, unknown>();

beforeEach(() => {
  store.clear();
  undo = installEdgeConfigFetchMock(store, "local");
});

afterEach(() => {
  undo?.();
  undo = null;
});

describe("client", () => {
  it("reads namespaced values", async () => {
    store.set("flag__production__bool", true);
    store.set("flag__production__num", 42);
    store.set("flag__production__str", "x");
    store.set("flag__production__json", { a: 1 });
    const c = createFlagsClient({ env: "production", edgeConfigId: "local" });
    expect(await c.getBoolean("bool")).toBe(true);
    expect(await c.getNumber("num")).toBe(42);
    expect(await c.getString("str")).toBe("x");
    expect(await c.getJSON("json")).toEqual({ a: 1 });
  });
});

