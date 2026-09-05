/**
 * 点完第一局体验代理并截图。非 Cocos 实机。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = process.env.PLAYTEST_OUT || path.join(root, "reports/first-run-proxy");
const url = process.env.PREVIEW_URL ?? "http://127.0.0.1:8766/";
fs.mkdirSync(outDir, { recursive: true });

function resolveChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/local/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  const found = candidates.find((file) => fs.existsSync(file));
  if (!found) {
    console.error("找不到 Chrome/Chromium");
    process.exit(1);
  }
  return found;
}

function loadPuppeteer() {
  try {
    return require("puppeteer-core");
  } catch {
    console.error("缺少 puppeteer-core，请先 npm install --no-save puppeteer-core");
    process.exit(1);
  }
}

async function tap(page, name) {
  const clicked = await page.evaluate((wanted) => {
    const buttons = [...document.querySelectorAll("button.cta")];
    const hit = buttons.find((btn) => (btn.dataset.name || btn.textContent) === wanted);
    if (!hit) return false;
    hit.click();
    return true;
  }, name);
  return clicked;
}

async function shot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`shot ${file}`);
  return file;
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const chrome = resolveChrome();
const puppeteer = loadPuppeteer();
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
  defaultViewport: { width: 1360, height: 900, deviceScaleFactor: 1 },
});

const findings = [];
const note = (ok, message) => {
  findings.push({ ok, message });
  console.log(`${ok ? "OK" : "FAIL"} ${message}`);
};

const page = await browser.newPage();
try {
  await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 });
  await wait(400);
  const disclaimer = await page.$eval("#disclaimer", (el) => el.textContent);
  note(disclaimer.includes("非 Cocos 实机"), `disclaimer ${disclaimer}`);
  await shot(page, "01-harbor-new");

  const harborText = await page.evaluate(() => document.body.innerText);
  note(harborText.includes("开始教学"), "new-save CTA 开始教学");
  note(harborText.includes("练潮码头"), "出航行是练潮码头");
  note(!harborText.includes("● 泡沫湾"), "教学前不假装选中泡沫湾");
  note(harborText.includes("教学后图鉴"), "图鉴锁定");

  note(await tap(page, "教学后图鉴"), "点锁定图鉴");
  await wait(200);
  note(
    (await page.evaluate(() => document.body.innerText)).includes("先完成教学再查看图鉴"),
    "锁定图鉴提示",
  );

  note(await tap(page, "开始教学"), "开始教学");
  await wait(250);
  await shot(page, "02-tutorial-cast");
  const castText = await page.evaluate(() => document.body.innerText);
  note(castText.includes("练潮码头") && castText.includes("潮汐猎场"), "教学猎场标题");
  note(castText.includes("抛竿") && castText.includes("捡起"), "抛竿/捡起按钮");
  note(castText.includes("抛竿") && !castText.includes("热身潮"), "教学旁白不被潮汐句覆盖");

  note(await tap(page, "回港"), "教学中点回港");
  await wait(150);
  note(
    (await page.evaluate(() => document.body.innerText)).includes("先抛竿、打中、入箱"),
    "未入箱不能回港",
  );

  note(await tap(page, "抛竿"), "抛竿");
  await wait(280);
  await shot(page, "03-tutorial-weak");
  const weakText = await page.evaluate(() => document.body.innerText);
  note(weakText.includes("发光鳍") || weakText.includes("弱点"), "弱点旁白");
  note(weakText.includes("湾鳍"), "目标是湾鳍鱼");

  note(await tap(page, "弱点"), "点发光鳍");
  await wait(350);
  await shot(page, "04-tutorial-pickup");
  const pickText = await page.evaluate(() => document.body.innerText);
  note(pickText.includes("捡起") && pickText.includes("鱼箱"), "捡起旁白");
  note(pickText.includes("弱点") || pickText.includes("入箱"), `命中跳字或旁白 ${pickText.includes("弱点")}`);

  note(await tap(page, "捡起"), "捡起");
  await wait(250);
  await shot(page, "05-tutorial-carry");
  note(
    (await page.evaluate(() => document.body.innerText)).includes("左边鱼箱"),
    "扛鱼后指向鱼箱",
  );

  note(await tap(page, "鱼箱"), "入箱");
  await wait(280);
  await shot(page, "06-tutorial-inbox");
  const inboxText = await page.evaluate(() => document.body.innerText);
  note(inboxText.includes("入箱"), "入箱跳字或旁白");

  await wait(1900);
  await shot(page, "07-settle-sell");
  const settleText = await page.evaluate(() => document.body.innerText);
  note(settleText.includes("潮汐鱼市结算"), "结算页");
  note(settleText.includes("【首次】"), "首次角标");
  note(settleText.includes("卖到鱼市"), "卖鱼主 CTA");

  note(await tap(page, "卖到鱼市"), "卖到鱼市");
  await wait(350);
  await shot(page, "08-harbor-after");
  const after = await page.evaluate(() => document.body.innerText);
  note(after.includes("潮汐港口 v28"), "回到港口");
  note(after.includes("出海捕鱼"), "第二局 CTA 文案");
  note(after.includes("● 泡沫湾"), "教学后默认泡沫湾");
  note(!after.includes("开始教学"), "开始教学已消失");
  note(after.includes("再出1局后图鉴"), "图鉴仍锁到第二局");
  note(after.includes("+") && after.includes("金"), "金币跳字");
  note(after.includes("图鉴新纪录") || after.includes("卖出"), "卖出/图鉴新纪录反馈");

  note(await tap(page, "升级弹力鱼竿"), "点升级（首局金币不够）");
  await wait(200);
  await shot(page, "09-upgrade-broke");
  note(
    (await page.evaluate(() => document.body.innerText)).includes("金币不足"),
    "买不起升级不抢主 CTA，点次要升级仍提示金币不足",
  );

  fs.writeFileSync(
    path.join(outDir, "report.json"),
    `${JSON.stringify(
      {
        url,
        disclaimer,
        proxy: true,
        findings,
        failCount: findings.filter((item) => !item.ok).length,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await browser.close();
}

const failed = findings.filter((item) => !item.ok);
if (failed.length) {
  console.error(`proxy playtest failed ${failed.length}`);
  process.exitCode = 1;
} else {
  console.log(`proxy playtest ok → ${outDir}`);
}
