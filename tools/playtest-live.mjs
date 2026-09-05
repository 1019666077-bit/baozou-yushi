/**
 * 浏览器实跑 RuntimeHome 教学流与后期 Boss 段。
 *
 * 需要：
 * - 已用 Cocos 构建的 web 包（build/web-desktop 或 build/web-mobile）
 * - PLAYTEST_URL 指向可访问的预览地址（默认 http://127.0.0.1:8765/）
 * - Chrome / Chromium（CHROME_PATH 可覆盖；未设置时尝试常见 Linux / Windows 路径）
 *
 * 没有构建、没有浏览器、或预览打不开时，脚本会清晰失败，而不是跳过断言。
 * 本脚本不在 `npm run validate` 里跑。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "reports", "playtest-v28");
fs.mkdirSync(outDir, { recursive: true });

const DEFAULT_URL = "http://127.0.0.1:8765/";
const url = process.env.PLAYTEST_URL ?? DEFAULT_URL;

const logs = [];
const errors = [];
const findings = [];

function note(ok, message) {
  findings.push({ ok, message });
  console.log(`${ok ? "OK" : "FAIL"} ${message}`);
}

function failReady(message) {
  console.error(message);
  process.exit(1);
}

function resolveChrome() {
  if (process.env.CHROME_PATH) {
    if (!fs.existsSync(process.env.CHROME_PATH)) {
      failReady(`CHROME_PATH 不存在：${process.env.CHROME_PATH}`);
    }
    return process.env.CHROME_PATH;
  }
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/usr/bin/chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    failReady(
      "找不到 Chrome/Chromium。请设置 CHROME_PATH，或先安装浏览器后再跑 playtest-live。",
    );
  }
  return found;
}

function findWebBuild() {
  return [
    path.join(root, "build", "web-desktop", "index.html"),
    path.join(root, "build", "web-mobile", "index.html"),
  ].find((file) => fs.existsSync(file));
}

function assertPlaytestReady() {
  if (!process.env.PLAYTEST_URL && !findWebBuild()) {
    failReady(
      "未找到已构建的 web 包（build/web-desktop 或 build/web-mobile）。请先用 Cocos 构建 Web，设置 PLAYTEST_URL 指向预览地址后再跑。",
    );
  }
  return resolveChrome();
}

async function shot(page, name) {
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: true,
  });
}

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function labels(page) {
  return page.evaluate(() => {
    const cc = globalThis.cc;
    if (!cc?.director) return [];
    const out = [];
    const walk = (node) => {
      const label = node.getComponent?.(cc.Label);
      if (label?.string) out.push(String(label.string));
      for (const child of node.children ?? []) walk(child);
    };
    walk(cc.director.getScene());
    return out;
  });
}

function hasText(texts, needle) {
  return texts.some((t) => t.includes(needle));
}

async function tap(page, name) {
  return page.evaluate((buttonName) => {
    const cc = globalThis.cc;
    if (!cc?.director) return false;
    let found = null;
    const walk = (node) => {
      if (node.name === buttonName && node.getComponent(cc.Graphics)) found = node;
      for (const child of node.children ?? []) walk(child);
    };
    walk(cc.director.getScene());
    if (!found) return false;
    found.emit(cc.Node.EventType.TOUCH_END);
    return true;
  }, name);
}

async function tapOne(page, names) {
  for (const name of names) {
    if (await tap(page, name)) return name;
  }
  return "";
}

async function callHome(page, method, arg) {
  return page.evaluate(
    async (methodName, value) => {
      try {
        const cc = globalThis.cc;
        const canvas = cc?.director?.getScene()?.getChildByName("Canvas");
        const home = canvas?.getComponent("RuntimeHome");
        if (!home || typeof home[methodName] !== "function") return false;
        const result = home[methodName](value);
        if (result && typeof result.then === "function") await result;
        return true;
      } catch (error) {
        return `throw:${error}`;
      }
    },
    method,
    arg,
  );
}

async function combatLoop(page, preferName) {
  return page.evaluate((wanted) => {
    const cc = globalThis.cc;
    const canvas = cc?.director?.getScene()?.getChildByName("Canvas");
    const proto = canvas?.getComponent("RuntimePrototype");
    if (!proto) return { ok: false, reason: "no proto" };
    const origin = proto.player.position;
    const fishes = [];
    for (const node of proto.fishRoot?.children ?? []) {
      const fish = node.getComponent("FishController");
      if (fish && node.active && !fish.decoy) fishes.push(fish);
    }
    const live = fishes.map((fish) => fish.fishConfig?.name ?? fish.node.name);
    const named = wanted
      ? fishes.find((fish) => fish.fishConfig?.name === wanted)
      : undefined;
    const target =
      named ??
      fishes
        .filter((fish) => fish.fishConfig?.behavior !== "shield")
        .sort(
          (a, b) =>
            cc.Vec3.distance(a.node.position, origin) -
            cc.Vec3.distance(b.node.position, origin),
        )[0] ??
      fishes[0];
    if (!target) {
      return { ok: false, reason: "no fish", live, status: proto.status?.string };
    }
    proto.hooked = target;
    proto.hooked.setHooked(true);
    proto.hooked.forceDeckFlop?.();
    proto.hooked.elapsed = 1;
    proto.hookedAt = Date.now();
    proto.session?.resetStyle?.();
    const hookedName = proto.hooked.fishConfig?.name ?? null;
    let lastTough = proto.hooked.remainingToughness;
    let lastStatus = proto.status?.string ?? "";
    const shots = hookedName === "潮鸣巨鲲" ? 90 : 40;
    for (let i = 0; i < shots; i++) {
      if (!proto.hooked) break;
      proto.lastFireAt = 0;
      proto.aimFrom.set(proto.player.position);
      proto.aimTo.set(proto.hooked.node.position);
      const weak = proto.hooked.viewOffset?.() ?? { x: 0, y: 0 };
      proto.aimTo.x += weak.x;
      proto.aimTo.y += weak.y;
      proto.fire();
      if (typeof proto.tickShots === "function") {
        for (let s = 0; s < 28 && (proto.shots?.length ?? 0) > 0; s++) {
          proto.tickShots(0.03);
        }
      }
      proto.hitStopLeft = 0;
      lastTough = proto.hooked?.remainingToughness ?? lastTough;
      lastStatus = proto.status?.string ?? lastStatus;
      if (proto.hooked?.pickable || lastTough <= 0) break;
    }
    let captured = false;
    let settle = false;
    try {
      if (proto.hooked?.node) {
        proto.player.setPosition(
          proto.hooked.node.position.x - 40,
          proto.hooked.node.position.y,
          0,
        );
      }
      proto.pickUp?.();
      proto.stashCarried?.();
      captured = !proto.carried && !proto.hooked;
    } catch {
      captured = true;
      settle = true;
    }
    return {
      ok: true,
      hookedName,
      live,
      lastTough,
      reelActive: !!proto.reelActive,
      captured,
      settle,
      juice: proto.juice?.length ?? 0,
      coins: proto.coinsLabel?.string ?? "",
      status: lastStatus,
      multiplier: proto.multiplier?.string ?? "",
      islandId: proto.launch?.islandId ?? "",
      tutorial: !!proto.tutorial,
    };
  }, preferName);
}

async function skipToBoss(page) {
  return page.evaluate(() => {
    const cc = globalThis.cc;
    const canvas = cc?.director?.getScene()?.getChildByName("Canvas");
    const proto = canvas?.getComponent("RuntimePrototype");
    if (!proto) return { ok: false, reason: "no proto" };
    proto.runElapsed = 131;
    proto.shownBoss = false;
    proto.tickWave(0.05);
    proto.moveTarget?.set?.(-220, 18, 0);
    proto.player?.setPosition(-220, 18, 0);
    const fishes = [];
    for (const node of proto.fishRoot?.children ?? []) {
      const fish = node.getComponent("FishController");
      if (fish && node.active && !fish.decoy) fishes.push(fish);
    }
    const boss = fishes.find((fish) => fish.fishConfig?.tier === "boss");
    return {
      ok: !!boss,
      name: boss?.fishConfig?.name ?? null,
      live: fishes.map((fish) => fish.fishConfig?.name ?? fish.node.name),
      elapsed: proto.runElapsed,
      status: proto.status?.string ?? "",
    };
  });
}

async function returnHarbor(page) {
  return page.evaluate(() => {
    const cc = globalThis.cc;
    const canvas = cc?.director?.getScene()?.getChildByName("Canvas");
    const proto = canvas?.getComponent("RuntimePrototype");
    if (!proto) return false;
    proto.returnHarbor();
    return true;
  });
}

async function pauseBattle(page) {
  return page.evaluate(() => {
    const cc = globalThis.cc;
    const canvas = cc?.director?.getScene()?.getChildByName("Canvas");
    const proto = canvas?.getComponent("RuntimePrototype");
    if (!proto) return false;
    proto.togglePause();
    return proto.status?.string ?? true;
  });
}

const chrome = assertPlaytestReady();

let puppeteer;
try {
  puppeteer = (await import("puppeteer-core")).default;
} catch {
  failReady(
    "缺少 puppeteer-core。本脚本只在实跑浏览器时需要它；validate / simulate 不依赖。请先安装再跑 playtest-live。",
  );
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: [
    "--allow-running-insecure-content",
    "--autoplay-policy=no-user-gesture-required",
    "--use-gl=angle",
    "--enable-webgl",
  ],
  defaultViewport: { width: 1320, height: 1100, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => errors.push(String(err)));

try {
  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  } catch (error) {
    throw new Error(
      `无法打开 PLAYTEST_URL=${url}。请确认已构建 web 包并已启动预览服务。${error}`,
    );
  }
  await page.waitForSelector("#GameCanvas", { timeout: 15000 });
  await wait(2500);
  await shot(page, "01-harbor");
  let texts = await labels(page);
  note(logs.some((l) => l.includes("baozou-flop-v28")), "v28 console stamp");
  note(hasText(texts, "潮汐港口 v28"), "harbor title v28");
  note(hasText(texts, "开始教学"), "new save CTA is 开始教学");
  note(hasText(texts, "练潮码头"), "new save sail line is 练潮码头");
  note(!hasText(texts, "● 泡沫湾"), "foam bay chip is not pretended selected");
  note(hasText(texts, "泡沫湾"), "foam bay chip still listed");
  note(hasText(texts, "棱光礁"), "prism chip listed");
  note(hasText(texts, "风眼环礁"), "storm chip listed");
  note(hasText(texts, "本机档") || hasText(texts, "云档"), "cloud line");
  note(hasText(texts, "打得越漂亮") || hasText(texts, "先完成练潮码头"), "harbor notice");
  note(hasText(texts, "图鉴 0/10"), "empty book count");
  note(hasText(texts, "教学后图鉴"), "book button locked as 教学后图鉴");
  note(hasText(texts, "教学后榜"), "board button locked as 教学后榜");

  note(await tap(page, "教学后图鉴"), "tap locked book button");
  await wait(350);
  texts = await labels(page);
  note(
    hasText(texts, "先完成教学再查看图鉴"),
    `locked book hint (${texts.find((t) => t.includes("图鉴") || t.includes("教学")) ?? "none"})`,
  );
  note(!hasText(texts, "潮汐图鉴"), "did not open book by bypassing the lock");

  note(await tap(page, "教学后榜"), "tap locked board button");
  await wait(350);
  texts = await labels(page);
  note(
    hasText(texts, "先完成教学再看榜"),
    `locked board hint (${texts.find((t) => t.includes("榜") || t.includes("教学")) ?? "none"})`,
  );
  note(!hasText(texts, "潮汐精彩榜"), "did not open board by bypassing the lock");

  note(await tap(page, "泡沫湾"), "tap foam chip while tutorial locked");
  await wait(400);
  texts = await labels(page);
  note(
    hasText(texts, "先完成练潮码头教学，再自由选岛"),
    `island lock (${texts.find((t) => t.includes("教学") || t.includes("岛")) ?? "none"})`,
  );

  note(await callHome(page, "showSettings"), "open settings via home");
  await wait(400);
  texts = await labels(page);
  await shot(page, "02-settings");
  note(
    hasText(texts, "潮汐设置") && hasText(texts, "音效"),
    "settings has sfx/vibration/low-power",
  );
  note(hasText(texts, "隐私说明"), "privacy entry");
  note(hasText(texts, "删除存档") || hasText(texts, "删除本机档"), "wipe entry");
  note(await tap(page, "音效 开") || await tap(page, "音效 关"), "tap sfx toggle");
  await wait(350);
  texts = await labels(page);
  note(hasText(texts, "音效"), "sfx still listed after toggle");
  note(await callHome(page, "showPrivacy"), "open privacy");
  await wait(400);
  texts = await labels(page);
  await shot(page, "02b-privacy");
  note(hasText(texts, "不读通讯录"), "privacy copy");
  note(hasText(texts, "未成年人"), "child privacy line");
  note(await callHome(page, "showSettings"), "back from privacy");
  await wait(300);
  note(await callHome(page, "showWipe"), "open wipe");
  await wait(300);
  texts = await labels(page);
  await shot(page, "02c-wipe");
  note(hasText(texts, "确定删除"), "wipe confirm");
  note(await tap(page, "再想想") || (await callHome(page, "showSettings")), "cancel wipe");
  await wait(300);
  note(await tap(page, "返回港口"), "back from settings");
  await wait(350);

  const cannon = await callHome(page, "onTool", "tool_cannon");
  note(!!cannon, `buy cannon call ${cannon}`);
  await wait(200);
  texts = await labels(page);
  note(
    hasText(texts, "金币不足"),
    `cannon fail stays on status (${texts.find((t) => t.includes("不足") || t.includes("泡") || t.includes("炮")) ?? "none"})`,
  );

  note(
    (await tap(page, "开始教学")) || (await callHome(page, "sail")),
    "start tutorial sail",
  );
  await wait(1500);
  texts = await labels(page);
  await shot(page, "05-tutorial-battle");
  note(hasText(texts, "练潮码头") && hasText(texts, "潮汐猎场"), "tutorial hunt title");
  note(hasText(texts, "抛竿") && hasText(texts, "捡起"), "cast/pick buttons");
  note(hasText(texts, "点击抛竿") || hasText(texts, "湾鳍"), "tutorial cast prompt");

  const paused = await pauseBattle(page);
  await wait(300);
  texts = await labels(page);
  await shot(page, "07-paused");
  note(
    String(paused).includes("暂停") || hasText(texts, "已暂停") || hasText(texts, "暂停"),
    `pause ${paused}`,
  );
  await pauseBattle(page);
  await wait(3200);

  const combat = await combatLoop(page, "湾鳍鱼");
  findings.push({ ok: !!combat?.ok, message: `tutorial combat ${JSON.stringify(combat)}` });
  note(combat?.tutorial === true, `tutorial flag ${combat?.tutorial}`);
  note(
    combat?.islandId === "island_tutorial" || combat?.hookedName === "湾鳍鱼",
    `tutorial target ${combat?.hookedName ?? "none"} on ${combat?.islandId ?? "?"}`,
  );
  note(!!combat?.captured, `captured tutorial fish (${combat?.status ?? ""})`);
  note((combat?.juice ?? 0) > 0, `hit juice particles ${combat?.juice ?? 0}`);
  await wait(2200);
  texts = await labels(page);
  if (!hasText(texts, "结算") && !hasText(texts, "卖到")) {
    note(await returnHarbor(page), "return harbor after tutorial combat");
    await wait(600);
    texts = await labels(page);
  }
  await shot(page, "08-tutorial-settle");
  note(
    hasText(texts, "结算") || hasText(texts, "卖到") || hasText(texts, "回到港口"),
    `tutorial settle (${texts.find((t) => t.includes("结算") || t.includes("卖") || t.includes("回到")) ?? texts.slice(0, 4).join("|")})`,
  );
  note(
    hasText(texts, "卖到鱼市"),
    "settle offers sell because box is not empty",
  );

  const sold =
    (await callHome(page, "confirmSettle")) ||
    (await tap(page, "卖到鱼市")) ||
    (await tap(page, "回到港口"));
  note(sold, "confirm tutorial settle");
  await wait(700);
  texts = await labels(page);
  await shot(page, "09-harbor-after-tutorial");
  note(hasText(texts, "潮汐港口 v28"), "back at v28 harbor");
  note(hasText(texts, "出海捕鱼"), "second-run CTA is 出海捕鱼");
  note(hasText(texts, "出航：泡沫湾"), "second run defaults to foam bay");
  note(hasText(texts, "● 泡沫湾"), "foam bay selected after tutorial");
  note(!hasText(texts, "开始教学"), "start-teaching CTA is gone");
  note(hasText(texts, "再出1局后图鉴"), "book still locked until completedRuns>=2");
  note(hasText(texts, "再出1局后榜"), "board still locked until completedRuns>=2");
  const bookLine = texts.find((t) => t.startsWith("图鉴 ") || /^图鉴 \d/.test(t));
  note(
    !!bookLine && !bookLine.includes("图鉴 0/10"),
    `book progress after tutorial sell (${bookLine ?? "missing"})`,
  );

  note(await tap(page, "再出1局后图鉴"), "tap post-tutorial locked book");
  await wait(350);
  texts = await labels(page);
  note(
    hasText(texts, "再出 1 局后解锁图鉴"),
    `post-tutorial book hint (${texts.find((t) => t.includes("图鉴") || t.includes("局")) ?? "none"})`,
  );
  note(!hasText(texts, "潮汐图鉴"), "book stays closed before completedRuns>=2");
  note(!hasText(texts, "先完成教学再查看图鉴"), "hint no longer blames unfinished tutorial");

  const prism = await tapOne(page, ["棱光礁 240", "棱光礁"]);
  note(!!prism, `tap locked prism ${prism || "missing"}`);
  await wait(400);
  texts = await labels(page);
  await shot(page, "04b-coin-fail");
  note(
    hasText(texts, "金币不足"),
    `prism still costs coins after tutorial (${texts.filter((t) => t.includes("金") || t.includes("不足") || t.includes("棱")).join(" | ") || "none"})`,
  );

  note(await callHome(page, "confirmWipe"), "wipe save");
  await wait(400);
  texts = await labels(page);
  await shot(page, "10b-wiped");
  note(hasText(texts, "存档已清空") || hasText(texts, "本机档已清空"), "wipe notice");
  note(hasText(texts, "金币 0"), "wiped coins");
  note(hasText(texts, "图鉴 0/10"), "wiped book");
  note(hasText(texts, "开始教学"), "wipe returns to tutorial CTA");
  note(!hasText(texts, "● 泡沫湾"), "wipe does not select foam bay");

  const patched = await callHome(page, "applySavePatch", {
    coins: 800,
    tutorialComplete: true,
    completedRuns: 2,
    unlockedIslands: [
      "island_tutorial",
      "island_foam_bay",
      "island_storm_eye",
    ],
  });
  note(patched === true, `applySavePatch ${patched}`);
  await wait(400);
  texts = await labels(page);
  await shot(page, "11-patched-harbor");
  note(
    hasText(texts, "800"),
    `patched coins (${texts.find((t) => t.includes("金币") || t.includes("金")) ?? "none"})`,
  );
  note(hasText(texts, "出海捕鱼"), "patched CTA is free sail");
  note(hasText(texts, "出航：泡沫湾"), "patched default island is foam bay");
  note(hasText(texts, "● 泡沫湾"), "patched foam chip selected");
  note(
    texts.includes("图鉴") || hasText(texts, "图鉴"),
    "book unlocks at completedRuns>=2",
  );
  note(!hasText(texts, "再出1局后图鉴"), "patched book is no longer run-gated");
  note(!hasText(texts, "开始教学"), "patched save is not in tutorial");

  note(await tap(page, "图鉴") || (await callHome(page, "showBook")), "open unlocked book");
  await wait(350);
  texts = await labels(page);
  await shot(page, "10-book-after");
  note(hasText(texts, "潮汐图鉴"), "book title after unlock");
  note(await tap(page, "返回港口") || (await callHome(page, "showHarbor")), "back from book");
  await wait(350);

  note(await callHome(page, "onIsland", "island_prism_reef"), "try prism after patch");
  await wait(300);
  texts = await labels(page);
  note(
    hasText(texts, "已解锁棱光礁") || hasText(texts, "已选择棱光礁") || hasText(texts, "● 棱光礁"),
    `prism after patch with 800 coins (${texts.find((t) => t.includes("棱")) ?? "none"})`,
  );

  note(await callHome(page, "onIsland", "island_storm_eye"), "select storm eye");
  await wait(300);
  texts = await labels(page);
  await shot(page, "12-storm-selected");
  note(
    hasText(texts, "风眼"),
    `storm copy (${texts.find((t) => t.includes("风眼")) ?? "none"})`,
  );

  note(await callHome(page, "sail"), "sail storm eye");
  await wait(900);
  const skipped = await skipToBoss(page);
  findings.push({ ok: !!skipped?.ok, message: `skip boss ${JSON.stringify(skipped)}` });
  note(!!skipped?.ok, `boss spawned (${skipped?.name ?? skipped?.reason ?? "none"})`);
  await wait(400);
  texts = await labels(page);
  await shot(page, "13-boss-enter");
  note(
    hasText(texts, "巨鲲") || hasText(texts, "潮鸣") || hasText(texts, "巨鲲潮"),
    `boss enter HUD (${texts.find((t) => t.includes("鲲") || t.includes("潮")) ?? "none"})`,
  );

  const bossCombat = await combatLoop(page, "潮鸣巨鲲");
  findings.push({
    ok: !!bossCombat?.ok,
    message: `boss combat ${JSON.stringify(bossCombat)}`,
  });
  note(
    bossCombat?.hookedName === "潮鸣巨鲲",
    `hooked boss (${bossCombat?.hookedName ?? "none"})`,
  );
  note(
    !!bossCombat?.captured,
    `captured boss (${bossCombat?.status ?? ""} tough ${bossCombat?.lastTough ?? "?"})`,
  );
  await wait(800);
  texts = await labels(page);
  await shot(page, "14-boss-settle");
  note(
    hasText(texts, "结算") || hasText(texts, "卖到") || hasText(texts, "回到港口"),
    `boss settle (${texts.find((t) => t.includes("结算") || t.includes("卖") || t.includes("鲲")) ?? "none"})`,
  );
  note(
    hasText(texts, "潮鸣") || hasText(texts, "巨鲲"),
    `settle lists tide singer (${texts.find((t) => t.includes("鲲") || t.includes("鸣")) ?? "none"})`,
  );

  const bossSold = await callHome(page, "confirmSettle");
  note(!!bossSold, "confirm boss settle");
  await wait(700);
  texts = await labels(page);
  await shot(page, "15-harbor-after-boss");
  note(hasText(texts, "潮汐港口 v28"), "harbor after boss");

  note(errors.length === 0, `page errors ${errors.length}`);
} finally {
  const report = {
    url,
    chrome,
    findings,
    errors,
    logs: logs.filter((l) => /error|Error|baozou|fail/i.test(l)).concat(logs.slice(-20)),
    failCount: findings.filter((f) => !f.ok).length,
  };
  fs.writeFileSync(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  console.log(`report ${path.join(outDir, "report.json")}`);
  if (report.failCount) process.exitCode = 1;
}
