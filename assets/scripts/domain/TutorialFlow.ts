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

export const TUTORIAL_FISH_ID = "fish_bayfin";
export const TUTORIAL_WEAK_PAUSE_SECONDS = 0.6;
export const TUTORIAL_ISLAND_ID = "island_tutorial";

export function isTutorialRun(
  islandId: string,
  tutorialComplete: boolean,
): boolean {
  return !tutorialComplete && islandId === TUTORIAL_ISLAND_ID;
}

export function tutorialPrompt(step: TutorialStep): string {
  if (step === "cast") return "点击抛竿，锁定湾鳍鱼";
  if (step === "weakPoint") return "瞄准发光鳍部，触发弱点击破";
  if (step === "reel") return "指针进入绿色区域时收杆";
  return "漂亮！精彩动作会让鱼更值钱";
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
  return tutorialComplete ? "island_foam_bay" : TUTORIAL_ISLAND_ID;
}

export function harborFeatureLockedHint(
  feature: "upgrade" | "book" | "board",
): string {
  if (feature === "upgrade") return "先完成教学再升级。";
  if (feature === "book") return "先完成教学再查看图鉴。";
  return "先完成教学再看榜。";
}
