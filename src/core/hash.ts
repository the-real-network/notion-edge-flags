export function stableHash(input: string): number {
  let hash = 5381 >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

export function bucketPercent(key: string, unitId: string): number {
  const h = stableHash(`${key}::${unitId}`);
  return h % 100;
}

