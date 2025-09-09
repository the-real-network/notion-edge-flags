import type { EnvironmentName } from "../core/types";

export function resolveEnvironment(explicit?: EnvironmentName | null): EnvironmentName {
  if (explicit && explicit.length > 0) return explicit;
  const vercelEnv = process.env.VERCEL_ENV as EnvironmentName | undefined;
  if (vercelEnv && vercelEnv.length > 0) return vercelEnv as EnvironmentName;
  const nodeEnv = process.env.NODE_ENV as EnvironmentName | undefined;
  if (nodeEnv && nodeEnv.length > 0) return mapNodeEnv(nodeEnv);
  return "production";
}

function mapNodeEnv(env: EnvironmentName): EnvironmentName {
  if (env === "development") return "development";
  if (env === "test") return "test";
  if (env === "production") return "production";
  return env;
}

export function formatNamespacedKey(namespace: string, env: EnvironmentName, key: string): string {
  return `${namespace}__${env}__${key}`;
}

