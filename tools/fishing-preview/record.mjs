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
import { LAYOUT_SIZES, assertLayout, fitViewport, layoutTable } from "./hud-overlap.mjs";

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

async function composition(page) {
  return page.evaluate(() => window.__fishing.composition());
}

function assertChrome(name, shot) {
  if (shot.dock !== "none") throw new Error(`${name} 调试条可见 ${shot.dock}`);
}

function assertRod(name, shot) {
  assertChrome(name, shot);
  const problems = [];
  if (!shot.shaft || shot.shaft.behind || shot.tip.behind) problems.push(`竿不在画面里 ${JSON.stringify({ shaft: shot.shaft, tip: shot.tip })}`);
  if (shot.shaft && !(shot.tip.y < shot.shaft.y)) problems.push(`竿尖没有高于竿身 ${JSON.stringify({ tip: shot.tip, shaft: shot.shaft })}`);
  if (!(shot.tip.x > shot.w * 0.5 && shot.tip.y > shot.h * 0.5)) {
    problems.push(`竿尖越过中线 ${JSON.stringify(shot.tip)} ${shot.w}x${shot.h}`);
  }
  if (shot.tip.x >= shot.w - 4 || shot.tip.y >= shot.h - 4) {
    problems.push(`竿尖出了画面 ${JSON.stringify(shot.tip)} ${shot.w}x${shot.h}`);
  }
  if (problems.length) throw new Error(`${name} ${problems.join("；")}`);
}

function assertLine(name, shot) {
  const problems = [];
  if (typeof shot.lineTop === "number" && shot.lineTop < -2) problems.push(`线冲出画面顶部 ${shot.lineTop}`);
  if (typeof shot.lineGap === "number" && shot.lineGap > 28) problems.push(`线没有接到竿尖 gap=${shot.lineGap}`);
  if (problems.length) throw new Error(`${name} ${problems.join("；")}`);
}

function assertIdle(name, shot) {
  assertRod(name, shot);
  if (shot.bobVisible) throw new Error(`${name} 待机不该有浮标`);
  return shot;
}

function assertBob(name, shot, air) {
  assertRod(name, shot);
  assertLine(name, shot);
  const problems = [];
  if (!shot.bobVisible) problems.push("浮标没显示");
  if (!air && (shot.bob.behind || shot.bobWorldY > 0.35)) problems.push(`浮标不在水面 ${JSON.stringify(shot.bob)} y=${shot.bobWorldY}`);
  if (shot.pierHits > 0) problems.push(`鱼线穿过码头 ${shot.pierHits}`);
  if (problems.length) throw new Error(`${name} ${problems.join("；")}`);
  return shot;
}

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file });
  return file;
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
  await act(page, "ready");
  await act(page, "pier");
  await wait(1200);
  const overlap = [];
  await page.evaluate(() => window.__fishing.setSpeed(0));
  const idleShot = assertIdle("01-idle", await composition(page));
  console.log("01-idle", JSON.stringify(idleShot));
  await shot(page, "01-idle.png");
  for (const [w, h] of LAYOUT_SIZES) {
    const row = await assertLayout(page, "idle", w, h);
    overlap.push(row);
    if (w === 375 && h === 667) {
      const idlePhone = assertIdle("01-idle-375", await composition(page));
      if (idlePhone.w !== 375 || idlePhone.h !== 667) throw new Error(`01-idle-375 视口不对 ${idlePhone.w}x${idlePhone.h}`);
      console.log("01-idle-375", JSON.stringify(idlePhone));
      await shot(page, "01-idle-375.png");
    }
  }
  await fitViewport(page, 1280, 720);
  await page.evaluate(() => window.__fishing.setSpeed(1));
  await page.setViewport({ width: 896, height: 414, deviceScaleFactor: 1 });
  await act(page, "pier");
  await wait(250);
  await shot(page, "07-phone.png");
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await wait(200);

  const frames = [];
  let capturing = false;
  let shotBusy = Promise.resolve();
  const timer = setInterval(() => {
    if (!capturing) return;
    const file = path.join(frameDir, `f${String(frames.length).padStart(4, "0")}.png`);
    frames.push(file);
    shotBusy = page.screenshot({ path: file }).catch(() => {
      frames.pop();
    });
  }, 125);

  async function steer(page) {
    const state = await view(page);
    const reel = state.phase === "fighting" && state.tension < 0.72 && state.surge < 0.6;
    await page.evaluate((down) => window.__fishing.setHeld(down), reel || state.phase === "hook");
  }

  let gotFly = false;
  async function oneFish() {
    await act(page, "ready");
    await page.evaluate(() => window.__fishing.setSpeed(3));
    await until(page, (v) => v.phase === "ready" && (v.rodState === "idle" || v.rodState === "windup"), 4000);
    await page.evaluate(() => window.__fishing.setSpeed(1));
    await page.evaluate(() => window.__fishing.setHeld(true));
    const charging = await until(page, (v) => v.power > 0.45 || v.phase === "waiting");
    if (charging.power < 0.3 && charging.phase !== "waiting") {
      throw new Error(`蓄力没有上去 ${JSON.stringify(charging)}`);
    }
    if (!gotFly) {
    await shot(page, "02-cast.png");
    capturing = true;
    await page.evaluate(() => window.__fishing.setSpeed(0.45));
    }
    await page.evaluate(() => window.__fishing.setHeld(false));
    if (gotFly) {
      await page.evaluate(() => window.__fishing.setSpeed(8));
      await until(page, (v) => v.rodState === "floating" || v.phase === "waiting", 8000);
    } else {
    let flyShot = null;
    const flyStart = Date.now();
    while (Date.now() - flyStart < 8000 && !flyShot) {
      const picked = await page.evaluate(() => {
        const rod = window.__fishing.rodState();
        const y = window.__fishing.bobY();
        const c = window.__fishing.composition();
        const good = rod === "flying" && c.bobVisible && !c.bob.behind && c.bob.y > 50 && c.bob.y < innerHeight * 0.34 && y > 3.5;
        if (good) window.__fishing.setSpeed(0);
        return { good, rod, phase: window.__fishing.view().phase };
      });
      if (picked.good) {
        flyShot = assertBob("02-fly", await composition(page), true);
        if (!(flyShot.bob.y > 50 && flyShot.bob.y < flyShot.h * 0.34 && flyShot.bobWorldY > 3.5)) {
          throw new Error(`02-fly 不在空中 ${JSON.stringify({ y: flyShot.bob.y, world: flyShot.bobWorldY })}`);
        }
        console.log("02-fly", JSON.stringify(flyShot));
        await shot(page, "02-fly.png");
        break;
      }
      if (picked.rod === "floating" || picked.phase === "waiting") break;
      await wait(30);
    }
    if (!flyShot) throw new Error(`02-fly 没拍到空中的浮标 ${JSON.stringify(await view(page))}`);
    gotFly = true;
    capturing = false;
    await page.evaluate(() => window.__fishing.setSpeed(1));
    await until(page, (v) => v.rodState === "floating" || v.phase === "waiting", 8000);
    await wait(160);
    await page.evaluate(() => window.__fishing.setSpeed(6));
    await until(page, (v) => (v.phase === "waiting" || v.phase === "nibbling") && v.rodState === "floating" && v.bobY < 0.45, 12000);
    await page.evaluate(() => window.__fishing.setSpeed(1));
    await wait(180);
    const waitShot = assertBob("02-wait", await composition(page), false);
    console.log("02-wait", JSON.stringify(waitShot));
    await shot(page, "02-wait.png");
    }
    await page.evaluate(() => window.__fishing.setSpeed(10));
    const hooked = await until(page, (v) => v.phase === "hook" || v.phase === "miss" || v.phase === "card" || v.phase === "fighting");
    if (hooked.phase === "miss") {
      capturing = false;
      await page.evaluate(() => window.__fishing.setHeld(false));
      return hooked;
    }
    await page.evaluate(() => window.__fishing.setSpeed(1));
    await page.evaluate(() => window.__fishing.setHeld(true));
    await until(page, (v) => v.phase === "fighting" || v.phase === "miss" || v.phase === "card");
    let fightShot = null;
    const fightStart = Date.now();
    while (Date.now() - fightStart < 10000 && !fightShot) {
      const state = await view(page);
      if (state.phase !== "fighting") break;
      const reel = state.tension < 0.82;
      await page.evaluate((down) => window.__fishing.setHeld(down), reel);
      const picked = await page.evaluate(() => {
        const v = window.__fishing.view();
        const c = window.__fishing.composition();
        const bend = window.__fishing.bend();
        const good = v.phase === "fighting"
          && window.__fishing.rodState() === "fighting"
          && window.__fishing.bobY() < 0.45
          && Number.isFinite(bend) && Math.abs(bend) > 0.03 && Math.abs(bend) < 1.2
          && v.tension > 0.72
          && c.lineVisible
          && c.lineSag < 16;
        if (good) window.__fishing.setSpeed(0);
        return { good, tension: v.tension, sag: c.lineSag, bend };
      });
      if (picked.good) {
        fightShot = assertBob("03-fight", await composition(page), false);
        if (!fightShot.lineVisible || fightShot.lineSag > 16) throw new Error(`03-fight 线不够直 sag=${fightShot.lineSag}`);
        console.log("03-fight", JSON.stringify({ ...fightShot, tension: picked.tension, sag: picked.sag }));
        await shot(page, "03-fight.png");
        break;
      }
      await wait(40);
    }
    const mid = fightShot ? await view(page) : await view(page);
    if (fightShot) {
      capturing = false;
      await shotBusy;
      for (const [w, h] of LAYOUT_SIZES) {
        overlap.push(await assertLayout(page, "fight", w, h));
        if (w === 375 && h === 667) {
          const fightPhone = assertBob("03-fight-375", await composition(page), false);
          if (fightPhone.w !== 375 || fightPhone.h !== 667) throw new Error(`03-fight-375 视口不对 ${fightPhone.w}x${fightPhone.h}`);
          if (!fightPhone.lineVisible || fightPhone.lineSag > 16) throw new Error(`03-fight-375 线不够直 sag=${fightPhone.lineSag}`);
          console.log("03-fight-375", JSON.stringify(fightPhone));
          await shot(page, "03-fight-375.png");
        }
      }
      await fitViewport(page, 1280, 720);
      await wait(80);
      capturing = true;
      await page.evaluate(() => window.__fishing.setSpeed(3));
    } else {
      capturing = false;
      await page.evaluate(() => window.__fishing.setHeld(false));
      const now = await view(page);
      if (now.phase !== "miss" && now.phase !== "ready") await act(page, "ready");
      return await view(page);
    }
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
      await page.evaluate(() => window.__fishing.setSpeed(1));
      await wait(400);
      await page.evaluate(() => window.__fishing.setSpeed(0));
      const card = await page.evaluate(() => {
        const bar = document.querySelector("#cardBar");
        const on = document.getElementById("catch")?.classList.contains("on");
        const c = window.__fishing.composition();
        return { on, width: bar ? bar.style.width : "", line: c.lineVisible, bob: c.bobVisible };
      });
      if (!card.on || !card.width || card.width === "0%") throw new Error(`渔获卡进度条不对 ${JSON.stringify(card)}`);
      if (card.line || card.bob) throw new Error(`渔获卡还挂着线或浮标 ${JSON.stringify(card)}`);
      await shot(page, "04-card.png");
      await shotBusy;
      for (const [w, h] of LAYOUT_SIZES) overlap.push(await assertLayout(page, "card", w, h));
      await fitViewport(page, 1280, 720);
    }
    return done;
  }

  let landed = null;
  for (let attempt = 0; attempt < 12 && !landed; attempt++) {
    const result = await oneFish();
    console.log("attempt", attempt, result.phase, result.speciesName, result.notice, "bend", result.bend);
    if (result.phase === "card") landed = result;
    else await act(page, "ready");
  }
  if (!landed) throw new Error("没有钓上来");

  await page.evaluate(() => window.__fishing.setSpeed(1));
  await page.evaluate(() => window.__fishing.setHeld(true));
  await wait(80);
  await page.evaluate(() => window.__fishing.setHeld(false));
  await act(page, "joe");
  await wait(200);
  await shot(page, "05-stall.png");
  await act(page, "close");
  await act(page, "marta");
  await wait(200);
  await shot(page, "05-shop.png");
  for (const [w, h] of LAYOUT_SIZES) {
    overlap.push(await assertLayout(page, "shop", w, h));
    if (w === 375 && h === 667) await shot(page, "06-shop-375.png");
  }
  await fitViewport(page, 1280, 720);
  await act(page, "close");
  await act(page, "ready");
  for (const id of ["dawn", "day", "dusk", "night"]) {
    await act(page, id);
    await wait(250);
    await shot(page, `08-${id}.png`);
  }

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
  const finderPage = await browser.newPage();
  finderPage.on("pageerror", (error) => console.error("pageerror", error));
  await finderPage.goto(pageUrl + "&wallet=500", { waitUntil: "load", timeout: 20000 });
  await finderPage.waitForFunction(() => window.__fishing, { timeout: 15000 });
  await act(finderPage, "skip");
  await act(finderPage, "ready");
  await act(finderPage, "boat");
  await act(finderPage, "buy:fishFinder");
  await act(finderPage, "buy:lights");
  await act(finderPage, "night");
  await finderPage.waitForFunction(() => {
    const v = window.__fishing.view();
    return v.finder && v.spot === "boat" && v.finderDepth > 0;
  }, { timeout: 8000 });
  await wait(300);
  const finderText = await finderPage.evaluate(() => document.getElementById("finder")?.textContent || "");
  if (!finderText.includes("水深") || !finderText.includes("鱼讯")) throw new Error(`探鱼器没显示 ${finderText}`);
  await shot(finderPage, "09-finder.png");
  await finderPage.close();

  for (const name of ["01-idle-375.png", "02-fly.png", "03-fight.png", "03-fight-375.png", "04-card.png"]) {
    if (!fs.existsSync(path.join(outDir, name))) throw new Error(`缺图 ${name}`);
  }
  for (const scene of ["idle", "fight", "card", "shop"]) {
    for (const [w, h] of LAYOUT_SIZES) {
      if (!overlap.some((row) => row.scene === scene && row.size === `${w}x${h}`)) {
        throw new Error(`缺重叠 ${scene} ${w}x${h}`);
      }
    }
  }
  console.log(JSON.stringify({
    png: fs.readdirSync(outDir).filter((name) => name.endsWith(".png")),
    gif,
    bytes: stat.size,
    frames: picked.length,
    seconds,
    landed,
    overlap,
    table: layoutTable(overlap),
  }, null, 2));
  console.log(layoutTable(overlap));
} finally {
  await browser.close();
}
