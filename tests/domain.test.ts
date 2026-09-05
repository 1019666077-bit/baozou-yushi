import { describe, expect, it } from "vitest";
import type {
  FishConfig,
  PlayerSave,
  RunSummary,
  ToolConfig,
} from "../assets/scripts/data/types";
import { BattleStateMachine } from "../assets/scripts/domain/BattleStateMachine";
import { CaptureEngine } from "../assets/scripts/domain/CaptureEngine";
import { PriceCalculator } from "../assets/scripts/domain/PriceCalculator";
import { harborFailCopy } from "../assets/scripts/domain/HarborCopy";
import { ProgressionSystem } from "../assets/scripts/domain/ProgressionSystem";
import {
  createDefaultSave,
  mergeSaves,
} from "../assets/scripts/domain/SaveMerge";
import { StyleScoreSystem } from "../assets/scripts/domain/StyleScoreSystem";
import { validateRun } from "../cloudfunctions/shared/ScoreValidator";
import { validSave } from "../cloudfunctions/shared/SaveValidator";
import { fishIdsForIsland } from "../assets/scripts/content/IslandFishPool";
import {
  classifyHit,
  projectShot,
  reelTimingError,
} from "../assets/scripts/domain/AimSolve";
import {
  MAX_LIVE_SHOTS,
  keepLiveShots,
  shotHitsTarget,
  shotPassedTarget,
  spawnShot,
  tickShot,
} from "../assets/scripts/domain/ShotFlight";
import {
  bossPhaseIndex,
  decoyOffsets,
  poseForBehavior,
  shieldDamageScale,
  shotFromFront,
} from "../assets/scripts/domain/FishBehavior";
import {
  bossMoveForPhase,
  patternBeat,
  rushWindows,
  waveHits,
} from "../assets/scripts/domain/BossPattern";
import { RunSession } from "../assets/scripts/domain/RunSession";
import {
  applyRunRewards,
  bookLines,
  settleHeadline,
  settleRows,
  settleSlogan,
} from "../assets/scripts/domain/SettleCopy";
import {
  cannonHoldFire,
  harpoonCharge,
  harpoonDashBonus,
} from "../assets/scripts/domain/ToolFeel";
import {
  spawnJuice,
  tickJuice,
  juiceCount,
} from "../assets/scripts/domain/HitJuice";
import {
  BOSS_SECONDS,
  formatClock,
  runPhase,
  shouldSpawn,
  waveCaption,
} from "../assets/scripts/domain/IslandClock";
import {
  comboHud,
  liveQuote,
  styleCallout,
} from "../assets/scripts/domain/StyleCallout";
import {
  settingCaption,
  spawnCap,
  shouldVibrate,
  hitStopSeconds,
} from "../assets/scripts/domain/GameFeel";
import {
  bestStyleLine,
  boardLines,
  friendBoardHint,
} from "../assets/scripts/domain/BoardCopy";
import { depthScale } from "../assets/scripts/domain/DepthScale";
import {
  decideSailAfterPack,
  harborPackFailCopy,
  islandPackName,
  harborSailWait,
} from "../assets/scripts/domain/IslandPack";
import {
  canShowFriendBoardForSession,
  persistCloudKind,
  resolveLoginCode,
  shouldCallCloud,
  wechatSessionKind,
} from "../assets/scripts/domain/WechatSession";
import {
  beginFlop,
  crateDrop,
  isAirborne,
  knock,
  stepFlop,
  yankStep,
  bouncedOnDeck,
  canPickUp,
} from "../assets/scripts/domain/FlopPhysics";
import {
  deckKindForFish,
  toActorWorld,
  toBoatWorld,
} from "../assets/scripts/domain/DeckMap";
import {
  healthAdviceLines,
  healthAdviceTitle,
  privacyLines,
  wipeBody,
  wipeCaption,
  wipeDoneNotice,
} from "../assets/scripts/domain/PrivacyCopy";
import {
  DEFAULT_SAIL_ISLAND_ID,
  TUTORIAL_ISLAND_ID,
  advanceTutorial,
  harborChipSelected,
  harborFeatureButtonLabel,
  harborFeatureLockedHint,
  harborSailCaption,
  harborUnlocks,
  harborUnlocksForSave,
  isTutorialRun,
  nextSailIsland,
  pickupAssistDecision,
  PICKABLE_AUTO_MS,
  PICKABLE_HINT_MS,
  CARRIED_AUTO_MS,
  CARRIED_HINT_MS,
  resolveHarborIsland,
  shouldAutoReel,
  tutorialGuideTarget,
  tutorialPrompt,
} from "../assets/scripts/domain/TutorialFlow";
import { sfxTone, shouldPlaySfx } from "../assets/scripts/domain/SfxFeel";
import {
  closedIslandCaption,
  cloudStatusLine,
  harborNotice,
  islandClosed,
} from "../assets/scripts/domain/CloudCopy";
import {
  allFishSilhouettes,
  fishLook,
  harborIslandIds,
  harborIslandX,
  islandLook,
} from "../assets/scripts/domain/GrayLook";

const fish: FishConfig = {
  id: "fish_test",
  name: "测试鱼",
  tier: "normal",
  islandId: "island_test",
  toughness: 30,
  speed: 50,
  basePrice: 10,
  rarityMultiplier: 1.5,
  weakPointMultiplier: 2,
  behavior: "cruise",
  escapeSeconds: 15,
};

const tools: ToolConfig[] = [
  {
    id: "tool_rod",
    name: "鱼竿",
    kind: "rod",
    unlockIsland: "island_test",
    levels: [
      {
        level: 1,
        power: 10,
        cooldownMs: 500,
        lineStrength: 30,
        upgradeCost: 0,
      },
      {
        level: 2,
        power: 15,
        cooldownMs: 450,
        lineStrength: 50,
        upgradeCost: 100,
      },
    ],
  },
];

describe("StyleScoreSystem", () => {
  it("rewards variety and caps multiplier at 3", () => {
    const style = new StyleScoreSystem();
    style.apply({ action: "weakPoint", atMs: 1_000 });
    const varied = style.apply({ action: "airborne", atMs: 2_000 });
    expect(varied.combo).toBe(2);
    expect(varied.multiplier).toBeGreaterThan(1);
    for (let i = 0; i < 20; i++) {
      style.apply({ action: "perfectReel", atMs: 2_100 + i * 100 });
    }
    expect(style.getSnapshot().multiplier).toBe(3);
  });

  it("resets combo outside the combo window", () => {
    const style = new StyleScoreSystem();
    style.apply({ action: "weakPoint", atMs: 100 });
    const snapshot = style.apply({ action: "combo", atMs: 3_000 });
    expect(snapshot.combo).toBe(1);
  });
});

describe("PriceCalculator", () => {
  it("uses base, rarity, freshness and style", () => {
    expect(PriceCalculator.calculate(fish, 1, 2).total).toBe(30);
  });

  it("clamps manipulated multipliers", () => {
    expect(PriceCalculator.calculate(fish, 99, 99).total).toBe(54);
  });
});

describe("CaptureEngine", () => {
  it("weak-point hit doubles power and enables reeling", () => {
    const capture = new CaptureEngine(fish);
    const result = capture.hit(tools[0].levels[0], 1, true, 1.5);
    expect(result.damage).toBe(30);
    expect(result.readyToReel).toBe(true);
    expect(capture.reel(0.02, 30)).toEqual({
      captured: true,
      perfect: true,
    });
  });

  it("cannot reel before toughness reaches zero", () => {
    const capture = new CaptureEngine(fish);
    expect(capture.reel(0, 100).captured).toBe(false);
  });
});

describe("BattleStateMachine", () => {
  it("runs the capture path", () => {
    const battle = new BattleStateMachine();
    battle.transition("casting");
    battle.transition("hooked");
    battle.transition("fighting");
    battle.transition("reeling");
    battle.transition("captured");
    expect(battle.state).toBe("captured");
  });

  it("rejects impossible transitions", () => {
    const battle = new BattleStateMachine();
    expect(() => battle.transition("captured")).toThrow(
      "Invalid battle transition",
    );
  });
});

describe("ProgressionSystem", () => {
  it("purchases an upgrade immutably", () => {
    const save = { ...createDefaultSave(1), coins: 150 };
    const upgraded = ProgressionSystem.purchaseToolUpgrade(save, tools[0]);
    expect(upgraded.coins).toBe(50);
    expect(upgraded.tools[0].level).toBe(2);
    expect(save.tools[0].level).toBe(1);
  });

  it("refuses unaffordable upgrades", () => {
    expect(() =>
      ProgressionSystem.purchaseToolUpgrade(createDefaultSave(), tools[0]),
    ).toThrow("Insufficient coins");
  });

  it("shows coin shortfalls in harbor Chinese", () => {
    expect(harborFailCopy(new Error("Insufficient coins: need 380"))).toBe(
      "金币不足",
    );
  });

  it("buys a newly unlocked tool at its level-one cost", () => {
    const cannon: ToolConfig = {
      id: "tool_cannon",
      name: "泡泡炮",
      kind: "cannon",
      unlockIsland: "island_foam_bay",
      levels: [{ level: 1, power: 8, cooldownMs: 200, upgradeCost: 120 }],
    };
    const save = { ...createDefaultSave(1), coins: 150 };
    const purchased = ProgressionSystem.purchaseTool(save, cannon);
    expect(purchased.coins).toBe(30);
    expect(purchased.tools).toContainEqual({ toolId: "tool_cannon", level: 1 });
  });
});

describe("island fish pool", () => {
  it("collects wave fish and the boss id", () => {
    expect(
      fishIdsForIsland({
        id: "island_storm_eye",
        name: "风眼环礁",
        unlockCost: 680,
        targetSessionSeconds: 300,
        waves: [
          {
            durationSeconds: 10,
            fishPool: ["fish_ember_eel", "fish_reef_hopper"],
            maxAlive: 2,
            spawnIntervalSeconds: 2,
          },
        ],
        bossId: "boss_tide_singer",
      }),
    ).toEqual(["fish_ember_eel", "fish_reef_hopper", "boss_tide_singer"]);
  });
});

describe("save merging", () => {
  it("selects higher revision, then newer timestamp", () => {
    const local = { ...createDefaultSave(100), revision: 3, coins: 50 };
    const cloud = { ...createDefaultSave(200), revision: 2, coins: 90 };
    expect(mergeSaves(local, cloud).coins).toBe(50);
    expect(
      mergeSaves(
        { ...local, revision: 3, updatedAt: 100 },
        { ...cloud, revision: 3, updatedAt: 200 },
      ).coins,
    ).toBe(90);
  });

  it("treats a finished tutorial without run count as run one", () => {
    const legacy = {
      ...createDefaultSave(1),
      tutorialComplete: true,
    } as ReturnType<typeof createDefaultSave>;
    delete (legacy as { completedRuns?: number }).completedRuns;
    expect(mergeSaves(legacy, null).completedRuns).toBe(1);
  });
});

describe("score validation", () => {
  const validRun: RunSummary = {
    runId: "run-1",
    islandId: "island_test",
    startedAt: 1_000,
    finishedAt: 61_000,
    toolId: "tool_rod",
    toolLevel: 1,
    fish: [
      {
        fishId: fish.id,
        freshness: 1,
        styleMultiplier: 2,
        price: 30,
        capturedAt: 20_000,
      },
    ],
    styleEvents: [{ action: "weakPoint", atMs: 18_000 }],
    totalCoins: 30,
    bestMultiplier: 2,
  };

  it("accepts a plausible run", () => {
    expect(validateRun(validRun, [fish], tools)).toEqual({
      valid: true,
      reasons: [],
      acceptedScore: 200,
    });
  });

  it("rejects impossible currency", () => {
    const tampered = { ...validRun, totalCoins: 99_999 };
    const result = validateRun(tampered, [fish], tools);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("impossible_total");
  });
});

describe("AimSolve", () => {
  it("projects a shot onto the closest point along the aim line", () => {
    const shot = projectShot(0, 0, 1, 0, 40, 30, 200);
    expect(shot.along).toBe(40);
    expect(shot.distance).toBe(30);
  });

  it("treats a close glowing weak point as a weak-point hit", () => {
    const body = classifyHit(10, 4, 52, 18, true);
    expect(body.hit).toBe(true);
    expect(body.weakPoint).toBe(true);
    expect(body.accuracy).toBeGreaterThan(0.7);
  });

  it("does not count a weak-point hit when the glow is closed", () => {
    const body = classifyHit(10, 4, 52, 18, false);
    expect(body.hit).toBe(true);
    expect(body.weakPoint).toBe(false);
  });

  it("maps the reel marker to a smaller error in the green center", () => {
    expect(reelTimingError(0.5)).toBe(0);
    expect(reelTimingError(0.5)).toBeLessThan(reelTimingError(0.2));
  });
});

describe("ShotFlight", () => {
  it("flies along the aim line and hits when it reaches the body", () => {
    const shot = spawnShot(0, 0, 100, 0, "rod", 1);
    expect(shot).toBeTruthy();
    const moved = tickShot(shot!, 0.1);
    expect(moved.x).toBeGreaterThan(100);
    expect(shotHitsTarget(moved, 140, 0, 52)).toBe(true);
  });

  it("rejects a too-short aim and drops the oldest live shot at the cap", () => {
    expect(spawnShot(0, 0, 8, 0, "rod", 1)).toBeUndefined();
    let live: NonNullable<ReturnType<typeof spawnShot>>[] = [];
    for (let i = 0; i < MAX_LIVE_SHOTS + 2; i += 1) {
      live = keepLiveShots(live, spawnShot(0, 0, 40, 0, "cannon", 1)!);
    }
    expect(live).toHaveLength(MAX_LIVE_SHOTS);
  });

  it("marks a shot as past the fish when it overshoots along the ray", () => {
    const shot = spawnShot(0, 0, 100, 0, "rod", 1)!;
    shot.traveled = 200;
    shot.x = 220;
    expect(shotPassedTarget(shot, 80, 0, 40)).toBe(true);
    expect(shotPassedTarget(shot, 80, 30, 40)).toBe(true);
  });
});

describe("FishBehavior", () => {
  it("cuts front-shield damage unless the gap or weak point is open", () => {
    expect(
      shieldDamageScale({
        gapOpen: false,
        weakPoint: false,
        fromFront: true,
        toolKind: "rod",
      }),
    ).toBeLessThan(0.4);
    expect(
      shieldDamageScale({
        gapOpen: true,
        weakPoint: false,
        fromFront: true,
        toolKind: "cannon",
      }),
    ).toBeGreaterThan(1);
  });

  it("treats a shot from the facing side as a front hit", () => {
    expect(shotFromFront(200, 40, 1)).toBe(true);
    expect(shotFromFront(-400, 40, 1)).toBe(false);
  });

  it("makes dash fish airborne and then stun", () => {
    const dash = poseForBehavior(
      { behavior: "dash", speed: 110, name: "棱帆鱼", tier: "elite" },
      0.2,
      false,
    );
    expect(dash.airborne).toBe(true);
    const stun = poseForBehavior(
      { behavior: "dash", speed: 110, name: "棱帆鱼", tier: "elite" },
      0.7,
      false,
    );
    expect(stun.stunned).toBe(true);
  });

  it("picks boss phases from remaining toughness", () => {
    const phases = [
      { threshold: 1, behavior: "a", speedMultiplier: 1, patternIntervalSeconds: 4.5 },
      { threshold: 0.66, behavior: "b", speedMultiplier: 1.15, patternIntervalSeconds: 4 },
      { threshold: 0.33, behavior: "c", speedMultiplier: 1.35, patternIntervalSeconds: 3.4 },
    ];
    expect(bossPhaseIndex(1, phases)).toBe(0);
    expect(bossPhaseIndex(0.5, phases)).toBe(1);
    expect(bossPhaseIndex(0.2, phases)).toBe(2);
    expect(decoyOffsets()).toHaveLength(2);
  });
});

describe("ToolFeel", () => {
  it("charges the harpoon the longer it is held", () => {
    expect(harpoonCharge(0)).toBeLessThan(harpoonCharge(900));
    expect(harpoonCharge(4_000)).toBe(1.75);
  });

  it("lets the cannon repeat after cooldown while held", () => {
    expect(cannonHoldFire(true, 300, 260)).toBe(true);
    expect(cannonHoldFire(false, 300, 260)).toBe(false);
  });

  it("boosts the harpoon against airborne or stunned dash fish", () => {
    expect(harpoonDashBonus("harpoon", true, false)).toBeGreaterThan(1);
    expect(harpoonDashBonus("rod", true, true)).toBe(1);
  });
});

describe("BossPattern", () => {
  it("maps the three phases to wave, vortex, then rush", () => {
    expect(bossMoveForPhase(0)).toBe("wave");
    expect(bossMoveForPhase(1)).toBe("vortex");
    expect(bossMoveForPhase(2)).toBe("rush");
  });

  it("telegraphs before the wave becomes active", () => {
    const early = patternBeat(0.2, 4.5);
    const mid = patternBeat(1.1, 4.5);
    expect(early.telegraph).toBe(true);
    expect(early.active).toBe(false);
    expect(mid.telegraph).toBe(false);
  });

  it("gives a long output window after the rush", () => {
    const rush = rushWindows(0.4, 6.5);
    const output = rushWindows(2, 6.5);
    expect(rush.rushing).toBe(true);
    expect(output.output).toBe(true);
    expect(waveHits(10, 10)).toBe(true);
    expect(waveHits(80, 10)).toBe(false);
  });
});

describe("SettleCopy", () => {
  it("pays out coins and discovered fish only after the run is applied", () => {
    const save = createDefaultSave(1);
    const session = new RunSession("run_1", "island_foam_bay", "tool_rod", 1, 1);
    session.addStyle({ action: "weakPoint", atMs: 10 });
    session.capture(fish, 1, 20);
    const summary = session.finish(30);
    expect(settleHeadline(summary)).toContain("本局卖出");
    expect(settleRows(summary, () => "测试鱼")[0]).toContain("测试鱼");
    expect(settleSlogan(summary).length).toBeGreaterThan(0);
    const next = applyRunRewards(save, summary);
    expect(next.coins).toBe(save.coins + summary.totalCoins);
    expect(next.discoveredFish).toContain("fish_test");
    expect(next.completedRuns).toBe(1);
    expect(next.recentRuns[0]?.fishCount).toBe(1);
  });

  it("keeps an empty run from paying coins", () => {
    const save = createDefaultSave(1);
    const summary = new RunSession("run_0", "island_foam_bay", "tool_rod", 1, 1).finish(2);
    expect(settleHeadline(summary)).toBe("空手回港");
    expect(applyRunRewards(save, summary).coins).toBe(0);
    expect(bookLines([{ id: "fish_test", name: "测试鱼" }], []).join()).toContain("未收");
  });

  it("marks tutorial complete only after a tutorial island capture", () => {
    const save = createDefaultSave(1);
    const empty = new RunSession("run_t0", TUTORIAL_ISLAND_ID, "tool_rod", 1, 1).finish(2);
    expect(applyRunRewards(save, empty).tutorialComplete).toBe(false);
    const session = new RunSession("run_t1", TUTORIAL_ISLAND_ID, "tool_rod", 1, 1);
    session.capture(fish, 1, 20);
    const next = applyRunRewards(save, session.finish(30));
    expect(next.tutorialComplete).toBe(true);
    expect(next.completedRuns).toBe(1);
    expect(resolveHarborIsland(next.tutorialComplete, TUTORIAL_ISLAND_ID)).toBe(
      DEFAULT_SAIL_ISLAND_ID,
    );
  });
});

describe("IslandClock", () => {
  const foam = {
    waves: [
      { durationSeconds: 55, fishPool: ["a"], maxAlive: 5, spawnIntervalSeconds: 3.4 },
      { durationSeconds: 45, fishPool: ["b"], maxAlive: 6, spawnIntervalSeconds: 3 },
    ],
  };
  const storm = {
    ...foam,
    bossId: "boss_tide_singer",
    waves: [
      { durationSeconds: 75, fishPool: ["a"], maxAlive: 8, spawnIntervalSeconds: 2.6 },
      { durationSeconds: 55, fishPool: ["b"], maxAlive: 8, spawnIntervalSeconds: 2.4 },
    ],
  };

  it("moves foam bay from warmup into elite then over", () => {
    expect(runPhase(10, foam).phase).toBe("wave");
    expect(runPhase(10, foam).waveIndex).toBe(0);
    expect(runPhase(60, foam).waveIndex).toBe(1);
    expect(runPhase(101, foam).phase).toBe("over");
    expect(waveCaption("wave", 0)).toBe("热身潮");
    expect(waveCaption("wave", 1)).toBe("精英潮");
  });

  it("opens the storm-eye boss after both waves", () => {
    expect(runPhase(80, storm).phase).toBe("wave");
    expect(runPhase(131, storm).phase).toBe("boss");
    expect(runPhase(221, storm).phase).toBe("boss");
    expect(runPhase(251, storm).phase).toBe("over");
    expect(BOSS_SECONDS).toBe(120);
    expect(waveCaption("boss", 2)).toBe("巨鲲潮");
    expect(formatClock(80)).toBe("1:20");
  });

  it("caps live fish for the graybox", () => {
    expect(shouldSpawn(2, 8, 3, 2.4)).toBe(true);
    expect(shouldSpawn(3, 8, 3, 2.4)).toBe(false);
  });
});

describe("StyleCallout", () => {
  it("names weak, airborne and combo hits", () => {
    expect(styleCallout({ weakPoint: true, airborne: false, combo: 1 })).toBe(
      "弱点",
    );
    expect(styleCallout({ weakPoint: true, airborne: true, combo: 3 })).toBe(
      "3连·浮空·弱点",
    );
    expect(styleCallout({ weakPoint: false, airborne: false, combo: 1, perfect: true })).toBe(
      "入箱",
    );
  });

  it("shows the live quote going up with style", () => {
    const low = liveQuote(fish, 1);
    const high = liveQuote(fish, 2);
    expect(low).toContain("估价");
    expect(high).toContain("×2.00");
    expect(comboHud(1.4, 3)).toContain("3连");
  });
});

describe("GameFeel", () => {
  it("caps live fish in low power and keeps vibration off when disabled", () => {
    expect(spawnCap(true)).toBe(2);
    expect(spawnCap(false)).toBe(3);
    expect(shouldVibrate(false, { weakPoint: true, airborne: false, combo: 1 })).toBe(
      false,
    );
    expect(shouldVibrate(true, { weakPoint: true, airborne: false, combo: 1 })).toBe(
      true,
    );
    expect(shouldVibrate(true, { weakPoint: false, airborne: false, combo: 2 })).toBe(
      false,
    );
    expect(settingCaption("低配", true)).toBe("低配 开");
    expect(hitStopSeconds("weak", false)).toBe(0.09);
    expect(hitStopSeconds("hit", false)).toBe(0.05);
    expect(hitStopSeconds("weak", true)).toBe(0);
    expect(hitStopSeconds("miss", false)).toBe(0);
  });
});

describe("HitJuice", () => {
  it("spawns fewer bubbles on low power and fades them out", () => {
    expect(juiceCount("weak", true)).toBe(3);
    expect(juiceCount("weak", false)).toBe(11);
    const burst = spawnJuice("weak", 10, 20);
    expect(burst.some((p) => p.kind === "star")).toBe(true);
    expect(burst[0].x).toBe(10);
    const gone = tickJuice(burst, 1);
    expect(gone.length).toBe(0);
    const mid = tickJuice(spawnJuice("hit", 0, 0), 0.1);
    expect(mid.length).toBe(juiceCount("hit", false));
    expect(mid[0].life).toBeLessThan(1);
    expect(juiceCount("splash", false)).toBe(16);
    expect(spawnJuice("splash", 0, 0).every((p) => p.kind === "bubble")).toBe(true);
  });
});

describe("GrayLook", () => {
  it("gives each fish a unique silhouette and darker storm water than foam bay", () => {
    const silhouettes = allFishSilhouettes();
    expect(new Set(silhouettes).size).toBe(silhouettes.length);
    expect(fishLook("fish_bayfin").silhouette).toBe("bayfin");
    expect(fishLook("fish_ember_eel").silhouette).toBe("eel");
    expect(fishLook("boss_tide_singer").silhouette).toBe("whale");
    expect(fishLook("elite_tempest_ray").weakX).not.toBe(fishLook("elite_prism_sail").weakX);
    expect(islandLook("island_foam_bay").sky[0]).toBeGreaterThan(
      islandLook("island_storm_eye").sky[0],
    );
    expect(islandLook("island_foam_bay", true).skyTop[0]).toBeGreaterThan(
      islandLook("island_storm_eye").skyTop[0],
    );
    expect(harborIslandIds()).toEqual([
      "island_foam_bay",
      "island_prism_reef",
      "island_storm_eye",
    ]);
    expect(harborIslandX("island_foam_bay")).toBe(-160);
  });
});

describe("CloudCopy", () => {
  it("prints local-first cloud status, notice, and closed islands", () => {
    expect(cloudStatusLine("offline")).toContain("本机");
    expect(cloudStatusLine("unsigned")).toContain("未登录");
    expect(cloudStatusLine("cloud")).toContain("已同步");
    expect(harborNotice("  打得越漂亮，鱼越值钱。  ")).toBe(
      "打得越漂亮，鱼越值钱。",
    );
    expect(harborNotice("")).toContain("卖鱼后看榜");
    expect(islandClosed("island_storm_eye", ["island_storm_eye"])).toBe(true);
    expect(islandClosed("island_foam_bay", [])).toBe(false);
    expect(closedIslandCaption("风眼礁")).toContain("暂未开放");
  });
});

describe("SfxFeel", () => {
  it("stays silent when sfx is off and keeps cue pitches apart", () => {
    expect(shouldPlaySfx(false)).toBe(false);
    expect(shouldPlaySfx(true)).toBe(true);
    expect(sfxTone("weak").freq).toBeGreaterThan(sfxTone("hit").freq);
    expect(sfxTone("perfect").freq).toBeGreaterThan(sfxTone("catch").freq);
    expect(sfxTone("shot").ms).toBeLessThan(sfxTone("perfect").ms);
  });
});

describe("DepthScale", () => {
  it("makes near fish larger than far fish, and leaps bigger than swimming at the same y", () => {
    expect(depthScale(-80)).toBeGreaterThan(depthScale(80));
    expect(depthScale(40, true)).toBeGreaterThan(depthScale(40, false));
    expect(depthScale(-80)).toBe(1.2);
  });
});

describe("BoardCopy", () => {
  it("prints the best style as a multiplier and lists recent runs", () => {
    expect(bestStyleLine(210)).toBe("本机最佳 ×2.10");
    expect(boardLines([], () => "泡沫湾")[0]).toContain("还没有");
    expect(
      boardLines(
        [{ islandId: "island_foam_bay", coins: 40, bestMultiplier: 1.4, fishCount: 2 }],
        () => "泡沫湾",
      )[0],
    ).toContain("泡沫湾");
    expect(friendBoardHint(false)).toContain("真机");
    expect(friendBoardHint(true)).toContain("好友榜");
    expect(friendBoardHint(false, false)).toContain("未登录");
    expect(friendBoardHint(true, false)).not.toContain("下面是微信好友榜");
  });
});

describe("IslandPack", () => {
  it("names playable islands and skips the tutorial dock", () => {
    expect(islandPackName("island_foam_bay")).toBe("island_foam_bay");
    expect(islandPackName("island_tutorial")).toBeUndefined();
    expect(harborSailWait("泡沫湾")).toBe("正在驶向泡沫湾…");
  });

  it("stays in harbor when a real pack fails, and sails only when ready", () => {
    expect(decideSailAfterPack(true)).toBe("enter_sea");
    expect(decideSailAfterPack(false)).toBe("stay_harbor");
    expect(harborPackFailCopy("泡沫湾")).toContain("港口");
    expect(harborPackFailCopy("泡沫湾")).toContain("重试");
  });
});

describe("WechatSession", () => {
  it("treats editor and failed login as unsigned, never as signed", () => {
    expect(resolveLoginCode({ wechatAvailable: false, code: "x" })).toBeNull();
    expect(
      resolveLoginCode({ wechatAvailable: true, failed: true, code: "x" }),
    ).toBeNull();
    expect(resolveLoginCode({ wechatAvailable: true, code: "  " })).toBeNull();
    expect(resolveLoginCode({ wechatAvailable: true, code: "wxcode" })).toBe(
      "wxcode",
    );
    expect(
      wechatSessionKind({ wechatAvailable: false, loginCode: null }),
    ).toBe("editor");
    expect(
      wechatSessionKind({ wechatAvailable: true, loginCode: null }),
    ).toBe("guest");
    expect(
      wechatSessionKind({ wechatAvailable: true, loginCode: "wxcode" }),
    ).toBe("signed");
    expect(shouldCallCloud("editor")).toBe(false);
    expect(shouldCallCloud("guest")).toBe(false);
    expect(shouldCallCloud("signed")).toBe(true);
    expect(canShowFriendBoardForSession("guest", true)).toBe(false);
    expect(canShowFriendBoardForSession("signed", true)).toBe(true);
    expect(canShowFriendBoardForSession("signed", false)).toBe(false);
    expect(persistCloudKind("editor", false)).toBe("local");
    expect(persistCloudKind("guest", false)).toBe("unsigned");
    expect(persistCloudKind("signed", true)).toBe("cloud");
    expect(persistCloudKind("signed", false)).toBe("offline");
  });
});

describe("PrivacyCopy", () => {
  it("lists local save, cloud save, analytics, friend board and deleteSave", () => {
    const text = privacyLines().join(" ");
    expect(text).toContain("本机存档");
    expect(text).toContain("云存档");
    expect(text).toContain("deleteSave");
    expect(text).toContain("埋点");
    expect(text).toContain("submitScore");
    expect(text).toContain("不读通讯录");
    expect(text).toContain("未成年人");
    expect(text).toContain("未接入广告");
    expect(text).not.toContain("广告画像");
    expect(wipeCaption()).toBe("删除存档");
    expect(wipeBody()).toContain("deleteSave");
    expect(wipeDoneNotice()).toBe("存档已清空");
    expect(healthAdviceTitle()).toBe("健康游戏忠告");
    expect(healthAdviceLines().join(" ")).toContain("适度游戏益脑");
  });
});

describe("TutorialFlow", () => {
  it("sends new players to the tutorial island until the save is marked complete", () => {
    expect(isTutorialRun(TUTORIAL_ISLAND_ID, false)).toBe(true);
    expect(isTutorialRun(TUTORIAL_ISLAND_ID, true)).toBe(false);
    expect(isTutorialRun("island_foam_bay", false)).toBe(false);
    expect(nextSailIsland(false)).toBe(TUTORIAL_ISLAND_ID);
    expect(nextSailIsland(true)).toBe(DEFAULT_SAIL_ISLAND_ID);
  });

  it("dials leftover tutorial selection back to foam bay after teaching", () => {
    expect(resolveHarborIsland(false, DEFAULT_SAIL_ISLAND_ID)).toBe(
      TUTORIAL_ISLAND_ID,
    );
    expect(resolveHarborIsland(false, TUTORIAL_ISLAND_ID)).toBe(TUTORIAL_ISLAND_ID);
    expect(resolveHarborIsland(true, TUTORIAL_ISLAND_ID)).toBe(
      DEFAULT_SAIL_ISLAND_ID,
    );
    expect(resolveHarborIsland(true, DEFAULT_SAIL_ISLAND_ID)).toBe(
      DEFAULT_SAIL_ISLAND_ID,
    );
    expect(resolveHarborIsland(true, "island_storm_eye")).toBe("island_storm_eye");
  });

  it("does not pretend foam bay is selected before the tutorial is done", () => {
    expect(
      harborChipSelected("island_foam_bay", false, TUTORIAL_ISLAND_ID),
    ).toBe(false);
    expect(
      harborChipSelected("island_foam_bay", true, DEFAULT_SAIL_ISLAND_ID),
    ).toBe(true);
    expect(harborSailCaption(false)).toBe("开始教学");
    expect(harborSailCaption(true)).toBe("出海捕鱼");
  });

  it("advances cast → weak point → reel → settle", () => {
    expect(advanceTutorial("cast", "hooked")).toBe("weakPoint");
    expect(advanceTutorial("weakPoint", "weakHit")).toBe("reel");
    expect(advanceTutorial("reel", "captured")).toBe("settle");
    expect(advanceTutorial("settle", "captured")).toBe("complete");
  });

  it("teaches pick-up into the crate instead of the old green reel zone", () => {
    expect(tutorialPrompt("reel")).toContain("捡起");
    expect(tutorialPrompt("reel")).toContain("鱼箱");
    expect(tutorialPrompt("reel")).not.toMatch(/绿|收杆/);
    expect(tutorialGuideTarget("cast")).toBe("cast");
    expect(tutorialGuideTarget("reel")).toBe("pickUp");
    expect(tutorialGuideTarget("weakPoint")).toBe("none");
    expect(tutorialGuideTarget("settle")).toBe("none");
  });

  it("locks harbor upgrade/book/board until the tutorial is finished", () => {
    expect(harborUnlocks(0)).toEqual({
      upgrade: false,
      book: false,
      board: false,
    });
    expect(harborUnlocksForSave({ tutorialComplete: false, completedRuns: 3 })).toEqual({
      upgrade: false,
      book: false,
      board: false,
    });
    expect(harborUnlocksForSave({ tutorialComplete: true, completedRuns: 1 })).toEqual({
      upgrade: true,
      book: false,
      board: false,
    });
    expect(harborUnlocksForSave({ tutorialComplete: true, completedRuns: 2 })).toEqual({
      upgrade: true,
      book: true,
      board: true,
    });
    expect(harborFeatureLockedHint("upgrade")).toContain("教学");
  });

  it("does not blame an unfinished tutorial after the first completed run", () => {
    const afterLesson = { tutorialComplete: true, completedRuns: 1 };
    expect(harborFeatureLockedHint("book", afterLesson)).toBe(
      "再出 1 局后解锁图鉴。",
    );
    expect(harborFeatureLockedHint("board", afterLesson)).toBe("再出 1 局后解锁榜。");
    expect(harborFeatureLockedHint("book", afterLesson)).not.toContain("教学");
    expect(harborFeatureButtonLabel("book", afterLesson)).toBe("再出1局后图鉴");
    expect(harborFeatureButtonLabel("board", afterLesson)).toBe("再出1局后榜");
    expect(harborFeatureButtonLabel("upgrade", afterLesson)).toBe("查看升级");
    expect(
      harborFeatureLockedHint("book", { tutorialComplete: false, completedRuns: 0 }),
    ).toContain("教学");
    expect(
      harborFeatureButtonLabel("book", { tutorialComplete: false, completedRuns: 0 }),
    ).toBe("教学后图鉴");
    expect(
      harborFeatureButtonLabel("book", { tutorialComplete: true, completedRuns: 2 }),
    ).toBe("图鉴");
  });

  it("hints then auto-picks a stunned fish after 8–10 seconds", () => {
    expect(pickupAssistDecision("pickable", PICKABLE_HINT_MS - 1)).toBe("none");
    expect(pickupAssistDecision("pickable", PICKABLE_HINT_MS)).toBe("hint");
    expect(pickupAssistDecision("pickable", PICKABLE_AUTO_MS - 1)).toBe("hint");
    expect(pickupAssistDecision("pickable", PICKABLE_AUTO_MS)).toBe("auto");
    expect(PICKABLE_AUTO_MS).toBeGreaterThanOrEqual(8_000);
    expect(PICKABLE_AUTO_MS).toBeLessThanOrEqual(12_000);
  });

  it("hints then auto-stashes a carried fish after 8–10 seconds", () => {
    expect(pickupAssistDecision("carried", CARRIED_HINT_MS - 1)).toBe("none");
    expect(pickupAssistDecision("carried", CARRIED_HINT_MS)).toBe("hint");
    expect(pickupAssistDecision("carried", CARRIED_AUTO_MS - 1)).toBe("hint");
    expect(pickupAssistDecision("carried", CARRIED_AUTO_MS)).toBe("auto");
    expect(CARRIED_AUTO_MS).toBeGreaterThanOrEqual(8_000);
    expect(CARRIED_AUTO_MS).toBeLessThanOrEqual(12_000);
  });

  it("keeps the 55s tutorial battle fallback without treating a fresh stun as ready", () => {
    expect(shouldAutoReel("reel", 0, 54_999)).toBe(false);
    expect(shouldAutoReel("reel", 0, 55_000)).toBe(true);
    expect(shouldAutoReel("weakPoint", 20_000, 60_000)).toBe(false);
  });
});

describe("save validation", () => {
  it("accepts the default save and rejects negative coins or unknown ids", () => {
    const ok = createDefaultSave(1);
    expect(validSave(ok)).toBe(true);
    expect(validSave({ ...ok, coins: -1 })).toBe(false);
    expect(validSave({ ...ok, revision: 0 })).toBe(false);
    expect(validSave({ ...ok, unlockedIslands: ["island_unknown"] })).toBe(false);
    expect(validSave({ ...ok, tools: [{ toolId: "tool_unknown", level: 1 }] })).toBe(
      false,
    );
    expect(validSave({ ...ok, discoveredFish: ["fish_unknown"] })).toBe(false);
    expect(validSave({ ...ok, tutorialComplete: "yes" })).toBe(false);
  });
});

describe("FlopPhysics", () => {
  it("yanks onto the deck, bounces, and knocks airborne", () => {
    const pulled = yankStep(80, 40, 1);
    expect(pulled.landed).toBe(true);
    expect(pulled.x).toBeLessThan(-250);
    expect(yankStep(80, 40, 0.05).landed).toBe(false);
    let body = beginFlop(-320, -70);
    for (let i = 0; i < 8; i++) body = stepFlop(body, 0.05, false);
    expect(body.y).toBeGreaterThan(-200);
    const hit = knock(body, -400, -90, 20);
    expect(hit.vy).toBeGreaterThan(body.vy);
    expect(isAirborne({ ...hit, y: -80 })).toBe(true);
    expect(crateDrop(-520, -150)).toBe(true);
    expect(crateDrop(0, 0)).toBe(false);
    expect(
      bouncedOnDeck(
        { x: -300, y: -100, vx: 0, vy: -200, angle: 0, spin: 0 },
        { x: -300, y: -118, vx: 0, vy: 156, angle: 0, spin: 0 },
      ),
    ).toBe(true);
    expect(canPickUp(-400, -90, -320, -70)).toBe(true);
    expect(canPickUp(-400, -90, 80, 40)).toBe(false);
  });
});

describe("DeckMap", () => {
  it("puts sea fish farther on Z and deck fish higher on Y", () => {
    const sea = toActorWorld(200, 40, "sea");
    const deck = toActorWorld(-320, -70, "deck");
    expect(deck.x).toBeLessThan(sea.x);
    expect(deck.y).toBeGreaterThan(sea.y);
    expect(deckKindForFish(-300, true, false)).toBe("deck");
    expect(deckKindForFish(80, false, false)).toBe("sea");
    expect(toBoatWorld(-400, -90).x).toBeCloseTo(-4, 1);
  });
});

