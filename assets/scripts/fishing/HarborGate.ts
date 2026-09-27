/**
 * 教学出海完成前不开放钓鱼。
 * 卖鱼进的是同一个金币钱包，提前钓会把首局 11 金进度顶高。
 */

export interface FishingGate {
  locked: boolean;
  hint: string;
}

export function fishingHarborGate(save: { tutorialComplete: boolean }): FishingGate {
  if (!save.tutorialComplete) {
    return { locked: true, hint: "先完成教学出海，再来钓鱼" };
  }
  return { locked: false, hint: "" };
}
