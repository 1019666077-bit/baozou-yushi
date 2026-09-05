/**
 * 有界面地点完第一局，给屏幕录像用。非 Cocos 实机。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const url = process.env.PREVIEW_URL ?? "http://127.0.0.1:8766/";
const chrome = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/local/bin/google-chrome",
].find((file) => fs.existsSync(file));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tap(page, name) {
  const ok = await page.evaluate((wanted) => {
    const hit = [...document.querySelectorAll("button.cta")].find(
      (btn) => (btn.dataset.name || btn.textContent) === wanted,
    );
    if (!hit) return false;
    hit.click();
    return true;
  }, name);
  if (!ok) throw new Error(`missing ${name}`);
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: false,
  args: [
    "--no-sandbox",
    "--disable-gpu",
    `--window-size=1400,920`,
    "--window-position=40,40",
  ],
  defaultViewport: { width: 1360, height: 860, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle0" });
await wait(1600);
await tap(page, "开始教学");
await wait(1400);
await tap(page, "抛竿");
await wait(1400);
await tap(page, "弱点");
await wait(1400);
await tap(page, "捡起");
await wait(1400);
await tap(page, "鱼箱");
await wait(2200);
await tap(page, "卖到鱼市");
await wait(2000);
await browser.close();
console.log("visible first-run done");
