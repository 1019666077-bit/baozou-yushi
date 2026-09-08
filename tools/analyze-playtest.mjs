import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePlaytest, parseRows } from "./lib/release-rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2] ?? path.join(root, "playtest", "participants.csv");
const rows = parseRows(fs.readFileSync(input, "utf8"), path.extname(input));
const report = analyzePlaytest(rows);

fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(
  path.join(root, "reports", "human-playtest-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
