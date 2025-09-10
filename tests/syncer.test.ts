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
  it("upserts changed keys with new structure", async () => {
    const now = new Date().toISOString();
    undoNotion = installNotionFetchMock([
      {
        id: "p1",
        last_edited_time: now,
        properties: {
          key: { id: "key", type: "title", title: [{ plain_text: "t1" }] },
          enabled: { id: "enabled", type: "checkbox", checkbox: true },
          type: { id: "type", type: "select", select: { name: "string" } },
          value: { id: "value", type: "rich_text", rich_text: [{ plain_text: "test-value" }] },
          env: { id: "env", type: "multi_select", multi_select: [{ name: "production" }] }
        }
      }
    ]);
    const notion = { token: "t", databaseId: "db" } as any;
    const edgeConfig = { connectionString: "https://edge-config.vercel.com/local?token=test", apiToken: "t" } as any;
    const syncer = createSyncer({ notion, edgeConfig, env: "production", mode: "once" });
    await syncer.run((since) => fetchChangedRows(notion, since));
    
    const flag = store.get("flag__production__t1");
    expect(flag).toEqual({
      enabled: true,
      value: "test-value",
      type: "string"
    });
  });
});

