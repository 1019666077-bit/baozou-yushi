/**
 * 把领域层 TS 编成 ESM，供第一局体验代理读取真实文案与数值。
 * 非 Cocos 实机。generated/ 不提交。
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, "tools/first-run-preview/generated");
const domainDir = path.join(root, "assets/scripts/domain");

const FILES = [
  "GameFeel.ts",
  "CloudCopy.ts",
  "PrivacyCopy.ts",
  "HarborCopy.ts",
  "FlopPhysics.ts",
  "GrayLook.ts",
  "ArtRecipe.ts",
  "CameraFeel.ts",
  "ProcGeom.ts",
  "HitJuice.ts",
  "SfxFeel.ts",
  "IslandClock.ts",
  "PriceCalculator.ts",
  "StyleScoreSystem.ts",
  "TutorialFlow.ts",
  "StyleCallout.ts",
  "SettleCopy.ts",
  "RunSession.ts",
  "SaveMerge.ts",
];

function compile() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const tsc = path.join(root, "node_modules/typescript/bin/tsc");
  const result = spawnSync(
    process.execPath,
    [tsc, "-p", path.join(root, "tools/first-run-preview/tsconfig.extract.json")],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`tsc extract failed:\n${result.stdout}\n${result.stderr}`);
  }
  const missing = FILES.filter(
    (file) => !fs.existsSync(path.join(outDir, "domain", file.replace(/\.ts$/, ".js"))),
  );
  if (missing.length) {
    throw new Error(`extract missing ${missing.join(", ")}`);
  }
}

function snapshot() {
  const require = createRequire(import.meta.url);
  const load = (name) => require(path.join(outDir, "domain", `${name}.js`));
  const TutorialFlow = load("TutorialFlow");
  const SettleCopy = load("SettleCopy");
  const GameFeel = load("GameFeel");
  const StyleCallout = load("StyleCallout");
  const CloudCopy = load("CloudCopy");
  const PrivacyCopy = load("PrivacyCopy");
  const HarborCopy = load("HarborCopy");
  const IslandClock = load("IslandClock");
  const GrayLook = load("GrayLook");
  const ArtRecipe = load("ArtRecipe");
  const CameraFeel = load("CameraFeel");
  const ProcGeom = load("ProcGeom");
  const FlopPhysics = load("FlopPhysics");
  const SaveMerge = load("SaveMerge");
  const HitJuice = load("HitJuice");
  const SfxFeel = load("SfxFeel");
  const { RunSession } = load("RunSession");

  const islands = JSON.parse(
    fs.readFileSync(path.join(root, "assets/config/islands.json"), "utf8"),
  );
  const fish = JSON.parse(fs.readFileSync(path.join(root, "assets/config/fish.json"), "utf8"));
  const tools = JSON.parse(fs.readFileSync(path.join(root, "assets/config/tools.json"), "utf8"));
  const remote = JSON.parse(
    fs.readFileSync(path.join(root, "assets/config/remote-default.json"), "utf8"),
  );

  const bayfin = fish.find((item) => item.id === "fish_bayfin");
  const session = new RunSession("proxy_first_run", "island_tutorial", "tool_rod", 1, 1);
  session.addStyle({ action: "weakPoint", atMs: 800, quality: 1 });
  const sold = session.capture(bayfin, 1, 1600, remote.economyScale ?? 1);
  const summary = session.finish(2000);
  const defaultSave = SaveMerge.createDefaultSave(0);
  const after = SettleCopy.applyRunRewards(defaultSave, summary);
  const tutorialIsland = islands.find((item) => item.id === TutorialFlow.TUTORIAL_ISLAND_ID);
  const foam = islands.find((item) => item.id === TutorialFlow.DEFAULT_SAIL_ISLAND_ID);
  const rod = tools.find((item) => item.id === "tool_rod");
  const nextRod = rod.levels.find((level) => level.level === 2);

  const newSave = { tutorialComplete: false, completedRuns: 0 };
  const afterSave = {
    tutorialComplete: after.tutorialComplete,
    completedRuns: after.completedRuns,
  };

  const data = {
    proxy: true,
    disclaimer: "非 Cocos 实机，仅体验代理。2D 代理 ≠ Creator 3D 实机 · 3D 港湾/低模鱼请本机打开 Boot.scene",
    sourceStamp: "baozou-flop-v29",
    harborTitle: "暴走鱼市 · 潮汐港口 v28",
    huntSuffix: "潮汐猎场",
    castButton: "抛竿",
    pickButton: "捡起",
    pauseButton: "暂停",
    returnButton: "回港",
    settingsButton: "设置",
    crateLabel: "鱼箱",
    inboxButton: TutorialFlow.inboxBarCaption(),
    harborToastHoldSeconds: TutorialFlow.harborToastHoldSeconds(),
    waitingCast: "等待抛竿",
    settleTitle: "潮汐鱼市结算",
    sellCaption: "卖到鱼市",
    backHarbor: "回到港口",
    returnHarborBtn: "返回港口",
    waveStart: "热身潮。拽上岸，砸晕，搬进鱼箱。",
    weakBreak: "弱点击破！韧性 0",
    stunnedPick: "砸晕了！点捡起，搬去左边鱼箱。",
    leaveBlocked: "先抛竿、打中、入箱，再回港卖。",
    islandLock: "先完成练潮码头教学，再自由选岛。",
    settleLeaveAutoMs: TutorialFlow.SETTLE_LEAVE_AUTO_MS,
    calloutHoldMs: GameFeel.calloutHoldMs(),
    juiceShakePx: HitJuice.juiceShakePx("weak", false),
    juiceShakeSeconds: HitJuice.juiceShakeSeconds(false),
    bookLockNew: TutorialFlow.harborFeatureLockedHint("book", newSave),
    boardLockNew: TutorialFlow.harborFeatureLockedHint("board", newSave),
    upgradeLockNew: TutorialFlow.harborFeatureLockedHint("upgrade", newSave),
    bookLockAfter: TutorialFlow.harborFeatureLockedHint("book", afterSave),
    boardLockAfter: TutorialFlow.harborFeatureLockedHint("board", afterSave),
    tutorialPrompts: {
      cast: TutorialFlow.tutorialPrompt("cast"),
      weakPoint: TutorialFlow.tutorialPrompt("weakPoint"),
      reel: TutorialFlow.tutorialPrompt("reel"),
      carrying: TutorialFlow.tutorialPrompt("reel", { carrying: true }),
      settle: TutorialFlow.tutorialPrompt("settle"),
    },
    harborPrompts: {
      newSail: TutorialFlow.harborNextPrompt("sail", false),
      sell: TutorialFlow.harborNextPrompt("sell"),
      upgrade: TutorialFlow.harborNextPrompt("upgrade"),
      freeSail: TutorialFlow.harborNextPrompt("sail", true),
    },
    sailCaptionNew: TutorialFlow.harborSailCaption(false),
    sailCaptionAfter: TutorialFlow.harborSailCaption(true),
    featureLabelsNew: {
      upgrade: TutorialFlow.harborFeatureButtonLabel("upgrade", newSave),
      book: TutorialFlow.harborFeatureButtonLabel("book", newSave),
      board: TutorialFlow.harborFeatureButtonLabel("board", newSave),
    },
    featureLabelsAfter: {
      upgrade: nextRod ? `升级${rod.name}` : TutorialFlow.harborFeatureButtonLabel("upgrade", afterSave),
      book: TutorialFlow.harborFeatureButtonLabel("book", afterSave),
      board: TutorialFlow.harborFeatureButtonLabel("board", afterSave),
    },
    cloudLine: CloudCopy.cloudStatusLine("local"),
    healthLine: PrivacyCopy.healthAdviceLines()[1],
    remoteNotice: CloudCopy.harborNotice(remote.notice),
    coinFail: HarborCopy.harborFailCopy(new Error("Insufficient coins: need 90")),
    colors: {
      primaryFill: GameFeel.buttonFillRgb("primary"),
      secondaryFill: GameFeel.buttonFillRgb("secondary"),
      primaryInk: GameFeel.buttonLabelRgb("primary"),
      secondaryInk: GameFeel.buttonLabelRgb("secondary"),
      gold: GameFeel.goldHudRgb(),
      cream: GameFeel.creamInkRgb(),
      strokePrimary: GameFeel.buttonStrokeRgb("primary"),
      strokeSecondary: GameFeel.buttonStrokeRgb("secondary"),
      palette: GameFeel.feelPalette(),
    },
    button: {
      radius: GameFeel.buttonRadius(),
      strokePrimary: GameFeel.buttonStrokeWidth("primary"),
      strokeSecondary: GameFeel.buttonStrokeWidth("secondary"),
      hero: GameFeel.buttonSpec("hero"),
      bar: GameFeel.buttonSpec("bar"),
      chip: GameFeel.buttonSpec("chip"),
      mini: GameFeel.buttonSpec("mini"),
    },
    plate: {
      fill: GameFeel.plateFillRgba(true),
      fillIdle: GameFeel.plateFillRgba(false),
      stroke: GameFeel.plateStrokeRgba(true),
      size: GameFeel.plateSize(),
    },
    coinJumpSeconds: GameFeel.coinJumpSeconds(),
    tutorialTones: {
      cast: {
        cast: TutorialFlow.tutorialBarButtonTone("cast", "cast"),
        pickUp: TutorialFlow.tutorialBarButtonTone("cast", "pickUp"),
      },
      weakPoint: {
        cast: TutorialFlow.tutorialBarButtonTone("weakPoint", "cast"),
        pickUp: TutorialFlow.tutorialBarButtonTone("weakPoint", "pickUp"),
      },
      reel: {
        cast: TutorialFlow.tutorialBarButtonTone("reel", "cast"),
        pickUp: TutorialFlow.tutorialBarButtonTone("reel", "pickUp"),
      },
      carrying: {
        cast: TutorialFlow.tutorialBarButtonTone("reel", "cast", { carrying: true }),
        pickUp: TutorialFlow.tutorialBarButtonTone("reel", "pickUp", { carrying: true }),
      },
    },
    barVisible: {
      carryingCast: TutorialFlow.battleBarButtonVisible({ carrying: true }, "cast"),
      carryingPick: TutorialFlow.battleBarButtonVisible({ carrying: true }, "pickUp"),
      idleCast: TutorialFlow.battleBarButtonVisible({ carrying: false }, "cast"),
    },
    inboxCtaVisible: {
      carrying: TutorialFlow.battleInboxCtaVisible({ carrying: true }),
      idle: TutorialFlow.battleInboxCtaVisible({ carrying: false }),
    },
    hudShowMeta: {
      justSold: TutorialFlow.harborHudShowMeta("justSold"),
      toast: TutorialFlow.harborHudShowMeta("toast"),
      idle: TutorialFlow.harborHudShowMeta("idle"),
    },
    waveOnCast: TutorialFlow.battleWaveNarration(
      true,
      "cast",
      TutorialFlow.waveStartNarration(0),
    ),
    harborCtaAfter: TutorialFlow.harborNextCta({
      tutorialComplete: after.tutorialComplete,
      completedRuns: after.completedRuns,
      pendingSell: false,
      upgradeUnlocked: true,
      coins: after.coins,
      nextUpgradeCost: nextRod?.upgradeCost,
    }),
    harborGoalAfter: TutorialFlow.harborGoalPrompt({
      tutorialComplete: after.tutorialComplete,
      completedRuns: after.completedRuns,
      coins: after.coins,
      nextUpgradeCost: nextRod?.upgradeCost,
      upgradeUnlocked: true,
    }),
    looks: {
      harbor: GrayLook.islandLook("island_foam_bay", true),
      tutorial: GrayLook.islandLook(TutorialFlow.TUTORIAL_ISLAND_ID),
      foam: GrayLook.islandLook("island_foam_bay"),
      prism: GrayLook.islandLook("island_prism_reef"),
      storm: GrayLook.islandLook("island_storm_eye"),
      bayfin: GrayLook.fishLook("fish_bayfin"),
    },
    art: {
      harbor: ArtRecipe.islandSetOps("island_foam_bay", true, 0),
      tutorial: ArtRecipe.islandSetOps(TutorialFlow.TUTORIAL_ISLAND_ID, false, 0),
      dock: ArtRecipe.dockOps(),
      boat: ArtRecipe.boatOps(),
      crate: ArtRecipe.crateOps(),
      bayfinIdle: ArtRecipe.fishOps("fish_bayfin", 1, {
        decoy: false,
        armored: false,
        hit: false,
        hooked: false,
        flashing: false,
        face: "idle",
      }),
      bayfinHooked: ArtRecipe.fishOps("fish_bayfin", 1, {
        decoy: false,
        armored: false,
        hit: false,
        hooked: true,
        flashing: true,
        face: "hooked",
      }),
      bayfinStunned: ArtRecipe.fishOps("fish_bayfin", 1, {
        decoy: false,
        armored: false,
        hit: true,
        hooked: false,
        flashing: false,
        face: "stunned",
      }),
      bayfinCarry: ArtRecipe.fishOps("fish_bayfin", 1, {
        decoy: false,
        armored: false,
        hit: false,
        hooked: false,
        flashing: false,
        face: "carry",
      }),
    },
    stage3d: {
      proxyIsNotCreator: true,
      budget: ProcGeom.STAGE_BUDGET,
      camRest: CameraFeel.CAM_REST,
      smashSeconds: CameraFeel.CAM_FEEL.smashSeconds,
    },
    flopFeel: {
      yank: FlopPhysics.YANK_FEEL,
      flop: FlopPhysics.FLOP_FEEL,
      knock: FlopPhysics.KNOCK_FEEL,
      carry: FlopPhysics.CARRY_FEEL,
      dockX: FlopPhysics.DOCK_X,
      deckY: FlopPhysics.DECK_Y,
      carryWalkSeconds: FlopPhysics.carryWalkSeconds(),
    },
    islands: GrayLook.harborIslandIds().map((id) => {
      const island = islands.find((item) => item.id === id);
      return {
        id,
        name: island.name,
        unlockCost: island.unlockCost,
        x: GrayLook.harborIslandX(id),
        chipNew: TutorialFlow.harborIslandChipCaption({
          name: island.name,
          unlockCost: island.unlockCost,
          unlocked: defaultSave.unlockedIslands.includes(id),
          selected: false,
          tutorialComplete: false,
        }),
        chipAfter: TutorialFlow.harborIslandChipCaption({
          name: island.name,
          unlockCost: island.unlockCost,
          unlocked: after.unlockedIslands.includes(id),
          selected: id === foam.id,
          tutorialComplete: after.tutorialComplete,
        }),
      };
    }),
    tools: tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
    })),
    tutorialIsland: {
      id: tutorialIsland.id,
      name: tutorialIsland.name,
      remaining: IslandClock.wavesTotalSeconds(tutorialIsland.waves),
      clock: `${IslandClock.waveCaption("wave", 0)} ${IslandClock.formatClock(
        IslandClock.wavesTotalSeconds(tutorialIsland.waves),
      )}`,
    },
    foamName: foam.name,
    rodName: rod.name,
    nextUpgradeCost: nextRod?.upgradeCost ?? 90,
    bookTotal: fish.length,
    fishCountNew: `图鉴 0/${fish.length}`,
    fishCountAfter: `图鉴 1/${fish.length}`,
    sailLineNew: `出航：${tutorialIsland.name} · ${rod.name} Lv1${nextRod ? ` · 下级${nextRod.upgradeCost}金` : " · 满级"}`,
    sailLineAfter: `出航：${foam.name} · ${rod.name} Lv1${nextRod ? ` · 下级${nextRod.upgradeCost}金` : " · 满级"}`,
    firstRun: {
      sold,
      summary,
      headline: SettleCopy.settleHeadline(summary),
      rows: SettleCopy.settleRows(summary, (id) => fish.find((item) => item.id === id).name, []),
      slogan: SettleCopy.settleSlogan(summary),
      coinJump: SettleCopy.coinJumpCaption(summary.totalCoins),
      afterCoins: after.coins,
      afterTutorial: after.tutorialComplete,
      afterRuns: after.completedRuns,
      calloutWeak: StyleCallout.styleCallout({
        weakPoint: true,
        airborne: false,
        combo: 1,
      }),
      calloutHit: StyleCallout.styleCallout({
        weakPoint: false,
        airborne: false,
        combo: 1,
      }),
      inbox: StyleCallout.inboxPopup(sold.price),
      liveQuoteHooked: StyleCallout.liveQuote(bayfin, 1),
      comboHud: StyleCallout.comboHud(1, 1),
      comboHudAfter: StyleCallout.comboHud(sold.styleMultiplier, 1),
      inboxStatus: `${bayfin.name} ×${sold.styleMultiplier.toFixed(2)} → ${sold.price}金，丢进鱼箱。回港才卖。`,
      discovery: SettleCopy.discoveryToast(bayfin.name),
      sellPopup: StyleCallout.sellPopup(summary.totalCoins),
      castSnap: StyleCallout.castSnapCaption(),
    },
    crate: {
      x: TutorialFlow.TUTORIAL_CRATE_X,
      y: TutorialFlow.TUTORIAL_CRATE_Y,
    },
    weakHint: {
      x: TutorialFlow.TUTORIAL_WEAK_HINT_X,
      y: TutorialFlow.TUTORIAL_WEAK_HINT_Y,
    },
    guideTargets: {
      cast: TutorialFlow.tutorialGuideTarget("cast"),
      weakPoint: TutorialFlow.tutorialGuideTarget("weakPoint"),
      reel: TutorialFlow.tutorialGuideTarget("reel"),
      carrying: TutorialFlow.tutorialGuideTarget("reel", { carrying: true }),
      settle: TutorialFlow.tutorialGuideTarget("settle"),
    },
    guideAnchors: {
      crate: TutorialFlow.tutorialGuideAnchor("crate"),
      weakPoint: TutorialFlow.tutorialGuideAnchor("weakPoint"),
      return: TutorialFlow.tutorialGuideAnchor("return"),
    },
    guideRing: TutorialFlow.tutorialGuideRing(0),
    juiceCount: {
      weak: HitJuice.juiceCount("weak", false),
      catch: HitJuice.juiceCount("catch", false),
      hit: HitJuice.juiceCount("hit", false),
      cast: HitJuice.juiceCount("cast", false),
      gold: HitJuice.juiceCount("gold", false),
      sell: HitJuice.juiceCount("sell", false),
      smash: HitJuice.juiceCount("smash", false),
      yank: HitJuice.juiceCount("yank", false),
    },
    juiceFlash: {
      weak: HitJuice.spawnJuiceFlash("weak", 0, 0, false),
      sell: HitJuice.spawnJuiceFlash("sell", 0, 0, false),
    },
    sfx: {
      cast: SfxFeel.sfxTone("cast"),
      weak: SfxFeel.sfxTone("weak"),
      catch: SfxFeel.sfxTone("catch"),
      sell: SfxFeel.sfxTone("sell"),
      ui: SfxFeel.sfxTone("ui"),
    },
  };

  const copyModule = `/* generated from assets/scripts/domain — 非 Cocos 实机，仅体验代理 */
export const COPY = ${JSON.stringify(data, null, 2)};
`;
  fs.writeFileSync(path.join(outDir, "copy.mjs"), copyModule);
  fs.writeFileSync(path.join(outDir, "copy.json"), `${JSON.stringify(data, null, 2)}\n`);
  return data;
}

compile();
const data = snapshot();
console.log(
  `extracted first-run ${data.firstRun.sold.price}金 ×${data.firstRun.sold.styleMultiplier} ${data.firstRun.inbox}`,
);
