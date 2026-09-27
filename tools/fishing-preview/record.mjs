/**
 * 用无头 Chrome 打开静态预览（file://，不另起服务），存关键画面和不超过 15 秒的 GIF。
 * 画面来自 three.js 页面，不是 Creator 实机。
 *
 *   node tools/fishing-preview/build-static.mjs
 *   node tools/fishing-preview/record.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, "docs", "fishing");
const frameDir = path.join(root, "docs", "fishing", ".frames");
const pageUrl = pathToFileURL(path.join(root, "docs/fishing-play/index.html")).href + "?seed=2";

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((file) => fs.existsSync(file));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function view(page) {
  return page.evaluate(() => {
    const v = window.__fishing.view();
    return {
      phase: v.phase,
      coins: v.coins,
      tension: v.tension,
      notice: v.notice,
      speciesName: v.speciesName,
      cm: v.cm,
      kg: v.kg,
      power: v.power,
      surge: v.surge,
      holdCount: v.holdCount,
      distance: v.distance,
      bend: window.__fishing.bend(),
      bobY: window.__fishing.bobY(),
      rodState: window.__fishing.rodState(),
      guideOpen: v.guideOpen,
    };
  });
}

async function act(page, name) {
  await page.evaluate((value) => window.__fishing.act(value), name);
}

async function until(page, pred, ms = 20000) {
  const start = Date.now();
  let last = await view(page);
  while (Date.now() - start < ms) {
    last = await view(page);
    if (pred(last)) return last;
    await wait(40);
  }
  throw new Error(`超时 ${JSON.stringify(last)}`);
}

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file });
  return file;
}

async function assertShopClear(page, width, height) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await act(page, "marta");
  await wait(120);
  const hits = await page.evaluate(() => {
    function box(el) {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }
    function hit(a, b) {
      return !(a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
    }
    const bad = [];
    for (const row of document.querySelectorAll(".shop-row, .fish-row")) {
      const copy = row.querySelector(".shop-copy, .fish-copy");
      const button = row.querySelector("button");
      if (!copy || !button) continue;
      if (hit(box(copy), box(button))) bad.push(copy.textContent.slice(0, 24));
    }
    return bad;
  });
  if (hits.length) throw new Error(`${width}x${height} 商店文字和按钮重叠：${hits.join(" | ")}`);
  await act(page, "close");
}

const chrome = chromePath();
if (!chrome) throw new Error("找不到 Chrome/Chromium");
const puppeteer = require("puppeteer-core");
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--allow-file-access-from-files",
    "--font-render-hinting=none",
  ],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
});

try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.error("pageerror", error));
  await page.goto(pageUrl, { waitUntil: "load", timeout: 20000 });
  await page.waitForFunction(() => window.__fishing, { timeout: 15000 });
  const gl = await page.evaluate(() => {
    const canvas = document.querySelector("#view canvas");
    if (!canvas) return "no-canvas";
    const ctx = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return ctx ? "webgl" : "no-webgl";
  });
  if (gl !== "webgl") throw new Error(`WebGL 没有起来：${gl}`);

  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(outDir)) {
    if (name.endsWith(".png") || name.endsWith(".gif")) fs.rmSync(path.join(outDir, name));
  }
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });

  await act(page, "skip");
  await act(page, "pier");
  await wait(400);
  await shot(page, "01-idle.png");

  await assertShopClear(page, 375, 667);
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 1 });
  await act(page, "marta");
  await wait(150);
  await shot(page, "06-shop-375.png");
  await act(page, "close");
  await assertShopClear(page, 414, 896);
  await page.setViewport({ width: 896, height: 414, deviceScaleFactor: 1 });
  await act(page, "pier");
  await wait(250);
  await shot(page, "07-phone.png");
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await wait(200);

  const frames = [];
  let capturing = false;
  const timer = setInterval(async () => {
    if (!capturing) return;
    const file = path.join(frameDir, `f${String(frames.length).padStart(4, "0")}.png`);
    frames.push(file);
    try {
      await page.screenshot({ path: file });
    } catch {
      frames.pop();
    }
  }, 125);

  async function steer(page) {
    const state = await view(page);
    const reel = state.phase === "fighting" && state.tension < 0.72 && state.surge < 0.6;
    await page.evaluate((down) => window.__fishing.setHeld(down), reel || state.phase === "hook");
  }

  async function oneFish() {
    await act(page, "ready");
    await page.evaluate(() => window.__fishing.setSpeed(1));
    await page.evaluate(() => window.__fishing.setHeld(true));
    const charging = await until(page, (v) => v.power > 0.45 || v.phase === "waiting");
    if (charging.power < 0.3 && charging.phase !== "waiting") {
      throw new Error(`蓄力没有上去 ${JSON.stringify(charging)}`);
    }
    await shot(page, "02-cast.png");
    capturing = true;
    await page.evaluate(() => window.__fishing.setHeld(false));
    await page.evaluate(() => window.__fishing.setSpeed(10));
    const hooked = await until(page, (v) => v.phase === "hook" || v.phase === "miss" || v.phase === "card" || v.phase === "fighting");
    if (hooked.phase === "miss") {
      capturing = false;
      await page.evaluate(() => window.__fishing.setHeld(false));
      return hooked;
    }
    await page.evaluate(() => window.__fishing.setSpeed(3));
    await page.evaluate(() => window.__fishing.setHeld(true));
    await until(page, (v) => v.phase === "fighting" || v.phase === "miss" || v.phase === "card");
    const posed = await until(
      page,
      (v) => v.phase !== "fighting" || (v.rodState === "fighting" && v.bobY < 0.45 && Number.isFinite(v.bend) && Math.abs(v.bend) > 0.03 && Math.abs(v.bend) < 1.2),
      8000,
    ).catch(async () => view(page));
    const mid = posed.phase ? posed : await view(page);
    if (mid.phase === "fighting") await shot(page, "03-fight.png");
    const start = Date.now();
    let done = mid;
    while (Date.now() - start < 18000 && done.phase !== "card" && done.phase !== "miss") {
      await steer(page);
      await wait(50);
      done = await view(page);
    }
    await page.evaluate(() => window.__fishing.setHeld(false));
    capturing = false;
    if (done.phase === "card") {
      await wait(250);
      await shot(page, "04-card.png");
    }
    return done;
  }

  let landed = null;
  for (let attempt = 0; attempt < 8 && !landed; attempt++) {
    const result = await oneFish();
    console.log("attempt", attempt, result.phase, result.speciesName, result.notice, "bend", result.bend);
    if (result.phase === "card") landed = result;
    else await act(page, "ready");
  }
  if (!landed) throw new Error("没有钓上来");

  await act(page, "joe");
  await wait(200);
  await shot(page, "05-stall.png");
  await act(page, "close");
  await act(page, "marta");
  await wait(200);
  await shot(page, "05-shop.png");

  clearInterval(timer);
  await wait(200);

  const gif = path.join(outDir, "loop.gif");
  const usable = frames.filter((file) => fs.existsSync(file));
  const maxFrames = 15 * 8;
  const picked = usable.length > maxFrames
    ? usable.filter((_, index) => index % Math.ceil(usable.length / maxFrames) === 0).slice(0, maxFrames)
    : usable;
  if (picked.length < 4) throw new Error(`GIF 帧太少 ${picked.length}`);
  const list = path.join(frameDir, "list.txt");
  fs.writeFileSync(list, picked.map((file) => `file '${file}'\nduration 0.125\n`).join(""));
  const ffmpeg = spawnSync("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", list,
    "-vf", "fps=8,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse",
    "-loop", "0",
    gif,
  ], { encoding: "utf8" });
  if (ffmpeg.status !== 0) {
    console.error(ffmpeg.stderr);
    throw new Error("ffmpeg 失败");
  }
  const stat = fs.statSync(gif);
  const seconds = picked.length / 8;
  if (seconds > 15.05) throw new Error(`GIF 超过 15 秒：${seconds}`);
  console.log(JSON.stringify({
    png: fs.readdirSync(outDir).filter((name) => name.endsWith(".png")),
    gif,
    bytes: stat.size,
    frames: picked.length,
    seconds,
    landed,
  }, null, 2));
} finally {
  await browser.close();
}
