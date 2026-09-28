/**
 * 把第一人称预览打成不需要服务器的静态页。
 * 产物在 docs/fishing-play/，脚本和音效用相对路径。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(root, "docs", "fishing-play");
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, "tools/fishing-preview/hud.css"), path.join(out, "hud.css"));

const built = spawnSync(
  "npx",
  [
    "--yes",
    "esbuild@0.25.5",
    path.join(root, "tools/fishing-preview/play.ts"),
    "--bundle",
    "--format=iife",
    "--platform=browser",
    "--target=es2020",
    `--outfile=${path.join(out, "app.js")}`,
    "--legal-comments=none",
  ],
  { cwd: root, encoding: "utf8" },
);
if (built.status !== 0) {
  console.error(built.stdout);
  console.error(built.stderr);
  process.exit(built.status ?? 1);
}
const jsBytes = fs.statSync(path.join(out, "app.js")).size;
const audioDir = path.join(out, "audio");
const audioBytes = fs.readdirSync(audioDir).reduce((sum, name) => sum + fs.statSync(path.join(audioDir, name)).size, 0);
console.log(JSON.stringify({ appJs: jsBytes, audio: audioBytes, out }, null, 2));
