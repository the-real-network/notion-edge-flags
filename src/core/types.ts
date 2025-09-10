export type EnvironmentName = "production" | "preview" | "development" | "test" | string;

export type FeatureFlag = {
  enabled: boolean;
  value?: unknown;
  type?: "string" | "number" | "json" | "percent" | "rules";
};

export type FlagsClientOptions = {
  connection?: EdgeConfigConnection | null;
  env?: EnvironmentName;
  namespace?: string;
};

export type EdgeConfigConnection = {
  getItem: (key: string) => Promise<unknown>;
  getMany: (keys: string[]) => Promise<Record<string, unknown>>;
};

export type RulePredicate = (input: {
  key: string;
  value: unknown;
  context: Record<string, unknown>;
}) => boolean | null;

export type PredicateMap = Record<string, RulePredicate>;

export type RuleSet = {
  rules: Array<Record<string, unknown>>;
};

