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

export type TutorialGuideTarget = "cast" | "pickUp" | "none";

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

export function tutorialPrompt(step: TutorialStep): string {
  if (step === "cast") return "点击抛竿，锁定湾鳍鱼";
  if (step === "weakPoint") return "瞄准发光鳍部，触发弱点击破";
  if (step === "reel") return "砸晕后点捡起，搬进左边鱼箱";
  return "漂亮！精彩动作会让鱼更值钱";
}

export function tutorialGuideTarget(step: TutorialStep): TutorialGuideTarget {
  if (step === "cast") return "cast";
  if (step === "reel") return "pickUp";
  return "none";
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
