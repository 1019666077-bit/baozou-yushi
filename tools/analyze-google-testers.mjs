import fs from "node:fs";
import path from "node:path";
import { analyzeGoogleTesters, parseRows } from "./lib/release-rules.mjs";

const input = process.argv[2] ?? "launch-data/google-closed-testers.template.csv";
const asOf = process.argv[3] ?? new Date().toISOString().slice(0, 10);
try {
  const text = fs.readFileSync(input, "utf8");
  const report = analyzeGoogleTesters(parseRows(text, path.extname(input)), asOf);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  console.error(`Google tester tracking failed: ${error.message}`);
  process.exitCode = 2;
}
