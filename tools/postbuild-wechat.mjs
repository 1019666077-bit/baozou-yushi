import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "build", "wechatgame");
const openDataTarget = path.join(output, "wechat-open-data", "index.js");

if (!fs.existsSync(path.join(output, "game.json"))) {
  throw new Error("WeChat build not found. Build with Cocos Creator first.");
}

fs.mkdirSync(path.dirname(openDataTarget), { recursive: true });
fs.copyFileSync(
  path.join(root, "wechat-open-data", "index.js"),
  openDataTarget,
);
for (const obsolete of [
  path.join(output, "openDataContext", "engine.js"),
  path.join(output, "openDataContext", "render"),
  path.join(output, "open-data"),
]) {
  if (fs.existsSync(obsolete)) {
    fs.rmSync(obsolete, { recursive: true, force: true });
  }
}

const gamePath = path.join(output, "game.json");
const game = JSON.parse(fs.readFileSync(gamePath, "utf8"));
game.deviceOrientation = "landscape";
game.openDataContext = "wechat-open-data";

const projectPath = path.join(output, "project.config.json");
const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
const appid = process.env.WECHAT_APPID;
project.compileType = "game";
project.setting = {
  ...project.setting,
  urlCheck: false,
};
if (appid) {
  if (!/^wx[a-zA-Z0-9]{16}$/.test(appid)) {
    throw new Error("WECHAT_APPID must be wx followed by 16 letters or digits");
  }
  project.appid = appid;
  project.isGameTourist = false;
} else if (!project.appid || project.appid === "wx6ac3f5090a6b99c5") {
  // Cocos default test AppID is not owned by the logged-in developer.
  project.appid = "touristappid";
  project.isGameTourist = true;
}
fs.writeFileSync(projectPath, JSON.stringify(project, null, 2) + "\n");

const splash = path.join(output, "first-screen.js");
if (fs.existsSync(splash)) {
  const text = fs.readFileSync(splash, "utf8");
  fs.writeFileSync(
    splash,
    text
      .replace(/let useLogo = true;/, "let useLogo = false;")
      .replace(/let useDefaultLogo = true;/, "let useDefaultLogo = false;"),
  );
}
for (const name of ["logo.png", "slogan.png"]) {
  const file = path.join(output, name);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

const ISLAND_PACKS = [
  "island_foam_bay",
  "island_prism_reef",
  "island_storm_eye",
];

function ensureSubpackageGameJs(dir, fallback) {
  const gameJs = path.join(dir, "game.js");
  if (fs.existsSync(gameJs)) return;
  const indexJs = path.join(dir, "index.js");
  if (fs.existsSync(indexJs)) {
    fs.copyFileSync(indexJs, gameJs);
    return;
  }
  fs.writeFileSync(
    gameJs,
    fallback ?? "console.log('[baozou] subpackage ready');\n",
  );
}

function addSubpackage(name, root) {
  game.subpackages = game.subpackages ?? [];
  if (!game.subpackages.some((entry) => entry.name === name)) {
    game.subpackages.push({ name, root });
  }
}

function hoistIslandSubpackages() {
  const settingsPath = path.join(output, "src", "settings.json");
  let settings = null;
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    settings.assets = settings.assets ?? {};
    settings.assets.subpackages = settings.assets.subpackages ?? [];
  }
  const hoisted = [];
  for (const name of ISLAND_PACKS) {
    const src = path.join(output, "assets", name);
    const dest = path.join(output, "subpackages", name);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(src, dest);
    }
    if (!fs.existsSync(dest)) continue;
    ensureSubpackageGameJs(dest);
    addSubpackage(name, `subpackages/${name}/`);
    if (settings && !settings.assets.subpackages.includes(name)) {
      settings.assets.subpackages.push(name);
    }
    hoisted.push(name);
  }
  if (settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
  }
  return hoisted;
}

function hoistEngineSubpackage() {
  const src = path.join(output, "cocos-js", "cc.js");
  const destDir = path.join(output, "subpackages", "engine");
  const dest = path.join(destDir, "cc.js");
  if (fs.existsSync(src)) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(src, dest);
  }
  if (!fs.existsSync(dest)) return false;
  ensureSubpackageGameJs(
    destDir,
    "console.log('[baozou] engine subpackage ready');\n",
  );

  const importMapPath = path.join(output, "src", "import-map.js");
  if (fs.existsSync(importMapPath)) {
    const map = fs.readFileSync(importMapPath, "utf8");
    fs.writeFileSync(
      importMapPath,
      map.replace(/\.\/\.\.\/cocos-js\/cc\.js/g, "./../subpackages/engine/cc.js"),
    );
  }

  const gameJsPath = path.join(output, "game.js");
  let gameJs = fs.readFileSync(gameJsPath, "utf8");
  if (!gameJs.includes("loadBaozouEnginePack")) {
    gameJs = gameJs.replace(
      "function onApplicationCreated(application) {",
      `function loadBaozouEnginePack() {
  return new Promise(function (resolve, reject) {
    if (typeof wx === "undefined" || !wx.loadSubpackage) {
      resolve();
      return;
    }
    wx.loadSubpackage({
      name: "engine",
      success: function () { resolve(); },
      fail: function (err) { reject(err); },
    });
  });
}

function onApplicationCreated(application) {`,
    );
    gameJs = gameJs.replace(
      "return System.import('cc').then((module) => {",
      "return loadBaozouEnginePack().then(function () { return System.import('cc'); }).then((module) => {",
    );
    fs.writeFileSync(gameJsPath, gameJs);
  }

  addSubpackage("engine", "subpackages/engine/");
  return true;
}

const islandPacks = hoistIslandSubpackages();
const engineHoisted = hoistEngineSubpackage();
fs.writeFileSync(gamePath, JSON.stringify(game, null, 2) + "\n");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const mainFiles = walk(output).filter((file) => {
  const rel = path.relative(output, file);
  return (
    !rel.startsWith(`subpackages${path.sep}`) &&
    !rel.startsWith(`cocos-js${path.sep}chunks${path.sep}`)
  );
});
const mainBytes = mainFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const totalBytes = walk(output).reduce(
  (sum, file) => sum + fs.statSync(file).size,
  0,
);
const packNames = (game.subpackages ?? []).map((entry) => entry.name);
const report = {
  appid: project.appid,
  orientation: game.deviceOrientation,
  openDataContext: game.openDataContext,
  engineHoisted,
  islandPacks,
  subpackages: packNames,
  mainBytes,
  totalBytes,
  mainUnder4MiB: mainBytes <= 4 * 1024 * 1024,
  totalUnder20MiB: totalBytes <= 20 * 1024 * 1024,
};
fs.writeFileSync(
  path.join(root, "reports", "wechat-build-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
if (!report.mainUnder4MiB || !report.totalUnder20MiB) process.exit(1);
