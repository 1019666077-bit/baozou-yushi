import type { FishConfig } from "../data/types";

export interface PriceBreakdown {
  base: number;
  rarity: number;
  freshness: number;
  style: number;
  total: number;
}

/** 竿 2 级标价。教学首售必须低于此值，买不起才不抢出海主 CTA。 */
export const FIRST_ROD_UPGRADE_COST = 90;
/** 教学湾鳍弱点击破后的典型精彩倍率（与预览抽取 ×1.34 对齐）。 */
export const TUTORIAL_FIRST_SALE_STYLE = 1.34;
export const TUTORIAL_FISH_QUOTE = { basePrice: 8, rarityMultiplier: 1 };

export class PriceCalculator {
  static calculate(
    fish: Pick<FishConfig, "basePrice" | "rarityMultiplier">,
    freshness: number,
    styleMultiplier: number,
    economyScale = 1,
  ): PriceBreakdown {
    const safeFreshness = clamp(freshness, 0.5, 1.2);
    const safeStyle = clamp(styleMultiplier, 1, 3);
    const safeEconomy = clamp(economyScale, 0.5, 2);
    const raw =
      fish.basePrice *
      fish.rarityMultiplier *
      safeFreshness *
      safeStyle *
      safeEconomy;

    return {
      base: fish.basePrice,
      rarity: round2(fish.rarityMultiplier),
      freshness: round2(safeFreshness),
      style: round2(safeStyle),
      total: Math.max(1, Math.round(raw)),
    };
  }
}

/** 教学单鱼入账。现约 11，低于 90，缺口留给再出海。 */
export function tutorialFirstSaleCoins(
  style = TUTORIAL_FIRST_SALE_STYLE,
  economyScale = 1,
): number {
  return PriceCalculator.calculate(
    TUTORIAL_FISH_QUOTE,
    1,
    style,
    economyScale,
  ).total;
}

/**
 * 泡沫湾保守一趟：3 条（湾鳍+贝甲+湾鳍）×1.5。
 * 约 46，低于圣经「自由局 70–100」的中高操作，用来保证「再出海能补」最多 2 趟。
 */
export function foamBayTypicalRunCoins(): number {
  const bay = PriceCalculator.calculate(
    { basePrice: 8, rarityMultiplier: 1 },
    1,
    1.5,
  ).total;
  const shell = PriceCalculator.calculate(
    { basePrice: 14, rarityMultiplier: 1.05 },
    1,
    1.5,
  ).total;
  return bay + shell + bay;
}

export function upgradeGapRemaining(
  coins: number,
  cost = FIRST_ROD_UPGRADE_COST,
): number {
  return Math.max(0, Math.ceil(cost - coins));
}

/** 按保守泡沫湾一趟，还要几趟才能买竿 2 级。0 = 已够。 */
export function tripsToFillUpgrade(
  coins: number,
  cost = FIRST_ROD_UPGRADE_COST,
  typical = foamBayTypicalRunCoins(),
): number {
  const left = upgradeGapRemaining(coins, cost);
  if (left <= 0) return 0;
  if (typical <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(left / typical);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
