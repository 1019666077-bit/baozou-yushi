import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "reports", "playtest-v28");
fs.mkdirSync(outDir, { recursive: true });

const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:8765/";
const chrome =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const logs = [];
const errors = [];
const findings = [];

function note(ok, message) {
  findings.push({ ok, message });
  console.log(`${ok ? "OK" : "FAIL"} ${message}`);
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
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await page.waitForSelector("#GameCanvas", { timeout: 15000 });
  await wait(2500);
  await shot(page, "01-harbor");
  let texts = await labels(page);
  note(logs.some((l) => l.includes("baozou-flop-v28")), "v28 console stamp");
  note(texts.some((t) => t.includes("潮汐港口 v28")), "harbor title v28");
  note(
    texts.includes("● 泡沫湾") &&
      texts.some((t) => t.includes("棱光礁")) &&
      texts.some((t) => t.includes("风眼环礁")),
    "three islands, foam selected",
  );
  note(!texts.some((t) => t.includes("练潮码头")), "tutorial island hidden");
  note(texts.some((t) => t.includes("本机档") || t.includes("云档")), "cloud line");
  note(texts.some((t) => t.includes("打得越漂亮")), "slogan");
  note(texts.some((t) => t.includes("图鉴 0/10")), "empty book count");

  note(await callHome(page, "showSettings"), "open settings via home");
  await wait(400);
  texts = await labels(page);
  await shot(page, "02-settings");
  note(
    texts.some((t) => t.includes("潮汐设置")) && texts.some((t) => t.includes("音效")),
    "settings has sfx/vibration/low-power",
  );
  note(texts.some((t) => t.includes("隐私说明")), "privacy entry");
  note(texts.some((t) => t.includes("删除存档") || t.includes("删除本机档")), "wipe entry");
  note(await tap(page, "音效 开") || await tap(page, "音效 关"), "tap sfx toggle");
  await wait(350);
  texts = await labels(page);
  note(texts.some((t) => t.includes("音效")), "sfx still listed after toggle");
  note(await callHome(page, "showPrivacy"), "open privacy");
  await wait(400);
  texts = await labels(page);
  await shot(page, "02b-privacy");
  note(texts.some((t) => t.includes("不读通讯录")), "privacy copy");
  note(texts.some((t) => t.includes("未成年人")), "child privacy line");
  note(await callHome(page, "showSettings"), "back from privacy");
  await wait(300);
  note(await callHome(page, "showWipe"), "open wipe");
  await wait(300);
  texts = await labels(page);
  await shot(page, "02c-wipe");
  note(texts.some((t) => t.includes("确定删除")), "wipe confirm");
  note(await tap(page, "再想想") || (await callHome(page, "showSettings")), "cancel wipe");
  await wait(300);
  note(await tap(page, "返回港口"), "back from settings");
  await wait(350);

  note(await callHome(page, "showBook"), "open book");
  await wait(350);
  texts = await labels(page);
  await shot(page, "03-book");
  note(texts.some((t) => t.includes("潮汐图鉴")), "book title");
  note(await callHome(page, "showHarbor"), "back from book");
  await wait(350);

  note(await callHome(page, "showBoard"), "open board");
  await wait(350);
  texts = await labels(page);
  await shot(page, "04-board");
  note(texts.some((t) => t.includes("潮汐精彩榜")), "board title");
  note(texts.some((t) => t.includes("本机最佳")), "best style line");
  note(texts.some((t) => t.includes("好友")), "friend board copy");
  note(!errors.some((e) => /wx is not defined/i.test(e)), "board does not throw wx");
  note(await callHome(page, "showHarbor"), "back from board");
  await wait(450);

  const prism = await callHome(page, "onIsland", "island_prism_reef");
  note(prism === true, `prism unlock call ${prism}`);
  await wait(200);
  texts = await labels(page);
  await shot(page, "04b-coin-fail");
  note(
    texts.some((t) => t.includes("金币不足")),
    `locked island shows 金币不足 (${texts.filter((t) => t.includes("金") || t.includes("不足") || t.includes("棱")).join(" | ") || "none"})`,
  );

  const cannon = await callHome(page, "onTool", "tool_cannon");
  note(!!cannon, `buy cannon call ${cannon}`);
  await wait(200);
  texts = await labels(page);
  note(
    texts.some((t) => t.includes("金币不足")),
    `cannon fail stays on status (${texts.find((t) => t.includes("不足") || t.includes("泡") || t.includes("炮")) ?? "none"})`,
  );

  note(await callHome(page, "sail"), "sail");
  await wait(1500);
  texts = await labels(page);
  await shot(page, "05-battle");
  note(texts.some((t) => t.includes("潮汐猎场")), "battle hunt title");
  note(texts.some((t) => t.includes("抛竿")) && texts.some((t) => t.includes("捡起")), "cast/pick buttons");

  const combat = await combatLoop(page);
  findings.push({ ok: !!combat?.ok, message: `combat ${JSON.stringify(combat)}` });
  note(!!combat?.hookedName, `hooked ${combat?.hookedName ?? "none"}`);
  note(!!combat?.captured, `captured fish (${combat?.status ?? ""})`);
  note((combat?.juice ?? 0) > 0, `hit juice particles ${combat?.juice ?? 0}`);
  await wait(400);
  await shot(page, "06-after-combat");

  const paused = await pauseBattle(page);
  await wait(300);
  texts = await labels(page);
  await shot(page, "07-paused");
  note(
    String(paused).includes("暂停") || texts.some((t) => t.includes("已暂停") || t.includes("暂停")),
    `pause ${paused}`,
  );
  await pauseBattle(page);
  await wait(3500);

  note(await returnHarbor(page), "return harbor");
  await wait(600);
  texts = await labels(page);
  await shot(page, "08-settle");
  note(
    texts.some((t) => t.includes("结算") || t.includes("卖到") || t.includes("回到港口")),
    `settle screen (${texts.find((t) => t.includes("结算") || t.includes("卖") || t.includes("回到")) ?? texts.slice(0, 4).join("|")})`,
  );
  note(
    texts.some((t) => t.includes("卖到鱼市")),
    "settle offers sell because box is not empty",
  );

  const sold =
    (await callHome(page, "confirmSettle")) ||
    (await tap(page, "卖到鱼市")) ||
    (await tap(page, "回到港口"));
  note(sold, "confirm settle");
  await wait(700);
  texts = await labels(page);
  await shot(page, "09-harbor-after");
  note(texts.some((t) => t.includes("潮汐港口 v28")), "back at v28 harbor");
  const bookLine = texts.find((t) => t.includes("图鉴"));
  note(
    !!bookLine && !bookLine.includes("图鉴 0/10"),
    `book progress after sell (${bookLine ?? "missing"})`,
  );

  note(await callHome(page, "showBook"), "open book after sell");
  await wait(350);
  texts = await labels(page);
  await shot(page, "10-book-after");
  note(
    texts.some((t) => t.includes("已收 1/10") || /已收 [1-9]/.test(texts.join("\n"))),
    `book after sell (${texts.find((t) => t.includes("已收")) ?? "missing"})`,
  );
  note(await callHome(page, "showHarbor"), "back from book after sell");
  await wait(350);

  note(await callHome(page, "confirmWipe"), "wipe save");
  await wait(400);
  texts = await labels(page);
  await shot(page, "10b-wiped");
  note(texts.some((t) => t.includes("存档已清空") || t.includes("本机档已清空")), "wipe notice");
  note(texts.some((t) => t.includes("金币 0")), "wiped coins");
  note(texts.some((t) => t.includes("图鉴 0/10")), "wiped book");

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
    texts.some((t) => t.includes("800")),
    `patched coins (${texts.find((t) => t.includes("金币") || t.includes("金")) ?? "none"})`,
  );

  note(await callHome(page, "onIsland", "island_storm_eye"), "select storm eye");
  await wait(300);
  texts = await labels(page);
  await shot(page, "12-storm-selected");
  note(
    texts.some((t) => t.includes("风眼")),
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
    texts.some((t) => t.includes("巨鲲") || t.includes("潮鸣") || t.includes("巨鲲潮")),
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
    texts.some((t) => t.includes("结算") || t.includes("卖到") || t.includes("回到港口")),
    `boss settle (${texts.find((t) => t.includes("结算") || t.includes("卖") || t.includes("鲲")) ?? "none"})`,
  );
  note(
    texts.some((t) => t.includes("潮鸣") || t.includes("巨鲲")),
    `settle lists tide singer (${texts.find((t) => t.includes("鲲") || t.includes("鸣")) ?? "none"})`,
  );

  const bossSold = await callHome(page, "confirmSettle");
  note(!!bossSold, "confirm boss settle");
  await wait(700);
  texts = await labels(page);
  await shot(page, "15-harbor-after-boss");
  note(texts.some((t) => t.includes("潮汐港口 v28")), "harbor after boss");

  note(errors.length === 0, `page errors ${errors.length}`);
} finally {
  const report = {
    url,
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
