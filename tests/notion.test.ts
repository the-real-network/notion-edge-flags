import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { fetchChangedRows } from "../src/sync/notion";
import { installNotionFetchMock } from "./_mocks/mock-notion";

let undo: (() => void) | null = null;

afterEach(() => {
  undo?.();
  undo = null;
});

describe("notion", () => {
  it("parses new flag structure with enabled field", async () => {
    undo = installNotionFetchMock([{
      id: "p1",
      last_edited_time: "2025-01-01T00:00:00.000Z",
      properties: {
        key: { type: "title", title: [{ plain_text: "test" }] },
        enabled: { type: "checkbox", checkbox: true },
        type: { type: "select", select: { name: "string" } },
        value: { type: "rich_text", rich_text: [{ plain_text: "hello" }] },
        env: { type: "multi_select", multi_select: [{ name: "development" }] }
      }
    }]);
    const rows = await fetchChangedRows({ token: "test", databaseId: "db" }, null);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.key).toBe("test");
    expect(rows[0]!.enabled).toBe(true);
    expect(rows[0]!.type).toBe("string");
    expect(rows[0]!.value).toBe("hello");
    expect(rows[0]!.envs).toEqual(["development"]);
  });

  it("parses number flags", async () => {
    undo = installNotionFetchMock([{
      id: "p1",
      last_edited_time: "2025-01-01T00:00:00.000Z",
      properties: {
        key: { type: "title", title: [{ plain_text: "test" }] },
        enabled: { type: "checkbox", checkbox: true },
        type: { type: "select", select: { name: "number" } },
        value: { type: "number", number: 42 },
        env: { type: "multi_select", multi_select: [{ name: "production" }] }
      }
    }]);
    const rows = await fetchChangedRows({ token: "test", databaseId: "db" }, null);
    expect(rows[0]!.enabled).toBe(true);
    expect(rows[0]!.type).toBe("number");
    expect(rows[0]!.value).toBe(42);
  });

  it("parses json flags", async () => {
    undo = installNotionFetchMock([{
      id: "p1",
      last_edited_time: "2025-01-01T00:00:00.000Z",
      properties: {
        key: { type: "title", title: [{ plain_text: "test" }] },
        enabled: { type: "checkbox", checkbox: false },
        type: { type: "select", select: { name: "json" } },
        value: { type: "rich_text", rich_text: [{ plain_text: '{"a":1}' }] },
        env: { type: "multi_select", multi_select: [{ name: "development" }] }
      }
    }]);
    const rows = await fetchChangedRows({ token: "test", databaseId: "db" }, null);
    expect(rows[0]!.enabled).toBe(false);
    expect(rows[0]!.type).toBe("json");
    expect(rows[0]!.value).toEqual({ a: 1 });
  });

  it("parses flags without type", async () => {
    undo = installNotionFetchMock([{
      id: "p1",
      last_edited_time: "2025-01-01T00:00:00.000Z",
      properties: {
        key: { type: "title", title: [{ plain_text: "test" }] },
        enabled: { type: "checkbox", checkbox: true },
        value: { type: "rich_text", rich_text: [{ plain_text: "generic value" }] },
        env: { type: "multi_select", multi_select: [{ name: "development" }] }
      }
    }]);
    const rows = await fetchChangedRows({ token: "test", databaseId: "db" }, null);
    expect(rows[0]!.enabled).toBe(true);
    expect(rows[0]!.type).toBeUndefined();
    expect(rows[0]!.value).toBe("generic value");
  });
});
