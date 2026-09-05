/**
 * Creator 预览 / web-desktop / 4 张截图的共用探测与清单。
 * 云端默认没有 Creator；探测失败必须说「缺 Creator」，不能假装已出包或已有真机图。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const CREATOR_VERSION = "3.8.8";
export const BOOT_SCENE = "assets/scenes/Boot.scene";
export const WEB_DESKTOP_REL = path.join("build", "web-desktop");
export const CREATOR_SHOTS_REL = path.join("docs", "stage3d", "creator-shots");
export const EXPECT_DIR_REL = path.join("docs", "stage3d");

export const EXPECT_SHOTS = [
  {
    file: "expect_harbor_composition.jpg",
    title: "港口层次",
    note: "期望构图示意图，不是 Creator / 真机",
  },
  {
    file: "expect_fish_five_parts.jpg",
    title: "鱼 5 件套",
    note: "期望构图示意图，不是 Creator / 真机",
  },
  {
    file: "expect_cast_flop_cam.jpg",
    title: "抛竿跟镜 / 翻扑",
    note: "期望构图示意图，不是 Creator / 真机",
  },
];

export const CREATOR_SHOTS = [
  {
    id: "harbor-wide",
    file: "01_harbor_wide.png",
    title: "港口全景",
    when: "Boot.scene 预览后停在港口，不要点出海",
    see: "透视近/中/远海 + 矮波；左侧码头市集；远处三岛分层；日落侧光；下方 2D 主橙「开始教学」",
  },
  {
    id: "dock-near",
    file: "02_dock_near.png",
    title: "码头近景",
    when: "仍在港口，把预览窗拉近左侧码头（或站近再截）",
    see: "栏杆、台阶、青箱；棚架立柱和金幌；停泊小船；能看清木头厚度，不是一条色带",
  },
  {
    id: "bayfin-weak",
    file: "03_bayfin_weak.png",
    title: "湾鳍弱点",
    when: "点「开始教学」出海，抛竿打中后停在侧脸",
    see: "鱼是 5 件低模：身 / 浅色脸 / 鳞片色块 / 尾 / 背上大金弱点（比上一 tip 更大，可轻脉冲）",
  },
  {
    id: "flop-smash",
    file: "04_flop_smash.png",
    title: "翻扑砸甲板",
    when: "弱点命中后的翻扑最高点，或砸到甲板的瞬间",
    see: "鱼沿抛物线飞向码头；镜头略抬；砸甲板时鱼身短压扁。不要截 2D 代理顶替",
  },
];

export function repoRoot(from = import.meta.url) {
  return path.resolve(path.dirname(fileURLToPath(from)), "..");
}

export function exists(file) {
  return typeof file === "string" && file.length > 0 && fs.existsSync(file);
}

function expandHome(file) {
  if (!file) return file;
  if (file.startsWith("~")) return path.join(os.homedir(), file.slice(1));
  return file;
}

function which(bin) {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", [bin], {
    encoding: "utf8",
  });
  if (result.status !== 0) return "";
  const line = (result.stdout ?? "").split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return line && exists(line) ? line : "";
}

export function creatorCandidates() {
  const home = os.homedir();
  const env = [
    process.env.COCOS_CREATOR,
    process.env.CREATOR_BIN,
    process.env.COCOS_CREATOR_BIN,
  ]
    .filter(Boolean)
    .map(expandHome);
  const mac = [
    `/Applications/Cocos/Creator/${CREATOR_VERSION}/CocosCreator.app/Contents/MacOS/CocosCreator`,
    "/Applications/Cocos/Creator/3.8.7/CocosCreator.app/Contents/MacOS/CocosCreator",
    "/Applications/CocosCreator.app/Contents/MacOS/CocosCreator",
    path.join(
      home,
      "Applications",
      "Cocos",
      "Creator",
      CREATOR_VERSION,
      "CocosCreator.app",
      "Contents",
      "MacOS",
      "CocosCreator",
    ),
  ];
  const win = [
    `C:\\CocosCreator\\CocosCreator.exe`,
    `C:\\ProgramData\\cocos\\editors\\Creator\\${CREATOR_VERSION}\\CocosCreator.exe`,
    `C:\\Program Files\\Cocos\\Creator\\${CREATOR_VERSION}\\CocosCreator.exe`,
    `C:\\CocosDashboard\\resources\\app.asar.unpacked\\CocosCreator.exe`,
    path.join(
      process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local"),
      "Programs",
      "Cocos",
      "Creator",
      CREATOR_VERSION,
      "CocosCreator.exe",
    ),
  ];
  const linux = [
    "/opt/CocosCreator/CocosCreator",
    "/opt/Cocos/Creator/CocosCreator",
    path.join(home, "CocosCreator", "CocosCreator"),
    path.join(home, "Cocos", "Creator", CREATOR_VERSION, "CocosCreator"),
  ];
  const pathBins = ["CocosCreator", "CocosCreator.exe"]
    .map(which)
    .filter(Boolean);
  return [...new Set([...env, ...mac, ...win, ...linux, ...pathBins])];
}

export function findCreator() {
  return creatorCandidates().find((file) => exists(file)) ?? "";
}

export function webDesktopIndex(root) {
  return path.join(root, WEB_DESKTOP_REL, "index.html");
}

export function hasWebDesktop(root) {
  return exists(webDesktopIndex(root));
}

export function listCreatorShotFiles(root) {
  const dir = path.join(root, CREATOR_SHOTS_REL);
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort();
}

export function missingCreatorShots(root) {
  const have = new Set(listCreatorShotFiles(root).map((name) => name.toLowerCase()));
  return CREATOR_SHOTS.filter((shot) => !have.has(shot.file.toLowerCase()));
}

export function probeCreator(root = repoRoot()) {
  const creator = findCreator();
  const shots = listCreatorShotFiles(root);
  return {
    ok: Boolean(creator),
    creator: creator || null,
    versionWanted: CREATOR_VERSION,
    webDesktop: hasWebDesktop(root),
    webDesktopPath: hasWebDesktop(root) ? path.join(root, WEB_DESKTOP_REL) : null,
    creatorShots: shots,
    creatorShotCount: shots.length,
    wantedShotCount: CREATOR_SHOTS.length,
    missingShots: missingCreatorShots(root).map((shot) => shot.file),
    proxyOnly: !creator,
    note: creator
      ? `已找到 Creator：${creator}`
      : `缺 Creator：未找到 Cocos Creator ${CREATOR_VERSION} 可执行文件。云端/本机无 Creator 时不能出 web-desktop，也不能当 3D 实机证据。`,
  };
}

export function previewSteps() {
  return [
    `用 Creator ${CREATOR_VERSION} 打开本仓库根目录（不要打开子文件夹）。`,
    `资源管理器打开 ${BOOT_SCENE}。`,
    "点工具栏播放预览，或 Windows Ctrl+P / macOS Cmd+P。",
    "应进入港口 RuntimeHome。装配见 docs/SCENE_SETUP.md。",
    `按 4 张清单截图，文件名对齐，丢进 ${CREATOR_SHOTS_REL}/（不要改名成 expect_*.jpg）。`,
  ];
}

export function formatShotChecklist({ root = repoRoot(), json = false } = {}) {
  const probe = probeCreator(root);
  if (json) {
    return JSON.stringify(
      {
        disclaimer: "期望构图 ≠ Creator/真机。docs/stage3d/expect_*.jpg 是示意图，不能顶替 creator-shots。",
        preview: previewSteps(),
        shots: CREATOR_SHOTS,
        expect: EXPECT_SHOTS,
        dropDir: CREATOR_SHOTS_REL,
        webDesktop: WEB_DESKTOP_REL,
        probe,
      },
      null,
      2,
    );
  }

  const lines = [
    "Creator 4 张截图清单（给人看的）",
    "",
    "期望构图 ≠ Creator/真机。",
    `示意图在 ${EXPECT_DIR_REL}/expect_*.jpg，标题/水印已写「示意图 · 非 Creator 实机」。`,
    "那三张只说明应对齐什么层次，不能当 3D 实机证据，也不能拷进 creator-shots 冒充。",
    "",
    "最短预览：",
    ...previewSteps().map((step, i) => `  ${i + 1}. ${step}`),
    "",
    `截图丢这里：${CREATOR_SHOTS_REL}/`,
    "建议文件名（不要伪造 png；没有 Creator 就留空）：",
    "",
  ];
  for (const [i, shot] of CREATOR_SHOTS.entries()) {
    lines.push(`${i + 1}) ${shot.file}  ${shot.title}`);
    lines.push(`   何时：${shot.when}`);
    lines.push(`   应看到：${shot.see}`);
    lines.push("");
  }
  lines.push(
    `当前 ${CREATOR_SHOTS_REL}：${probe.creatorShotCount}/${CREATOR_SHOTS.length} 张图` +
      (probe.creatorShotCount === 0
        ? "（空是预期：云端无 Creator，未伪造 png）"
        : `（已有 ${probe.creatorShots.join(", ")}）`),
  );
  if (probe.missingShots.length) {
    lines.push(`还缺：${probe.missingShots.join(", ")}`);
  }
  lines.push("");
  lines.push(probe.note);
  if (probe.webDesktop) {
    lines.push(`本机已有 web-desktop：${probe.webDesktopPath}`);
    lines.push("预览：npx --yes serve build/web-desktop -l 8765");
  } else {
    lines.push("本环境没有 build/web-desktop/index.html，不要声称已出包。");
    lines.push("有 Creator 时：npm run try:web-desktop  或编辑器 项目→构建发布→web-desktop");
  }
  lines.push("");
  lines.push("无 Creator 时代验 CTA：node tools/first-run-preview/serve.mjs → http://127.0.0.1:8766/");
  lines.push("2D/辅助代理 ≠ Creator 3D。代理分不能坐实 3D 估分。");
  return lines.join("\n");
}
