import { createFlagsClient } from "../core/client.js";

export async function resolveFlags(keys: string[], ctx?: { cookies?: () => string | undefined }) {
  const client = createFlagsClient({});
  const values = await client.getMany(keys);
  return values;
}

export const dynamic = "force-dynamic";

