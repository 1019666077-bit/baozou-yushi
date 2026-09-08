import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];
const supported = new Set(["web", "crazygames", "android"]);
if (!supported.has(target)) {
  console.error("usage: node tools/platform-preflight.mjs <web|crazygames|android>");
  process.exit(2);
}

const errors = [];
const WEB_INITIAL_BUDGET = 20 * 1024 * 1024;
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const parse = (relative) => {
  try {
    return JSON.parse(read(relative));
  } catch (error) {
    errors.push(`${relative}: ${error.message}`);
    return {};
  }
};

const web = parse("build-config.web.json");
if (target === "web" || target === "crazygames") {
  if (web.platform !== "web-desktop") errors.push("web platform must be web-desktop");
  if (web.platformOptions?.basicLaunch !== true) {
    errors.push("web Basic Launch flag must be enabled");
  }
  if (web.platformOptions?.crazyGames?.adsEnabled !== false) {
    errors.push("CrazyGames Basic Launch ads must be explicitly disabled");
  }
  const bootstrap = read("assets/scripts/platform/CocosPlatformBootstrap.ts");
  if (!bootstrap.includes("export const BASIC_LAUNCH = true")) {
    errors.push("Basic Launch compile-time ad gate is not enabled");
  }
  if (!fs.existsSync(path.join(root, "docs", "WEB_CRAZYGAMES_SETUP.md"))) {
    errors.push("docs/WEB_CRAZYGAMES_SETUP.md is missing");
  }
  for (const required of ["THIRD_PARTY_ASSETS.md", "docs/STORE_ASSET_CHECKLIST.md"]) {
    if (!fs.existsSync(path.join(root, required))) errors.push(`${required} is missing`);
  }
}

if (target === "crazygames") {
  const adapter = read("assets/scripts/platform/CrazyGamesAdapter.ts");
  if (!adapter.includes("CrazyGames HTML5 SDK is unavailable")) {
    errors.push("CrazyGames adapter must fail safely when the official SDK is absent");
  }
  if (!adapter.includes("gameplayStart") || !adapter.includes("gameplayStop")) {
    errors.push("CrazyGames gameplay lifecycle integration is missing");
  }
}

if (target === "android") {
  const android = parse("build-config.android.json");
  if (android.platform !== "android") errors.push("android platform must be android");
  if (android.platformOptions?.localSaveOnly !== true) {
    errors.push("Android Basic Launch must declare localSaveOnly");
  }
  if (android.platformOptions?.adsEnabled !== false) {
    errors.push("Android Basic Launch ads must be explicitly disabled");
  }
  const adapter = read("assets/scripts/platform/AndroidAdapter.ts");
  if (!adapter.includes("__BAOZOU_ANDROID_BRIDGE__")) {
    errors.push("Android JSB bridge contract is missing");
  }
  if (/\bany\b/.test(adapter)) errors.push("Android adapter must not use any");
  if (!fs.existsSync(path.join(root, "docs", "ANDROID_GOOGLE_PLAY_SETUP.md"))) {
    errors.push("docs/ANDROID_GOOGLE_PLAY_SETUP.md is missing");
  }
  if (!adapter.includes("queryProducts") || !adapter.includes("acknowledge")) {
    errors.push("Android Billing state machine contract is incomplete");
  }
  if (!fs.existsSync(path.join(root, "cloudfunctions", "verifyGooglePlay", "index.js"))) {
    errors.push("deny-by-default Google Play receipt verifier is missing");
  }
}

if (!fs.existsSync(path.join(root, "docs", "MONETIZATION_SETUP.md"))) {
  errors.push("docs/MONETIZATION_SETUP.md is missing");
}

const scriptsRoot = path.join(root, "assets", "scripts");
for (const file of walk(scriptsRoot).filter((name) => name.endsWith(".ts"))) {
  const base = path.basename(file);
  if (base.startsWith("Wechat")) continue;
  if (/\bwx(?:\.|\?\.|\s*:)/.test(fs.readFileSync(file, "utf8"))) {
    errors.push(`${path.relative(root, file)} contains direct wx access`);
  }
}

const buildCandidates = [
  path.join(root, "build", "web-desktop"),
  path.join(root, "build", "web-mobile"),
];
const built = buildCandidates.find((dir) => fs.existsSync(dir));
const builtBytes = built
  ? walk(built).reduce((sum, file) => sum + fs.statSync(file).size, 0)
  : null;
if (builtBytes !== null && builtBytes >= WEB_INITIAL_BUDGET) {
  errors.push(`web build exceeds initial download budget: ${builtBytes} >= ${WEB_INITIAL_BUDGET}`);
}

const releaseDir = path.join(root, "release");
if (fs.existsSync(releaseDir)) {
  for (const file of walk(releaseDir)) {
    if (fs.readFileSync(file).includes(Buffer.from("DRAFT"))) {
      errors.push(`${path.relative(root, file)} contains forbidden DRAFT content`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  target,
  basicLaunchAds: false,
  webInitialBudgetBytes: WEB_INITIAL_BUDGET,
  measuredBuildBytes: builtBytes,
  buildMeasured: builtBytes !== null,
}));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
