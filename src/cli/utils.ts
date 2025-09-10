import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function getEnv(name: string, required = true): string {
  const v = process.env[name];
  if (!v && required) throw new Error(`Missing env ${name}`);
  return v ?? "";
}

export async function getDefaultTeamId(apiToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json() as { user?: { defaultTeamId?: string } };
    return data.user?.defaultTeamId ?? null;
  } catch {
    return null;
  }
}

export function loadDotenv(): void {
  const cwd = process.cwd();
  const candidates = [
    ".env.local",
    ".env.development.local",
    ".env.development",
    ".env"
  ];
  for (const file of candidates) {
    const p = join(cwd, file);
    if (!existsSync(p)) continue;
    try {
      const txt = readFileSync(p, "utf8");
      for (const line of txt.split(/\r?\n/)) {
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        const raw = line.slice(eq + 1).trim();
        const val = raw.replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    } catch {}
  }
}

export async function promptInput(question: string): Promise<string> {
  process.stdout.write(question + " ");
  const decoder = new TextDecoder();
  const input = await new Promise<string>((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    let buffer = "";
    const onData = (chunk: Buffer) => {
      const char = decoder.decode(chunk);
      if (char === "\r" || char === "\n") {
        stdin.off("data", onData);
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write("\n");
        resolve(buffer.trim());
      } else if (char === "\u0003") {
        process.exit(0);
      } else if (char === "\u007f") {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else if (char >= " ") {
        buffer += char;
        process.stdout.write(char);
      }
    };
    stdin.on("data", onData);
  });
  return input;
}
