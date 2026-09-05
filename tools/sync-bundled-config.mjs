/**
 * 单一真相源：assets/config/*.json
 *
 * 把该目录同步到：
 * 1. assets/scripts/data/bundledConfig.ts（RuntimeHome 主路径打包）
 * 2. assets/resources/config/*.json（Cocos resources 镜像，供编辑器实验栈）
 *
 * 改数值只改 assets/config/，然后跑本脚本。不要直接改另外两份。
 * `npm run validate` → preflight 会在三份不一致时失败。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function jsonNames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function bundledConfigSource(projectRoot = root) {
  const configDir = path.join(projectRoot, "assets", "config");
  const fish = fs.readFileSync(path.join(configDir, "fish.json"), "utf8").trim();
  const tools = fs.readFileSync(path.join(configDir, "tools.json"), "utf8").trim();
  const islands = fs.readFileSync(path.join(configDir, "islands.json"), "utf8").trim();
  const remote = fs
    .readFileSync(path.join(configDir, "remote-default.json"), "utf8")
    .trim();

  return `import type {
  FishConfig,
  IslandConfig,
  RemoteConfig,
  ToolConfig,
} from "./types";

export const bundledFish = ${fish} as FishConfig[];

export const bundledTools = ${tools} as ToolConfig[];

export const bundledIslands = ${islands} as IslandConfig[];

export const bundledRemote = ${remote} as RemoteConfig;
`;
}

export function listConfigDrift(projectRoot = root) {
  const sourceDir = path.join(projectRoot, "assets", "config");
  const resourcesDir = path.join(projectRoot, "assets", "resources", "config");
  const bundledPath = path.join(
    projectRoot,
    "assets",
    "scripts",
    "data",
    "bundledConfig.ts",
  );
  const errors = [];
  const sourceNames = jsonNames(sourceDir);
  const resourceNames = jsonNames(resourcesDir);
  if (sourceNames.length === 0) {
    errors.push("assets/config 缺少 JSON；单一真相源应在该目录");
    return errors;
  }
  if (sourceNames.join() !== resourceNames.join()) {
    errors.push(
      `assets/config 与 assets/resources/config 文件列表不一致（${sourceNames.join(",")} vs ${resourceNames.join(",") || "无"}）。请跑 node tools/sync-bundled-config.mjs`,
    );
  }
  for (const name of sourceNames) {
    const src = path.join(sourceDir, name);
    const dest = path.join(resourcesDir, name);
    if (!fs.existsSync(dest)) {
      errors.push(
        `缺少 assets/resources/config/${name}。请跑 node tools/sync-bundled-config.mjs`,
      );
      continue;
    }
    if (JSON.stringify(readJson(src)) !== JSON.stringify(readJson(dest))) {
      errors.push(
        `assets/config/${name} 与 assets/resources/config/${name} 内容不一致。请跑 node tools/sync-bundled-config.mjs`,
      );
    }
  }
  if (!fs.existsSync(bundledPath)) {
    errors.push("缺少 assets/scripts/data/bundledConfig.ts。请跑 node tools/sync-bundled-config.mjs");
    return errors;
  }
  const expected = bundledConfigSource(projectRoot);
  const actual = fs.readFileSync(bundledPath, "utf8");
  if (actual !== expected) {
    errors.push(
      "assets/scripts/data/bundledConfig.ts 与 assets/config 不一致。请跑 node tools/sync-bundled-config.mjs",
    );
  }
  return errors;
}

export function syncBundledConfig(projectRoot = root) {
  const sourceDir = path.join(projectRoot, "assets", "config");
  const resourcesDir = path.join(projectRoot, "assets", "resources", "config");
  fs.mkdirSync(resourcesDir, { recursive: true });
  for (const name of jsonNames(sourceDir)) {
    fs.copyFileSync(path.join(sourceDir, name), path.join(resourcesDir, name));
  }
  fs.writeFileSync(
    path.join(projectRoot, "assets", "scripts", "data", "bundledConfig.ts"),
    bundledConfigSource(projectRoot),
  );
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  syncBundledConfig(root);
  console.log(
    `synced ${jsonNames(path.join(root, "assets", "config")).join(", ")} → bundledConfig.ts and assets/resources/config/`,
  );
}
