import type { FishConfig } from "../data/types";
import { PriceCalculator } from "./PriceCalculator";

export function styleCallout(parts: {
  weakPoint: boolean;
  airborne: boolean;
  combo: number;
  perfect?: boolean;
}): string {
  if (parts.perfect) return "入箱";
  const bits: string[] = [];
  if (parts.combo > 1) bits.push(`${parts.combo}连`);
  if (parts.airborne) bits.push("浮空");
  if (parts.weakPoint) bits.push("弱点");
  if (bits.length === 0) return "命中";
  return bits.join("·");
}

export function liveQuote(
  fish: Pick<FishConfig, "name" | "basePrice" | "rarityMultiplier">,
  multiplier: number,
): string {
  const price = PriceCalculator.calculate(fish, 1, multiplier);
  return `${fish.name}估价 ${price.total}金 · 底价${price.base}×${price.style.toFixed(2)}`;
}

export function comboHud(multiplier: number, combo: number): string {
  const core = `精彩 ×${multiplier.toFixed(2)}`;
  return combo > 1 ? `${core}  ${combo}连` : core;
}
