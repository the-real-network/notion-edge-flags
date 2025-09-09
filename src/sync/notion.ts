export type NotionFlagRow = {
  key: string;
  type: "boolean" | "number" | "string" | "json" | "percentRollout" | "ruleSet";
  value: unknown;
  envs: string[];
  lastEditedAt: string;
  pageUrl?: string;
};

export type NotionClientOptions = { token: string; databaseId?: string; databaseName?: string };

type NotionPage = {
  id: string;
  last_edited_time: string;
  properties: Record<string, unknown>;
};

const NOTION_VERSION = "2022-06-28";
import { NotionSchemaError } from "../utils/errors.js";

export async function fetchChangedRows(
  opts: NotionClientOptions,
  sinceIso: string | null
): Promise<NotionFlagRow[]> {
  const rows: NotionFlagRow[] = [];
  const databaseId = await resolveDatabaseId(opts);
  let hasMore = true;
  let startCursor: string | undefined = undefined;
  while (hasMore) {
    const body: Record<string, unknown> = {};
    if (sinceIso) body.filter = { timestamp: "last_edited_time", last_edited_time: { on_or_after: sinceIso } };
    if (startCursor) body.start_cursor = startCursor;
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "Notion-Version": NOTION_VERSION,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`NotionQueryError: ${res.status}`);
    const data = (await res.json()) as { results: NotionPage[]; has_more?: boolean; next_cursor?: string };
    for (const page of data.results) {
      const parsed = parseRow(page);
      rows.push(parsed);
    }
    hasMore = Boolean(data.has_more);
    startCursor = data.next_cursor ?? undefined;
  }
  return rows;
}

async function resolveDatabaseId(opts: NotionClientOptions): Promise<string> {
  if (opts.databaseId && opts.databaseId.length > 0) return opts.databaseId;
  if (!opts.databaseName || opts.databaseName.length === 0) throw new Error("NotionDatabaseIdOrNameRequired");
  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Notion-Version": NOTION_VERSION,
      "content-type": "application/json"
    },
    body: JSON.stringify({ query: opts.databaseName, filter: { property: "object", value: "database" } })
  });
  if (!res.ok) throw new Error(`NotionSearchError: ${res.status}`);
  const data = (await res.json()) as { results: Array<{ id: string; title?: Array<{ plain_text?: string }> }> };
  const nameLower = opts.databaseName.toLowerCase();
  const exact = data.results.find((r) => (r.title?.[0]?.plain_text ?? "").toLowerCase() === nameLower);
  if (exact) return exact.id;
  const first = data.results[0];
  if (first?.id) return first.id;
  throw new Error("NotionDatabaseNotFound");
}

function parseRow(page: NotionPage): NotionFlagRow {
  const props = page.properties as any;
  const pageUrl = `https://www.notion.so/${page.id.replace(/-/g, "")}`;
  const key = readTitle(props.key) || readTitle(props.Key);
  if (!key) throw new NotionSchemaError("Missing required property 'key' (Title)", pageUrl, "Add a Title column named 'key'.");
  const typeName = readSelect(props.type) || readSelect(props.Type) || inferTypeFromValues(props);
  if (!typeName) throw new NotionSchemaError("Missing 'type' (Select)", pageUrl, "Add a Select column 'type' with one of: boolean | number | string | json | percentRollout | ruleSet; or provide a typed value column like 'value_boolean'.");
  const envs = readMultiSelect(props.env) || readMultiSelect(props.Env) || [];
  if (!Array.isArray(envs) || envs.length === 0) throw new NotionSchemaError("Missing 'env' (Multi-select)", pageUrl, "Add an 'env' multi-select with values like development, preview, production.");
  const lastEditedAt = page.last_edited_time;
  const value = readValueByType(typeName, props, pageUrl);
  return { key, type: typeName, value, envs, lastEditedAt, pageUrl } as NotionFlagRow;
}

function readTitle(prop: any): string | null {
  if (!prop || prop.type !== "title" || !Array.isArray(prop.title)) return null;
  const t = prop.title.find((x: any) => typeof x.plain_text === "string");
  return t?.plain_text ?? null;
}

function readSelect(prop: any): NotionFlagRow["type"] | null {
  if (!prop || prop.type !== "select" || typeof prop.select?.name !== "string") return null;
  const n = String(prop.select.name);
  if (n === "boolean" || n === "number" || n === "string" || n === "json" || n === "percentRollout" || n === "ruleSet") return n as any;
  return null;
}

function readMultiSelect(prop: any): string[] | null {
  if (!prop || prop.type !== "multi_select" || !Array.isArray(prop.multi_select)) return null;
  return prop.multi_select.map((x: any) => String(x.name)).filter(Boolean);
}

function readRichTextFirst(prop: any): string | null {
  if (!prop) return null;
  const arr = prop.rich_text;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const t = arr[0]?.plain_text;
  return typeof t === "string" ? t : null;
}

function readValueByType(typeName: NotionFlagRow["type"], props: any, pageUrl: string): unknown {
  if (typeName === "boolean") {
    if (props.value?.type === "checkbox") return Boolean(props.value.checkbox);
    if (props.Value?.type === "checkbox") return Boolean(props.Value.checkbox);
    if (props.value_boolean?.type === "checkbox") return Boolean(props.value_boolean.checkbox);
    throw new NotionSchemaError("Boolean value missing", pageUrl, "Ensure a Checkbox in 'value' or add 'value_boolean' Checkbox.");
  }
  if (typeName === "number") {
    const n = props.value?.number ?? props.Value?.number ?? props.value_number?.number;
    if (typeof n === "number") return n;
    throw new NotionSchemaError("Number value missing", pageUrl, "Ensure a Number in 'value' or add 'value_number'.");
  }
  if (typeName === "string") {
    const s = readRichTextFirst(props.value ?? props.Value ?? props.value_string);
    if (typeof s === "string") return s;
    throw new NotionSchemaError("String value missing", pageUrl, "Ensure first Rich text block in 'value' or add 'value_string'.");
  }
  if (typeName === "json") {
    const s = readRichTextFirst(props.value ?? props.Value ?? props.value_json);
    if (typeof s !== "string") throw new NotionSchemaError("JSON value missing", pageUrl, "Put JSON in 'value' rich text or use 'value_json'.");
    try {
      return JSON.parse(s);
    } catch (e) {
      throw new NotionSchemaError("JSON parse failed", pageUrl, "Ensure valid JSON (first block)." );
    }
  }
  if (typeName === "percentRollout") {
    const n = props.value?.number ?? props.Value?.number ?? props.value_percent?.number;
    const v = typeof n === "number" ? Math.max(0, Math.min(100, Math.floor(n))) : 0;
    return v;
  }
  if (typeName === "ruleSet") {
    const s = readRichTextFirst(props.value ?? props.Value ?? props.value_ruleset);
    if (typeof s !== "string") throw new NotionSchemaError("ruleSet value missing", pageUrl, "Provide JSON in 'value' or 'value_ruleSet' matching { rules: [...] }.");
    try {
      const obj = JSON.parse(s);
      return obj;
    } catch (e) {
      throw new NotionSchemaError("ruleSet parse failed", pageUrl, "Ensure JSON like {\"rules\":[{\"if\":{...},\"then\":true},{\"else\":false}]}.");
    }
  }
  throw new NotionSchemaError("Unsupported type", pageUrl, "Allowed: boolean | number | string | json | percentRollout | ruleSet.");
}

function inferTypeFromValues(props: any): NotionFlagRow["type"] | null {
  if (props?.value_boolean?.type === "checkbox") return "boolean";
  if (props?.value_number?.type === "number" && typeof props.value_number.number === "number") return "number";
  if (props?.value_string?.type === "rich_text" && Array.isArray(props.value_string.rich_text)) return "string";
  if (props?.value_json?.type === "rich_text" && Array.isArray(props.value_json.rich_text)) return "json";
  if (props?.value_percent?.type === "number" && typeof props.value_percent.number === "number") return "percentRollout";
  if (props?.value_ruleset?.type === "rich_text" && Array.isArray(props.value_ruleset.rich_text)) return "ruleSet";
  return null;
}


