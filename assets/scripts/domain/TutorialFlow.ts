import { CRATE_X, CRATE_Y } from "./FlopPhysics";

export type TutorialStep =
  | "cast"
  | "weakPoint"
  | "reel"
  | "settle"
  | "complete";

export type TutorialEvent =
  | "hooked"
  | "weakHit"
  | "reelReady"
  | "captured";

export type TutorialGuideTarget = "cast" | "weakPoint" | "pickUp" | "crate" | "none";

export type HarborFeature = "upgrade" | "book" | "board";

export const TUTORIAL_FISH_ID = "fish_bayfin";
export const TUTORIAL_WEAK_PAUSE_SECONDS = 0.6;
export const TUTORIAL_ISLAND_ID = "island_tutorial";
export const DEFAULT_SAIL_ISLAND_ID = "island_foam_bay";

export function isTutorialRun(
  islandId: string,
  tutorialComplete: boolean,
): boolean {
  return !tutorialComplete && islandId === TUTORIAL_ISLAND_ID;
}

export function tutorialPrompt(
  step: TutorialStep,
  extras: { carrying?: boolean } = {},
): string {
  if (step === "cast") return "点「抛竿」，锁定湾鳍鱼。";
  if (step === "weakPoint") return "点右半屏发光鳍，打弱点。";
  if (step === "reel") {
    if (extras.carrying) return "走到左边鱼箱，丢掉入箱。";
    return "点「捡起」，搬进左边鱼箱。";
  }
  return "入箱了！回港点卖，换成金币。";
}

export function tutorialGuideTarget(
  step: TutorialStep,
  extras: { carrying?: boolean } = {},
): TutorialGuideTarget {
  if (step === "cast") return "cast";
  if (step === "weakPoint") return "weakPoint";
  if (step === "reel") return extras.carrying ? "crate" : "pickUp";
  if (step === "settle") return "crate";
  return "none";
}

/** 鱼箱中心，与 FlopPhysics.crateDrop 一致。 */
export const TUTORIAL_CRATE_X = CRATE_X;
export const TUTORIAL_CRATE_Y = CRATE_Y;
/** 弱点步没有按钮时，圈右半屏瞄准区。 */
export const TUTORIAL_WEAK_HINT_X = 260;
export const TUTORIAL_WEAK_HINT_Y = 36;

export function tutorialGuideAnchor(target: TutorialGuideTarget): {
  x: number;
  y: number;
  radius: number;
} | undefined {
  if (target === "crate") {
    return { x: TUTORIAL_CRATE_X, y: TUTORIAL_CRATE_Y, radius: 88 };
  }
  if (target === "weakPoint") {
    return { x: TUTORIAL_WEAK_HINT_X, y: TUTORIAL_WEAK_HINT_Y, radius: 96 };
  }
  return undefined;
}

/** 半透明遮罩挖洞 + 粗描边脉动。决策可单测，绘制在 RuntimePrototype。 */
export function tutorialGuideRing(nowMs: number): {
  pulse: number;
  lineWidth: number;
  fillAlpha: number;
  maskAlpha: number;
  stroke: [number, number, number, number];
} {
  return {
    pulse: 24 + Math.sin(nowMs / 150) * 14,
    lineWidth: 10,
    fillAlpha: 52,
    maskAlpha: 96,
    stroke: [255, 214, 32, 255],
  };
}

/** 首局未入箱前不许提前回港，强制走通甩钩→命中→入箱。 */
export function tutorialCanLeave(step: TutorialStep): boolean {
  return step === "settle" || step === "complete";
}

export type HarborCta = "sail" | "sell" | "upgrade";

/** 港口下一步：教学出航 / 卖鱼 / 首局后升级鱼竿。 */
export function harborNextCta(input: {
  tutorialComplete: boolean;
  completedRuns: number;
  pendingSell: boolean;
  upgradeUnlocked: boolean;
}): HarborCta {
  if (input.pendingSell) return "sell";
  if (!input.tutorialComplete) return "sail";
  if (input.completedRuns === 1 && input.upgradeUnlocked) return "upgrade";
  return "sail";
}

export function harborNextPrompt(
  cta: HarborCta,
  tutorialComplete = true,
): string {
  if (cta === "sell") return "点「卖到鱼市」，换成金币。";
  if (cta === "upgrade") return "点升级，卖掉的鱼换成更好的竿。";
  if (!tutorialComplete) return "点「开始教学」，甩钩打中再入箱。";
  return "点「出海捕鱼」，再甩一竿。";
}

export function advanceTutorial(
  step: TutorialStep,
  event: TutorialEvent,
): TutorialStep {
  if (step === "complete") return step;
  if (step === "cast" && event === "hooked") return "weakPoint";
  if (step === "weakPoint" && (event === "weakHit" || event === "reelReady")) {
    return "reel";
  }
  if (step === "reel" && event === "captured") return "settle";
  if (step === "settle") return "complete";
  return step;
}

export function shouldAutoReel(
  step: TutorialStep,
  reelReadyForMs: number,
  battleMs: number,
): boolean {
  if (step !== "reel") return false;
  return reelReadyForMs >= 8_000 || battleMs >= 55_000;
}

/** 砸晕可捡后，先提示再自动捡起，避免卡在甲板上。 */
export const PICKABLE_HINT_MS = 8_000;
export const PICKABLE_AUTO_MS = 10_000;
/** 已扛起但未走到鱼箱时，先提示再自动入箱。 */
export const CARRIED_HINT_MS = 8_000;
export const CARRIED_AUTO_MS = 10_000;

export type PickupAssistKind = "pickable" | "carried";
export type PickupAssistAction = "none" | "hint" | "auto";

export function pickupAssistDecision(
  kind: PickupAssistKind,
  elapsedMs: number,
): PickupAssistAction {
  const hintMs = kind === "carried" ? CARRIED_HINT_MS : PICKABLE_HINT_MS;
  const autoMs = kind === "carried" ? CARRIED_AUTO_MS : PICKABLE_AUTO_MS;
  if (elapsedMs >= autoMs) return "auto";
  if (elapsedMs >= hintMs) return "hint";
  return "none";
}

export function harborUnlocks(completedRuns: number): {
  upgrade: boolean;
  book: boolean;
  board: boolean;
} {
  return {
    upgrade: completedRuns >= 1,
    book: completedRuns >= 2,
    board: completedRuns >= 2,
  };
}

export function harborUnlocksForSave(save: {
  tutorialComplete: boolean;
  completedRuns: number;
}): {
  upgrade: boolean;
  book: boolean;
  board: boolean;
} {
  return harborUnlocks(save.tutorialComplete ? save.completedRuns : 0);
}

export function nextSailIsland(tutorialComplete: boolean): string {
  return tutorialComplete ? DEFAULT_SAIL_ISLAND_ID : TUTORIAL_ISLAND_ID;
}

export function resolveHarborIsland(
  tutorialComplete: boolean,
  selectedIslandId: string,
): string {
  if (!tutorialComplete) return nextSailIsland(false);
  if (selectedIslandId === TUTORIAL_ISLAND_ID) return nextSailIsland(true);
  return selectedIslandId;
}

export function harborChipSelected(
  islandId: string,
  tutorialComplete: boolean,
  displayIslandId: string,
): boolean {
  if (!tutorialComplete) return false;
  return islandId === displayIslandId;
}

export function harborSailCaption(tutorialComplete: boolean): string {
  return tutorialComplete ? "出海捕鱼" : "开始教学";
}

function runsNeededFor(feature: HarborFeature): number {
  return feature === "upgrade" ? 1 : 2;
}

export function harborFeatureLockedHint(
  feature: HarborFeature,
  save?: { tutorialComplete: boolean; completedRuns: number },
): string {
  if (!save?.tutorialComplete) {
    if (feature === "upgrade") return "先完成教学再升级。";
    if (feature === "book") return "先完成教学再查看图鉴。";
    return "先完成教学再看榜。";
  }
  const left = Math.max(0, runsNeededFor(feature) - save.completedRuns);
  if (feature === "upgrade") {
    return left > 0 ? `再出 ${left} 局后解锁升级。` : "先完成教学再升级。";
  }
  if (feature === "book") {
    return left > 0 ? `再出 ${left} 局后解锁图鉴。` : "先完成教学再查看图鉴。";
  }
  return left > 0 ? `再出 ${left} 局后解锁榜。` : "先完成教学再看榜。";
}

export function harborFeatureButtonLabel(
  feature: HarborFeature,
  save: { tutorialComplete: boolean; completedRuns: number },
): string {
  const unlocks = harborUnlocksForSave(save);
  if (feature === "book") {
    if (unlocks.book) return "图鉴";
    return save.tutorialComplete ? "再出1局后图鉴" : "教学后图鉴";
  }
  if (feature === "board") {
    if (unlocks.board) return "榜";
    return save.tutorialComplete ? "再出1局后榜" : "教学后榜";
  }
  if (unlocks.upgrade) return "查看升级";
  return save.tutorialComplete ? "再出1局后升级" : "教学后升级";
}
