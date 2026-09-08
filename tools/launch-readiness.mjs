import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  analyzeCrazyGames,
  analyzeGoogleTesters,
  analyzePlaytest,
  evaluateLaunchReadiness,
  parseRows,
} from "./lib/release-rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...readEnv(path.join(root, ".release.env")), ...process.env };
const resolve = (value, fallback) => path.resolve(root, value || fallback);
const readAnalysis = (file, analyze, ...args) => {
  try {
    return analyze(parseRows(fs.readFileSync(file, "utf8"), path.extname(file)), ...args);
  } catch (error) {
    return { passed: false, valid: false, errors: [error.message] };
  }
};

const npmCli = process.env.npm_execpath;
const testRun = spawnSync(
  npmCli ? process.execPath : "npm",
  npmCli ? [npmCli, "test", "--", "--reporter=dot"] : ["test", "--", "--reporter=dot"],
  {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: !npmCli && process.platform === "win32",
  },
);
const webBuild = artifactDirectory(resolve(env.RELEASE_WEB_BUILD_DIR, "build/web-desktop"));
const androidAab = artifactFile(resolve(env.RELEASE_ANDROID_AAB, "build/android/proj/build/app/outputs/bundle/release/app-release.aab"));
const storeDir = resolve(env.RELEASE_STORE_ASSET_DIR, "release/store-assets");
const storeFiles = fs.existsSync(storeDir)
  ? walk(storeDir).filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
  : [];
const privacyUrl = String(env.RELEASE_PRIVACY_URL ?? "");
const metricsFile = resolve(env.RELEASE_CRAZYGAMES_METRICS, "launch-data/crazygames-basic-metrics.template.csv");
const testersFile = resolve(env.RELEASE_GOOGLE_TESTERS, "launch-data/google-closed-testers.template.csv");
const playtestFile = resolve(env.RELEASE_PLAYTEST_DATA, "playtest/participants.csv");

const report = evaluateLaunchReadiness({
  automatedTestsPassed: testRun.status === 0,
  webBuild,
  androidAab,
  storeAssetsReady: env.RELEASE_STORE_ASSETS_APPROVED === "true" && storeFiles.length >= 5,
  privacyReady:
    env.RELEASE_PRIVACY_REVIEWED === "true" &&
    /^https:\/\/[^.\s]+\.[^\s]+/.test(privacyUrl) &&
    !/example|placeholder/i.test(privacyUrl),
  sdkConfigured:
    env.RELEASE_CRAZYGAMES_SDK_CONFIGURED === "true" &&
    env.RELEASE_GOOGLE_PLAY_SDK_CONFIGURED === "true",
  crazygames: readAnalysis(metricsFile, analyzeCrazyGames),
  googleTesters: readAnalysis(
    testersFile,
    analyzeGoogleTesters,
    env.RELEASE_GOOGLE_TEST_AS_OF || new Date().toISOString().slice(0, 10),
  ),
  playtest: readAnalysis(playtestFile, analyzePlaytest),
});
report.evidence = {
  automatedTests: {
    exitCode: testRun.status,
    stdout: testRun.stdout?.trim().slice(-2000),
    stderr: testRun.stderr?.trim().slice(-2000),
  },
  buildArtifacts: { webBuild, androidAab },
  storeAssets: { directory: path.relative(root, storeDir), imageCount: storeFiles.length },
  inputs: {
    crazygames: path.relative(root, metricsFile),
    googleTesters: path.relative(root, testersFile),
    playtest: path.relative(root, playtestFile),
  },
};

fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(
  path.join(root, "reports", "launch-readiness.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (!report.ready) process.exitCode = 1;

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, "utf8").split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function artifactDirectory(directory) {
  const files = walk(directory);
  return {
    path: path.relative(root, directory),
    exists: fs.existsSync(directory) && files.length > 0,
    bytes: files.reduce((total, file) => total + fs.statSync(file).size, 0),
  };
}

function artifactFile(file) {
  return {
    path: path.relative(root, file),
    exists: fs.existsSync(file) && fs.statSync(file).isFile(),
    bytes: fs.existsSync(file) && fs.statSync(file).isFile() ? fs.statSync(file).size : 0,
  };
}
