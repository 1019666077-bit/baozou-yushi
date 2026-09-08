/**
 * 打印 Creator 4 张截图清单（给人看的）。
 * 不生成、不伪造 png。云端 0/4 是预期。
 *
 *   node tools/stage3d-shot-checklist.mjs
 *   node tools/stage3d-shot-checklist.mjs --json
 */
import { formatShotChecklist, repoRoot } from "./creator-preview.mjs";

const root = repoRoot(import.meta.url);
const json = process.argv.includes("--json");
console.log(formatShotChecklist({ root, json }));
