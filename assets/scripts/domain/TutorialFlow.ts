export type TutorialStep =
  | "cast"
  | "weakPoint"
  | "pickUp"
  | "crate"
  | "complete";

export type TutorialEvent =
  | "hooked"
  | "weakHit"
  | "pickedUp"
  | "stored";

export const TUTORIAL_FISH_ID = "fish_bayfin";
export const TUTORIAL_WEAK_PAUSE_SECONDS = 0.6;
export const TUTORIAL_ISLAND_ID = "island_foam_bay";

export function isTutorialRun(
  islandId: string,
  tutorialComplete: boolean,
): boolean {
  return !tutorialComplete && islandId === TUTORIAL_ISLAND_ID;
}

export function tutorialPrompt(step: TutorialStep): string {
  if (step === "cast") return "点击抛竿，锁定湾鳍鱼";
  if (step === "weakPoint") return "瞄准发光鳍部，触发弱点击破";
  if (step === "pickUp") return "鱼已砸晕，靠近后点击捡起";
  if (step === "crate") return "扛着湾鳍鱼走进左侧鱼箱";
  return "漂亮！精彩动作会让鱼更值钱";
}

export function advanceTutorial(
  step: TutorialStep,
  event: TutorialEvent,
): TutorialStep {
  if (step === "complete") return step;
  if (step === "cast" && event === "hooked") return "weakPoint";
  if (step === "weakPoint" && event === "weakHit") return "pickUp";
  if (step === "pickUp" && event === "pickedUp") return "crate";
  if (step === "crate" && event === "stored") return "complete";
  return step;
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
