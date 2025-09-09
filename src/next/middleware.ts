import { createFlagsClient } from "../core/client.js";

export function createEdgeMiddlewareClient(opts?: Parameters<typeof createFlagsClient>[0]) {
  return createFlagsClient(opts ?? {});
}

