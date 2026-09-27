/**
 * 用无头 Chrome 把钓鱼预览跑一遍，存 4 张关键画面和一段不超过 15 秒的 GIF。
 * 画面来自真实页面，不手画。
 *
 *   node tools/fishing-preview/serve.mjs
 *   node tools/fishing-preview/record.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, "docs", "fishing");
const frameDir = path.join(root, "docs", "fishing", ".frames");
const port = 8771;
const url = `http://127.0.0.1:${port}/?seed=2`;

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
      lineKg: v.lineKg,
      speciesName: v.speciesName,
      cm: v.cm,
      kg: v.kg,
      power: v.power,
      surge: v.surge,
      holdCount: v.holdCount,
      current: v.hint,
    };
  });
}

async function press(page, selector) {
  const ok = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  }, selector);
  if (!ok) throw new Error(`找不到 ${selector}`);
}

async function until(page, pred, ms = 25000) {
  const start = Date.now();
  let last = await view(page);
  while (Date.now() - start < ms) {
    last = await view(page);
    if (pred(last)) return last;
    await wait(40);
  }
  throw new Error(`超时 ${JSON.stringify(last)}`);
}

const server = spawn(process.execPath, [path.join(root, "tools/fishing-preview/serve.mjs")], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

let browser;
try {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 304) break;
    } catch {
      // server still binding
    }
    await wait(100);
  }

  const chrome = chromePath();
  if (!chrome) throw new Error("找不到 Chrome/Chromium");
  const puppeteer = require("puppeteer-core");
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 });
  await page.waitForFunction(() => window.__fishing);

  fs.mkdirSync(outDir, { recursive: true });
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });
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
  }, 140);

  await press(page, "[data-water=shallows]");
  await press(page, "[data-period=day]");
  await press(page, "[data-action=sea]");

  async function oneFish() {
    await page.evaluate(() => window.__fishing.setSpeed(1));
    capturing = true;
    const hold = await page.$("#hold");
    await hold.hover();
    await page.mouse.down();
    await wait(650);
    const casting = await view(page);
    if (casting.power < 0.3) throw new Error(`蓄力没有上去 ${JSON.stringify(casting)}`);
    await page.screenshot({ path: path.join(outDir, "01-cast.png") });
    await page.mouse.up();
    await page.evaluate(() => window.__fishing.setSpeed(8));
    const hooked = await until(page, (v) => v.phase === "hook" || v.phase === "miss" || v.phase === "card");
    if (hooked.phase !== "hook") {
      capturing = false;
      return hooked;
    }
    await page.evaluate(() => window.__fishing.setSpeed(1));
    await page.mouse.down();
    await until(page, (v) => v.phase === "fighting");
    await wait(350);
    await page.screenshot({ path: path.join(outDir, "02-fight.png") });
    const done = await until(page, (v) => v.phase === "card" || v.phase === "miss");
    await page.mouse.up();
    if (done.phase === "card") {
      await wait(200);
      await page.screenshot({ path: path.join(outDir, "03-card.png") });
    }
    capturing = false;
    return done;
  }

  let landed = null;
  for (let attempt = 0; attempt < 6 && !landed; attempt++) {
    const result = await oneFish();
    console.log("attempt", attempt, result.phase, result.speciesName, result.notice);
    if (result.phase === "card") landed = result;
    else if (result.phase === "miss") {
      await wait(80);
      await press(page, "[data-action=again]");
    }
  }
  if (!landed) throw new Error("没有钓上来");

  await press(page, "[data-action=dock]");
  await wait(100);
  await press(page, "[data-action=sell]");
  await page.evaluate(() => window.__fishing.setSpeed(12));
  let guard = 0;
  while ((await view(page)).coins < 60 && guard < 14) {
    const phase = (await view(page)).phase;
    if (phase === "dock") await press(page, "[data-action=sea]");
    else if (phase === "card" || phase === "miss") await press(page, "[data-action=again]");
    await wait(80);
    const hold = await page.$("#hold");
    await hold.hover();
    await page.mouse.down();
    await wait(180);
    await page.mouse.up();
    const hooked = await until(page, (v) => v.phase === "hook" || v.phase === "miss");
    if (hooked.phase === "hook") {
      await page.mouse.down();
      const done = await until(page, (v) => v.phase === "card" || v.phase === "miss");
      await page.mouse.up();
      await wait(80);
      if (done.phase === "card") {
        await press(page, "[data-action=dock]");
        await wait(80);
        await press(page, "[data-action=sell]");
      } else {
        await press(page, "[data-action=again]");
      }
    } else {
      await wait(80);
      await press(page, "[data-action=again]");
    }
    guard++;
    console.log("grind", guard, JSON.stringify(await view(page)));
  }
  const before = await view(page);
  if (before.coins < 60) throw new Error(`金币不够升级 ${before.coins}`);
  await press(page, "[data-buy=line]");
  await wait(200);
  const after = await view(page);
  if (after.lineKg < 13) throw new Error(`鱼线没有升级 ${JSON.stringify(after)}`);
  capturing = true;
  await wait(400);
  await page.screenshot({ path: path.join(outDir, "04-shop.png") });
  await wait(500);
  capturing = false;
  clearInterval(timer);
  await wait(200);

  const gif = path.join(outDir, "loop.gif");
  const usable = frames.filter((file) => fs.existsSync(file));
  const maxFrames = 15 * 8;
  const picked = usable.length > maxFrames
    ? usable.filter((_, index) => index % Math.ceil(usable.length / maxFrames) === 0).slice(0, maxFrames)
    : usable;
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
  console.log(JSON.stringify({
    png: ["01-cast.png", "02-fight.png", "03-card.png", "04-shop.png"].map((name) => path.join(outDir, name)),
    gif,
    bytes: stat.size,
    frames: picked.length,
    seconds: picked.length / 8,
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill();
}
