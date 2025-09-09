import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createSyncer } from "../src/sync/syncer";
import { fetchChangedRows } from "../src/sync/notion";
import { installEdgeConfigFetchMock } from "./_mocks/mock-edge-config";
import { installNotionFetchMock } from "./_mocks/mock-notion";

let undoEc: (() => void) | null = null;
let undoNotion: (() => void) | null = null;
const store = new Map<string, unknown>();

beforeEach(() => {
  store.clear();
  undoEc = installEdgeConfigFetchMock(store, "local");
});

afterEach(() => {
  undoEc?.();
  undoEc = null;
  undoNotion?.();
  undoNotion = null;
});

describe("syncer", () => {
  it("upserts changed keys", async () => {
    const now = new Date().toISOString();
    undoNotion = installNotionFetchMock([
      {
        id: "p1",
        last_edited_time: now,
        properties: {
          key: { id: "key", type: "title", title: [{ plain_text: "t1" }] },
          type: { id: "type", type: "select", select: { name: "boolean" } },
          value: { id: "value", type: "checkbox", checkbox: true },
          env: { id: "env", type: "multi_select", multi_select: [{ name: "production" }] }
        }
      }
    ]);
    const notion = { token: "t", databaseId: "db" } as any;
    const vercel = { apiToken: "t", edgeConfigId: "local" } as any;
    const syncer = createSyncer({ notion, vercel, env: "production", mode: "once" });
    await syncer.run((since) => fetchChangedRows(notion, since));
    expect(store.get("flag__production__t1")).toBe(true);
  });
});

