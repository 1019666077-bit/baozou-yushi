import fs from "node:fs";
import path from "node:path";
import { analyzeCrazyGames, parseRows } from "./lib/release-rules.mjs";

const input = process.argv[2] ?? "launch-data/crazygames-basic-metrics.template.csv";
try {
  const text = fs.readFileSync(input, "utf8");
  const report = analyzeCrazyGames(parseRows(text, path.extname(input)));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  console.error(`CrazyGames metrics failed: ${error.message}`);
  process.exitCode = 2;
}
