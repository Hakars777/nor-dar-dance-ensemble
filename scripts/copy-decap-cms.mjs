import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const target = join(root, "public", "admin", "decap-cms.js");

const candidates = [
  join(root, "node_modules", "decap-cms-app", "dist", "decap-cms-app.js"),
  join(root, "node_modules", "decap-cms", "dist", "decap-cms.js")
];

const source = candidates.find((candidate) => existsSync(candidate));

if (!source) {
  console.warn("Decap CMS bundle was not found in node_modules. The admin bundle will be copied after dependencies are installed.");
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Copied Decap CMS bundle to ${target}`);
