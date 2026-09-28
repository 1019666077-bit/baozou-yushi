import { TUTORIAL_GATE } from "../domain/TutorialFlow";

/**
 * 教学闸门开着、且教学出海还没完成时，不开放钓鱼。
 * 闸门关掉（TUTORIAL_GATE = false）时入口始终可进，旧档不会永远锁死。
 * 卖鱼进的是同一个金币钱包，闸门开着时提前钓会把首局 11 金进度顶高。
 */

export interface FishingGate {
  locked: boolean;
  hint: string;
}

export function fishingHarborGate(
  save: { tutorialComplete: boolean },
  tutorialGate = TUTORIAL_GATE,
): FishingGate {
  if (tutorialGate && !save.tutorialComplete) {
    return { locked: true, hint: "先完成教学出海，再来钓鱼" };
  }
  return { locked: false, hint: "" };
}
