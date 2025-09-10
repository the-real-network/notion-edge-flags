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
  it("reads new flag structure", async () => {
    process.env.EDGE_CONFIG = "https://edge-config.vercel.com/local?token=test";
    store.set("flag__production__toggle", { enabled: true, value: true, type: "string" });
    store.set("flag__production__config", { enabled: true, value: { theme: "dark" }, type: "json" });
    store.set("flag__production__disabled", { enabled: false, value: "test" });
    store.set("flag__production__percent", { enabled: true, value: 50, type: "percent" });
    
    const c = createFlagsClient({ env: "production" });
    
    expect(await c.isEnabled("toggle")).toBe(true);
    expect(await c.isEnabled("disabled")).toBe(false);
    expect(await c.getValue("disabled")).toBeNull();
    
    const flag = await c.getFlag("percent");
    expect(flag?.enabled).toBe(true);
    expect(flag?.value).toBe(50);
    expect(flag?.type).toBe("percent");
    
    delete process.env.EDGE_CONFIG;
  });

  it("handles legacy values", async () => {
    process.env.EDGE_CONFIG = "https://edge-config.vercel.com/local?token=test";
    store.set("flag__production__legacy_bool", true);
    store.set("flag__production__legacy_num", 42);
    store.set("flag__production__legacy_str", "test");
    
    const c = createFlagsClient({ env: "production" });
    
    expect(await c.isEnabled("legacy_bool")).toBe(true);
    expect(await c.isEnabled("legacy_num")).toBe(true);
    
    const flag = await c.getFlag("legacy_bool");
    expect(flag?.enabled).toBe(true);
    expect(flag?.value).toBe(true);
    
    delete process.env.EDGE_CONFIG;
  });
});

