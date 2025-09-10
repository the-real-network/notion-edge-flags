import { bucketPercent } from "./hash";
import type { PredicateMap, RuleSet } from "./types";

export function rolloutPercent(input: { key: string; percent: number; unitId: string }): boolean {
  const p = Math.max(0, Math.min(100, Math.floor(input.percent)));
  if (p <= 0) return false;
  if (p >= 100) return true;
  return bucketPercent(input.key, input.unitId) < p;
}

export function defaultPredicates(): PredicateMap {
  return {
    percent: () => null,
    country: ({ context }) => typeof context.country === "string" ? true : null,
    pathPrefix: ({ context }) => typeof context.path === "string" ? true : null,
    queryParamEquals: ({ context }) => typeof context.query === "object" && context.query !== null ? true : null,
    cookieEquals: ({ context }) => typeof context.cookies === "object" && context.cookies !== null ? true : null
  };
}

export function evaluateFlag(input: {
  key: string;
  flag: { enabled: boolean; value?: unknown; type?: string } | null;
  context?: Record<string, unknown>;
  unitId?: string;
  predicates?: PredicateMap;
}): boolean {
  if (!input.flag?.enabled) return false;
  
  const { type, value } = input.flag;
  const context = input.context ?? {};
  
  if (type === "percent" && typeof value === "number" && input.unitId) {
    return rolloutPercent({ key: input.key, percent: value, unitId: input.unitId });
  }
  
  if (type === "rules" && value) {
    return ruleSet({ key: input.key, value, context, predicates: input.predicates });
  }
  
  return true;
}

export function ruleSet(input: {
  key: string;
  value: unknown;
  context: Record<string, unknown>;
  predicates?: PredicateMap;
}): boolean {
  const rules = normalizeRuleSet(input.value);
  const preds = input.predicates ?? defaultPredicates();
  for (const rule of rules.rules) {
    const thenValue = (rule as any).then;
    const ifClause = (rule as any).if;
    if (ifClause && typeof ifClause === "object") {
      const ok = evaluateIfClause(ifClause as Record<string, unknown>, input.context, preds);
      if (ok === true) return Boolean(thenValue);
    }
    if ((rule as any).else !== undefined) return Boolean((rule as any).else);
  }
  return false;
}

function normalizeRuleSet(value: unknown): RuleSet {
  if (typeof value === "object" && value !== null && Array.isArray((value as any).rules)) return value as RuleSet;
  return { rules: [] };
}

function evaluateIfClause(
  clause: Record<string, unknown>,
  context: Record<string, unknown>,
  preds: PredicateMap
): boolean {
  for (const key of Object.keys(clause)) {
    const predicate = preds[key];
    if (!predicate) return false;
    const res = predicate({ key, value: (clause as any)[key], context });
    if (res !== true) return false;
  }
  return true;
}

