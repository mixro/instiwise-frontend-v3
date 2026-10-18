// Generates src/lib/contract/schema.d.ts from the workspace contract, or with
// --check fails when the committed file is out of date. Line endings are ignored,
// so a Windows checkout (core.autocrlf) does not look stale.
//
//   node scripts/api-types.mjs          npm run api:generate
//   node scripts/api-types.mjs --check  npm run api:check

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contract = resolve(root, "../workspace/contracts/openapi.yaml");
const target = join(root, "src/lib/contract/schema.d.ts");
const cli = join(
  dirname(createRequire(import.meta.url).resolve("openapi-typescript/package.json")),
  "bin/cli.js",
);
const check = process.argv.includes("--check");

if (!existsSync(contract)) {
  console.error(`Contract not found at ${contract}. Clone the workspace repo next to frontend/.`);
  process.exit(1);
}

const generate = (output) =>
  execFileSync(process.execPath, [cli, contract, "-o", output], { stdio: "ignore" });

if (!check) {
  generate(target);
  console.log(`Generated ${target}`);
  process.exit(0);
}

const scratch = mkdtempSync(join(tmpdir(), "instiwise-api-"));
try {
  const fresh = join(scratch, "schema.d.ts");
  generate(fresh);
  const normalize = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (!existsSync(target) || normalize(fresh) !== normalize(target)) {
    console.error("src/lib/contract/schema.d.ts is out of date. Run npm run api:generate.");
    process.exit(1);
  }
  console.log("API types match the contract.");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
