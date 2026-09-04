import type { FishConfig } from "../data/types";

export interface PriceBreakdown {
  base: number;
  rarity: number;
  freshness: number;
  style: number;
  total: number;
}

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
