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
        process.stdout.write(`notion-edge-flags <command>

Commands:
  init      Create Notion database with sample feature flags
  sync      Sync flags from Notion to Vercel Edge Config
  flip      Toggle flag enabled state or update values
  validate  Check Notion database connection and flag count
  diff      Show differences between Notion and Edge Config
  export    Export all flags from Edge Config as JSON

Examples:
  notion-edge-flags init
  notion-edge-flags sync --env development --once
  notion-edge-flags flip --env development --key myFlag
  notion-edge-flags flip --env development --key myFlag --enabled false
  notion-edge-flags flip --env development --key myFlag --value "new config"
  notion-edge-flags validate --env development
`);
    }
  } catch (error) {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
    process.exit(1);
  }
}

main();