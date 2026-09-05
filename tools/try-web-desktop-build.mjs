/**
 * 尝试命令行打 web-desktop。
 * 本环境 / CI 默认没有 Cocos Creator 3.8.8，找不到就清晰失败，不假装已出包。
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function exists(file) {
  return !!file && fs.existsSync(file);
}

function findCreator() {
  const env = process.env.COCOS_CREATOR ?? process.env.CREATOR_BIN;
  if (exists(env)) return env;
  const candidates = [
    "/opt/CocosCreator/CocosCreator",
    "/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator",
    "C:\\CocosCreator\\CocosCreator.exe",
    "C:\\ProgramData\\cocos\\editors\\Creator\\3.8.8\\CocosCreator.exe",
  ];
  return candidates.find((file) => exists(file));
}

const creator = findCreator();
const report = {
  ok: false,
  creator: creator ?? null,
  build: exists(path.join(root, "build", "web-desktop", "index.html")),
  proxy: true,
  note: "",
};

if (!creator) {
  report.note =
    "未找到 Cocos Creator 3.8.8 可执行文件。云端/本机无 Creator 时不能命令行出 web-desktop。请用本机编辑器打开仓库，按 docs/LOCAL_PREVIEW.md 构建。代验请用 node tools/first-run-preview/serve.mjs（非实机证据）。";
  console.error(JSON.stringify(report, null, 2));
  process.exit(2);
}

const args = [
  "--project",
  root,
  "--build",
  `configPath=${path.join(root, "build-config.web.json")}`,
];
console.log(`try web-desktop: ${creator} ${args.join(" ")}`);
const result = spawnSync(creator, args, { encoding: "utf8" });
report.ok = result.status === 0 && exists(path.join(root, "build", "web-desktop", "index.html"));
report.note = report.ok
  ? "web-desktop 已写出 build/web-desktop/"
  : `Creator 构建失败 status=${result.status}\n${result.stdout}\n${result.stderr}`;
console.log(JSON.stringify({ ...report, stdoutTail: (result.stdout ?? "").slice(-400) }, null, 2));
process.exit(report.ok ? 0 : 1);
