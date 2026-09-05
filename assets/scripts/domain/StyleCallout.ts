import type { FishConfig } from "../data/types";
import { PriceCalculator } from "./PriceCalculator";

export function styleCallout(parts: {
  weakPoint: boolean;
  airborne: boolean;
  combo: number;
  perfect?: boolean;
  bag?: boolean;
}): string {
  if (parts.perfect || parts.bag) return "入箱";
  const bits: string[] = [];
  if (parts.combo > 1) bits.push(`${parts.combo}连`);
  if (parts.airborne) bits.push("浮空");
  if (parts.weakPoint) bits.push("弱点");
  if (bits.length === 0) return "命中";
  return bits.join("·");
}

export function inboxPopup(price?: number): string {
  if (price != null && price > 0) return `入箱 +${price}`;
  return "入箱";
}

export function sellPopup(gained: number): string {
  return gained > 0 ? `卖出 +${gained}金` : "卖出";
}

export function sellGoalBridge(gained: number, coins: number, cost: number): string {
  if (gained <= 0) return harborish(coins, cost);
  return `卖出 +${gained}金 · ${coins}/${cost}`;
}

function harborish(coins: number, cost: number): string {
  return `${coins}/${cost}`;
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

/** 甩钩当下的极短口令，不盖教学下一步。 */
export function castSnapCaption(): string {
  return "钩出去了。";
}

export function castChargeCaption(quality: "early" | "sweet" | "late"): string {
  if (quality === "sweet") return "时机刚好";
  return castSnapCaption();
}

export function castLockCaption(name: string): string {
  return `拽住${name}。`;
}
