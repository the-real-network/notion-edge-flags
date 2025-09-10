#!/usr/bin/env node
import { cmdInit } from "./commands/init.ts";
import { cmdSync } from "./commands/sync.ts";
import { cmdFlip } from "./commands/flip.ts";
import { cmdValidate } from "./commands/validate.ts";
import { cmdExport } from "./commands/export.ts";
import { cmdDiff } from "./commands/diff.ts";

async function main() {
  const [, , cmd, ...rest] = process.argv;
  
  try {
    switch (cmd) {
      case "init": return await cmdInit();
      case "sync": return await cmdSync(rest);
      case "flip": return await cmdFlip(rest);
      case "validate": return await cmdValidate(rest);
      case "export": return await cmdExport(rest);
      case "diff": return await cmdDiff(rest);
      default:
        process.stdout.write("notion-edge-flags <init|sync|flip|validate|diff|export>\n");
    }
  } catch (error) {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
    process.exit(1);
  }
}

main();