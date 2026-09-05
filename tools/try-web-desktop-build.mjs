/**
 * 探测 Cocos Creator 并尝试命令行打 web-desktop。
 * 有 Creator：打印预览/截图引导，并调用出包。
 * 无 Creator：exit 2，文案明确「缺 Creator」，不假装已出包。
 *
 *   node tools/try-web-desktop-build.mjs            # 缺则 exit 2
 *   node tools/try-web-desktop-build.mjs --probe-only
 *   COCOS_CREATOR=/path/to/CocosCreator node tools/try-web-desktop-build.mjs
 */
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  CREATOR_SHOTS_REL,
  creatorCandidates,
  formatShotChecklist,
  hasWebDesktop,
  previewSteps,
  probeCreator,
  repoRoot,
  webDesktopIndex,
} from "./creator-preview.mjs";

const root = repoRoot(import.meta.url);
const probeOnly = process.argv.includes("--probe-only");
const probe = probeCreator(root);

function printHuman(report) {
  console.log(report.ok ? `已找到 Creator：${report.creator}` : report.note);
  console.log(`探测候选 ${creatorCandidates().length} 条（含环境变量 COCOS_CREATOR / CREATOR_BIN / COCOS_CREATOR_BIN、常见安装路径、PATH）。`);
  if (!report.ok) {
    console.log("本机若已安装，请导出：");
    console.log("  export COCOS_CREATOR=/绝对路径/CocosCreator");
    console.log("没有 Creator 时不要声称已有 web-desktop 或真机截图。");
    console.log("代验 CTA：node tools/first-run-preview/serve.mjs  （2D/辅助 ≠ Creator 3D）");
    console.log("截图清单：node tools/stage3d-shot-checklist.mjs");
    return;
  }
  console.log("编辑器预览比出包更快（3D 证据优先走这条）：");
  for (const [i, step] of previewSteps().entries()) {
    console.log(`  ${i + 1}. ${step}`);
  }
  console.log(`截图丢：${CREATOR_SHOTS_REL}/`);
}

printHuman(probe);

if (probeOnly) {
  console.log(JSON.stringify({ ...probe, mode: "probe-only" }, null, 2));
  process.exit(0);
}

if (!probe.ok) {
  console.error(
    JSON.stringify(
      {
        ...probe,
        missingCreator: true,
        exit: 2,
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const configPath = path.join(root, "build-config.web.json");
const args = ["--project", root, "--build", `configPath=${configPath}`];
console.log(`try web-desktop: ${probe.creator} ${args.join(" ")}`);
const result = spawnSync(probe.creator, args, { encoding: "utf8" });
const built = result.status === 0 && hasWebDesktop(root);
const report = {
  ...probe,
  ok: built,
  build: built,
  webDesktop: built,
  webDesktopPath: built ? path.dirname(webDesktopIndex(root)) : null,
  note: built
    ? `web-desktop 已写出 ${path.dirname(webDesktopIndex(root))}`
    : `Creator 构建失败 status=${result.status}`,
};

console.log(
  JSON.stringify(
    {
      ...report,
      stdoutTail: (result.stdout ?? "").slice(-400),
      stderrTail: (result.stderr ?? "").slice(-400),
    },
    null,
    2,
  ),
);

if (built) {
  console.log("出包成功。浏览器预览：");
  console.log("  npx --yes serve build/web-desktop -l 8765");
  console.log(formatShotChecklist({ root }));
  process.exit(0);
}

process.exit(1);
