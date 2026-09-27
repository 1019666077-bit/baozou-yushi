/**
 * 待机、对抗、渔获卡、商店 × 三种视口：看得见的文字框、按钮、面板两两不相交，并且在视口里。
 * 对抗和渔获卡还必须藏起交谈按钮和小地图。
 *
 *   node tools/fishing-preview/hud-overlap.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const LAYOUT_SIZES = [
  [375, 667],
  [414, 896],
  [768, 1024],
];

export function pairHits(boxes) {
  const hits = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlap = !(a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
      if (overlap) hits.push(`${a.text} × ${b.text}`);
    }
  }
  return hits;
}

export function selfTestPairHits() {
  const hit = pairHits([
    { left: 0, top: 0, right: 10, bottom: 10, text: "a" },
    { left: 5, top: 5, right: 15, bottom: 15, text: "b" },
  ]);
  const gap = pairHits([
    { left: 0, top: 0, right: 10, bottom: 10, text: "a" },
    { left: 12, top: 0, right: 20, bottom: 10, text: "b" },
  ]);
  if (hit.length !== 1 || gap.length !== 0) throw new Error(`pairHits 自测失败 ${JSON.stringify({ hit, gap })}`);
}

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

export async function fitViewport(page, width, height) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.waitForFunction((w, h) => innerWidth === w && innerHeight === h, { timeout: 3000 }, width, height);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
}

export async function measureHud(page) {
  const raw = await page.evaluate(() => {
    const panel = document.getElementById("panel");
    if (panel && panel.classList.contains("on")) panel.scrollTop = panel.scrollHeight;
    function shown(el) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return null;
      let parent = el.parentElement;
      let clipped = false;
      while (parent && parent !== document.body) {
        const parentStyle = getComputedStyle(parent);
        if (/(auto|scroll)/.test(parentStyle.overflowY) || /(auto|scroll)/.test(parentStyle.overflow)) {
          const parentRect = parent.getBoundingClientRect();
          if (rect.bottom < parentRect.top + 1 || rect.top > parentRect.bottom - 1 || rect.right < parentRect.left + 1 || rect.left > parentRect.right - 1) clipped = true;
        }
        parent = parent.parentElement;
      }
      if (clipped) return null;
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24) || el.id || "框",
        outside: rect.top < -1 || rect.left < -1 || rect.bottom > innerHeight + 1 || rect.right > innerWidth + 1,
      };
    }
    const nodes = [...document.querySelectorAll([
      "#hud button",
      ".purse",
      "#hint",
      "#map",
      "#tip.on",
      ".fight.on",
      "#finder.on",
      ".shop-copy b",
      ".shop-copy small",
      ".fish-copy b",
      ".fish-copy small",
      ".panel h2",
      ".panel > .sub",
      ".catch .badge",
      ".catch h2",
      ".catch .sci",
      ".catch .stat",
      ".catch p",
    ].join(", "))];
    const boxes = nodes.map(shown).filter(Boolean);
    const labels = [...document.querySelectorAll(".shop-row b, .fish-row b")];
    const lastLabel = labels[labels.length - 1];
    const foot = document.querySelector(".panel .foot button");
    const lastOk = (!lastLabel || shown(lastLabel) !== null) && (!foot || shown(foot) !== null);
    const lastName = lastLabel ? (lastLabel.textContent || "").trim().slice(0, 24) : "";
    const footName = foot ? (foot.textContent || "").trim().slice(0, 24) : "";
    const talks = getComputedStyle(document.getElementById("talks")).display;
    const map = getComputedStyle(document.getElementById("map")).display;
    const dock = document.querySelector(".dock");
    return {
      boxes,
      lastOk,
      last: `${lastName} / ${footName}`,
      talks,
      map,
      dock: dock ? getComputedStyle(dock).display : "missing",
    };
  });
  const visible = raw.boxes.filter((box) => !box.outside);
  return {
    hits: pairHits(visible),
    outside: raw.boxes.filter((box) => box.outside).map((box) => box.text),
    count: raw.boxes.length,
    boxes: raw.boxes,
    lastOk: raw.lastOk,
    last: raw.last,
    talks: raw.talks,
    map: raw.map,
    dock: raw.dock,
  };
}

function covers(box, x, y) {
  return x >= box.left - 1 && x <= box.right + 1 && y >= box.top - 1 && y <= box.bottom + 1;
}

export async function assertLayout(page, scene, width, height) {
  await fitViewport(page, width, height);
  await wait(40);
  const result = await measureHud(page);
  const problems = [];
  if (result.dock !== "none") problems.push(`调试条可见 ${result.dock}`);
  if (result.hits.length) problems.push(`相交 ${result.hits.join(" | ")}`);
  if (result.outside.length) problems.push(`出界 ${result.outside.join(" | ")}`);
  if ((scene === "fight" || scene === "card") && (result.talks !== "none" || result.map !== "none")) {
    problems.push(`交谈或小地图还在 talks=${result.talks} map=${result.map}`);
  }
  if (scene === "idle" && (result.talks === "none" || result.map === "none")) {
    problems.push(`待机把交谈或小地图藏了 talks=${result.talks} map=${result.map}`);
  }
  if (scene === "idle" && !result.boxes.some((box) => box.text.includes("和乔交谈"))) {
    problems.push("待机没有「和乔交谈」");
  }
  if (scene === "shop" && !result.lastOk) problems.push(`最后一行不可见 ${result.last}`);
  if (scene === "fight" && !result.boxes.some((box) => box.text.includes("m"))) problems.push("拉力条没显示");
  if (scene === "card" && !result.boxes.some((box) => box.text.length > 1)) problems.push("渔获卡没有文字");
  if (scene === "fight") {
    const shot = await page.evaluate(() => window.__fishing.composition());
    const blocked = result.boxes.filter((box) => !box.outside && (covers(box, shot.tip.x, shot.tip.y) || covers(box, shot.shaft.x, shot.shaft.y)));
    if (blocked.length) problems.push(`挡住竿 ${blocked.map((box) => box.text).join(" | ")} tip=${Math.round(shot.tip.x)},${Math.round(shot.tip.y)}`);
    const wideEnough = width / height >= 375 / 667 - 0.01;
    if (wideEnough && !(shot.tip.x > width / 2 && shot.tip.y > height / 2 && shot.tip.x < width - 4 && shot.tip.y < height - 4)) {
      problems.push(`竿尖不在右下画面内 ${Math.round(shot.tip.x)},${Math.round(shot.tip.y)}`);
    }
  }
  if (problems.length) {
    throw new Error(`${scene} ${width}x${height} ${problems.join("；")}`);
  }
  return {
    scene,
    size: `${width}x${height}`,
    count: result.count,
    hits: result.hits.length,
    outside: result.outside.length,
    talks: result.talks,
    map: result.map,
    last: result.last,
  };
}

async function view(page) {
  return page.evaluate(() => {
    const v = window.__fishing.view();
    return {
      phase: v.phase,
      tension: v.tension,
      surge: v.surge,
      power: v.power,
      bend: window.__fishing.bend(),
      bobY: window.__fishing.bobY(),
      rodState: window.__fishing.rodState(),
      speciesName: v.speciesName,
      notice: v.notice,
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

async function steer(page) {
  const state = await view(page);
  const reel = state.phase === "fighting" && state.tension < 0.72 && state.surge < 0.6;
  await page.evaluate((down) => window.__fishing.setHeld(down), reel || state.phase === "hook");
}

async function oneCatch(page, onFight) {
  await act(page, "ready");
  await page.evaluate(() => window.__fishing.setSpeed(1));
  await page.evaluate(() => window.__fishing.setHeld(true));
  await until(page, (v) => v.power > 0.45 || v.phase === "waiting");
  await page.evaluate(() => window.__fishing.setHeld(false));
  await until(page, (v) => v.rodState === "floating" || v.phase === "waiting", 8000);
  await page.evaluate(() => window.__fishing.setSpeed(8));
  await until(page, (v) => (v.phase === "waiting" || v.phase === "nibbling") && v.rodState === "floating", 12000);
  await page.evaluate(() => window.__fishing.setSpeed(8));
  const hooked = await until(page, (v) => v.phase === "hook" || v.phase === "miss" || v.phase === "card" || v.phase === "fighting");
  if (hooked.phase === "miss") {
    await page.evaluate(() => window.__fishing.setHeld(false));
    return hooked;
  }
  await page.evaluate(() => window.__fishing.setSpeed(2));
  await page.evaluate(() => window.__fishing.setHeld(true));
  await until(page, (v) => v.phase === "fighting" || v.phase === "miss" || v.phase === "card");
  const mid = await view(page);
  if (mid.phase === "fighting" && onFight) await onFight(page);
  const start = Date.now();
  let done = await view(page);
  while (Date.now() - start < 18000 && done.phase !== "card" && done.phase !== "miss") {
    await steer(page);
    await wait(50);
    done = await view(page);
  }
  await page.evaluate(() => window.__fishing.setHeld(false));
  return done;
}

export function layoutTable(rows) {
  const scenes = ["idle", "fight", "card", "shop"];
  const names = { idle: "待机", fight: "对抗", card: "渔获卡", shop: "商店" };
  const header = ["场景", ...LAYOUT_SIZES.map(([w, h]) => `${w}×${h}`)];
  const lines = [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];
  for (const scene of scenes) {
    const cells = LAYOUT_SIZES.map(([w, h]) => {
      const row = rows.find((item) => item.scene === scene && item.size === `${w}x${h}`);
      if (!row) return "未测";
      return `0 相交，${row.count} 框，交谈 ${row.talks}，地图 ${row.map}`;
    });
    lines.push(`| ${names[scene]} | ${cells.join(" | ")} |`);
  }
  return lines.join("\n");
}

async function main() {
  selfTestPairHits();
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
  const rows = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => console.error("pageerror", error));
    const pageUrl = pathToFileURL(path.join(root, "docs/fishing-play/index.html")).href + "?seed=2";
    await page.goto(pageUrl, { waitUntil: "load", timeout: 20000 });
    await page.waitForFunction(() => window.__fishing, { timeout: 15000 });
    await act(page, "skip");
    await act(page, "ready");
    await act(page, "pier");
    await wait(400);
    await page.evaluate(() => window.__fishing.setSpeed(0));
    for (const [w, h] of LAYOUT_SIZES) rows.push(await assertLayout(page, "idle", w, h));
    await fitViewport(page, 1280, 720);
    await page.evaluate(() => window.__fishing.setSpeed(1));

    let card = null;
    let fightMeasured = false;
    for (let attempt = 0; attempt < 8 && !card; attempt++) {
      const result = await oneCatch(page, async () => {
        if (fightMeasured) return;
        await page.evaluate(() => window.__fishing.setSpeed(0));
        for (const [w, h] of LAYOUT_SIZES) rows.push(await assertLayout(page, "fight", w, h));
        fightMeasured = true;
        await fitViewport(page, 1280, 720);
        await page.evaluate(() => window.__fishing.setSpeed(3));
      });
      console.log("attempt", attempt, result.phase, result.speciesName, result.notice);
      if (result.phase === "card") card = result;
      else await act(page, "ready");
    }
    if (!fightMeasured) throw new Error("没有进入对抗");
    if (!card) throw new Error("没有钓上来");
    await page.evaluate(() => window.__fishing.setSpeed(0));
    const cardLine = await page.evaluate(() => window.__fishing.composition());
    if (cardLine.lineVisible || cardLine.bobVisible) {
      throw new Error(`渔获卡还挂着线或浮标 line=${cardLine.lineVisible} bob=${cardLine.bobVisible}`);
    }
    for (const [w, h] of LAYOUT_SIZES) rows.push(await assertLayout(page, "card", w, h));
    await fitViewport(page, 1280, 720);
    await act(page, "ready");
    await act(page, "marta");
    await wait(80);
    for (const [w, h] of LAYOUT_SIZES) rows.push(await assertLayout(page, "shop", w, h));
    console.log(layoutTable(rows));
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await browser.close();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
