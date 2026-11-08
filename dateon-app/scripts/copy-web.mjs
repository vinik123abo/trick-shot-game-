// מעתיק את האתר (date-planner) לתיקיית www שהאפליקציה טוענת מתוך המכשיר
import { cpSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..", "date-planner");
const out = join(here, "..", "www");
const SKIP = new Set(["README.md", "screenshot-wide.png", "screenshot-mobile.png", "og.png", "store"]);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src)) if (!SKIP.has(f)) cpSync(join(src, f), join(out, f), { recursive: true });
console.log("copied web app →", out);
