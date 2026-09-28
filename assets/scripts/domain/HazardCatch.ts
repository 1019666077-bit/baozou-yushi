/**
 * 搏货：把鱼当筹码。操作前看得见卖相，结果看空中砸/跳海，不是押注也不是抽奖。
 */
import { PriceCalculator } from "./PriceCalculator";

/** 险货空中砸额外卖相。仍受精彩倍率 3 倍封顶。 */
export const HAZARD_AIR_STYLE = 1.55;
/** 险货更急着跳海：鲜度/逃脱窗缩短。 */
export const HAZARD_ESCAPE_SCALE = 0.62;
/** 甲板上没人理时，更快开始往水里滑。 */
export const HAZARD_UNATTENDED_SCALE = 1.7;

export function hashKey(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

/** 当日险货：岛内鱼池公开轮换，出海前就能看见是哪条。 */
export function todaysHazardId(
  pool: readonly string[],
  islandId: string,
  dayKey: string,
): string {
  const list = pool.filter((id) => typeof id === "string" && id.length > 0);
  if (list.length === 0) return "";
  return list[hashKey(`${dayKey}:${islandId}`) % list.length];
}

export function isHazardFish(fishId: string, hazardId: string): boolean {
  return hazardId.length > 0 && fishId === hazardId;
}

export function hazardEscapeSeconds(base: number, hazard: boolean): number {
  const safe = Math.max(1, base);
  return hazard ? Math.max(4, safe * HAZARD_ESCAPE_SCALE) : safe;
}

export function hazardStyleMultiplier(style: number, hazardWin: boolean): number {
  const boosted = hazardWin ? style * HAZARD_AIR_STYLE : style;
  return Math.min(3, Math.max(1, boosted));
}

export function hazardHuntPrompt(fishName: string): string {
  return `今日险货 ${fishName} · 空中砸才算搏赢 ×${HAZARD_AIR_STYLE.toFixed(2)}`;
}

export function hazardDeckPrompt(quote: number, hazard: boolean): string {
  if (hazard) {
    return `险货在跳 · 稳收 ${quote}金 · 空中砸搏 ×${HAZARD_AIR_STYLE.toFixed(2)}`;
  }
  return `稳收估价 ${quote}金 · 再搏空中砸会更贵，跳海就没了`;
}

export function hazardGoneToast(): string {
  return "险货跑了。再抛竿。";
}

export function hazardWinToast(price: number): string {
  return `搏赢了 · 入箱 ${price}金`;
}

export function harborPlayPrompt(): string {
  return "点「出海捕鱼」。空中砸才卖得贵，跳海就没了。";
}

export function hazardQuote(
  fish: { name: string; basePrice: number; rarityMultiplier: number },
  freshness: number,
  style: number,
  hazardWin: boolean,
  economyScale = 1,
): number {
  return PriceCalculator.calculate(
    fish,
    freshness,
    hazardStyleMultiplier(style, hazardWin),
    economyScale,
  ).total;
}
