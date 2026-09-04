import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csv = fs.readFileSync(
  path.join(root, "playtest", "participants.csv"),
  "utf8",
);
const [header, ...lines] = csv.trim().split(/\r?\n/);
const columns = header.split(",");
const rows = lines
  .map((line) =>
    Object.fromEntries(line.split(",").map((value, index) => [columns[index], value])),
  )
  .filter((row) => row.first_capture_seconds);

if (rows.length < 20) {
  console.error(`Need at least 20 completed human rows; found ${rows.length}.`);
  process.exit(2);
}

const boolRate = (key) =>
  rows.filter((row) => /^(1|true|yes|y)$/i.test(row[key])).length / rows.length;
const captures = rows
  .map((row) => Number(row.first_capture_seconds))
  .sort((a, b) => a - b);
const median = captures[Math.floor(captures.length / 2)];
const report = {
  participants: rows.length,
  firstCaptureMedianSeconds: median,
  tutorialCompletionRate: boolRate("tutorial_finished"),
  thirdRunReachRate: boolRate("reached_run_3"),
  understoodValueRuleRate: boolRate("understood_value_rule"),
  replayIntentRate: boolRate("replay_intent"),
};
report.passed =
  median <= 60 &&
  report.tutorialCompletionRate >= 0.7 &&
  report.thirdRunReachRate >= 0.4 &&
  report.understoodValueRuleRate >= 0.6;

fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(
  path.join(root, "reports", "human-playtest-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
