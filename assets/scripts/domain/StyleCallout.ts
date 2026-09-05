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
  if (quality === "sweet") return "时机刚好 · 精彩";
  if (quality === "late") return "偏晚 · 普通命中";
  return "偏早 · 普通命中";
}

export function castBarLabel(quality: "early" | "sweet" | "late"): string {
  if (quality === "sweet") return "甜区 · 精彩";
  if (quality === "late") return "偏晚 · 普通";
  return "蓄力 · 偏早";
}

/** 自由局必须自己松手；教学仍可自动甜区。 */
export function castHoldHint(tutorial: boolean): string {
  return tutorial ? "教学：蓄满会自动甩" : "自由局：再点「甩出」才松手，不会自动进甜区";
}

/** 命中→翻扑→砸→捡 的一段表演口令，静帧也能读出拍子。 */
export function flopBeatCaption(
  beat: "hit" | "flop" | "slam" | "pick",
): string {
  if (beat === "hit") return "命中！";
  if (beat === "flop") return "翻扑";
  if (beat === "slam") return "砸！";
  return "可以捡";
}

export function castLockCaption(name: string): string {
  return `拽住${name}。`;
}
