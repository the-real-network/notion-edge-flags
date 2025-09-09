import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { fetchChangedRows } from "../src/sync/notion";
import { installNotionFetchMock } from "./_mocks/mock-notion";

let undo: (() => void) | null = null;

afterEach(() => {
  undo?.();
  undo = null;
});

describe("notion", () => {
  it("parses boolean flags", async () => {
    undo = installNotionFetchMock([{
      id: "p1",
      last_edited_time: "2025-01-01T00:00:00.000Z",
      properties: {
        key: { type: "title", title: [{ plain_text: "test" }] },
        type: { type: "select", select: { name: "boolean" } },
        value_boolean: { type: "checkbox", checkbox: true },
        env: { type: "multi_select", multi_select: [{ name: "development" }] }
      }
    }]);
    const rows = await fetchChangedRows({ token: "test", databaseId: "db" }, null);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.key).toBe("test");
    expect(rows[0]!.type).toBe("boolean");
    expect(rows[0]!.value).toBe(true);
    expect(rows[0]!.envs).toEqual(["development"]);
  });

  it("parses number flags", async () => {
    undo = installNotionFetchMock([{
      id: "p1",
      last_edited_time: "2025-01-01T00:00:00.000Z",
      properties: {
        key: { type: "title", title: [{ plain_text: "test" }] },
        type: { type: "select", select: { name: "number" } },
        value_number: { type: "number", number: 42 },
        env: { type: "multi_select", multi_select: [{ name: "production" }] }
      }
    }]);
    const rows = await fetchChangedRows({ token: "test", databaseId: "db" }, null);
    expect(rows[0]!.type).toBe("number");
    expect(rows[0]!.value).toBe(42);
  });

  it("parses json flags", async () => {
    undo = installNotionFetchMock([{
      id: "p1",
      last_edited_time: "2025-01-01T00:00:00.000Z",
      properties: {
        key: { type: "title", title: [{ plain_text: "test" }] },
        type: { type: "select", select: { name: "json" } },
        value_json: { type: "rich_text", rich_text: [{ plain_text: '{"a":1}' }] },
        env: { type: "multi_select", multi_select: [{ name: "development" }] }
      }
    }]);
    const rows = await fetchChangedRows({ token: "test", databaseId: "db" }, null);
    expect(rows[0]!.type).toBe("json");
    expect(rows[0]!.value).toEqual({ a: 1 });
  });

  it("infers type from value columns", async () => {
    undo = installNotionFetchMock([{
      id: "p1",
      last_edited_time: "2025-01-01T00:00:00.000Z",
      properties: {
        key: { type: "title", title: [{ plain_text: "test" }] },
        value_string: { type: "rich_text", rich_text: [{ plain_text: "hello" }] },
        env: { type: "multi_select", multi_select: [{ name: "development" }] }
      }
    }]);
    const rows = await fetchChangedRows({ token: "test", databaseId: "db" }, null);
    expect(rows[0]!.type).toBe("string");
    expect(rows[0]!.value).toBe("hello");
  });
});
