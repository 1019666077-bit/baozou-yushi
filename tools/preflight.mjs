import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const configDir = path.join(root, "assets", "config");
for (const file of walk(configDir).filter((name) => name.endsWith(".json"))) {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${path.relative(root, file)} invalid JSON: ${error.message}`);
  }
}

const mainFiles = walk(path.join(root, "assets")).filter(
  (file) => !file.includes(`${path.sep}bundles${path.sep}`),
);
const mainBytes = mainFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
if (mainBytes > 4 * 1024 * 1024) {
  errors.push(`source main assets exceed 4 MiB: ${mainBytes}`);
}

const forbidden = ["赌博", "老虎机", "轮盘", "枪杀", "血液", "肢解"];
for (const file of mainFiles.filter((name) => /\.(ts|js|json)$/.test(name))) {
  const content = fs.readFileSync(file, "utf8");
  for (const word of forbidden) {
    if (content.includes(word)) {
      errors.push(`${path.relative(root, file)} contains review-risk word: ${word}`);
    }
  }
}

const template = JSON.parse(
  fs.readFileSync(path.join(root, "templates", "game.json"), "utf8"),
);
if (template.deviceOrientation !== "landscape") {
  errors.push("game.json must use landscape orientation");
}
if (!template.openDataContext) errors.push("openDataContext is missing");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  JSON.stringify({
    ok: true,
    mainSourceBytes: mainBytes,
    jsonFiles: walk(configDir).filter((name) => name.endsWith(".json")).length,
  }),
);
