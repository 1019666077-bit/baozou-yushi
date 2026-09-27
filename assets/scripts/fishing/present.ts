/**
 * 中文展示。鱼种数值在 FishTable，装备英文标签在 Gear，这里只做称呼。
 */
import { FISH } from "./FishTable";
import { UPGRADES } from "./Gear";

const LABEL_ZH: { [label: string]: string } = {
  "8 lb mono": "8磅尼龙线",
  "15 lb mono": "15磅尼龙线",
  "30 lb braid": "30磅编织线",
  "60 lb braid": "60磅编织线",
  "Old spinning reel": "旧纺车轮",
  "Smooth spinning reel": "顺滑纺车轮",
  "Conventional reel": "鼓式卷线器",
  "Hand-me-down rod": "旧鱼竿",
  "7 ft graphite rod": "7尺碳素竿",
  "9 ft surf rod": "9尺远投竿",
  Cooler: "冷藏箱",
  "Ice chest": "冰柜",
  "Insulated fish hold": "保温鱼舱",
};

export const SHOP_KEYS = ["line", "reel", "rod", "hold"] as const;
export type ShopKey = (typeof SHOP_KEYS)[number];

const SHOP_NAME: { [key: string]: string } = {
  line: "鱼线",
  reel: "卷线器",
  rod: "鱼竿",
  hold: "鱼舱",
};

export function displayName(id: string): string {
  return FISH[id]?.nameZh ?? id;
}

/** rarity 在源表里是咬钩权重。这里只把它翻成卡片上的三档称呼。 */
export function rarityLabel(id: string): string {
  const rarity = FISH[id]?.rarity ?? 1;
  if (rarity >= 0.7) return "常见";
  if (rarity >= 0.45) return "少见";
  return "稀有";
}

export function shopName(key: string): string {
  return SHOP_NAME[key] ?? UPGRADES[key]?.name ?? key;
}

export function levelLabel(key: string, index: number): string {
  const label = UPGRADES[key]?.levels[index]?.label ?? "";
  return LABEL_ZH[label] ?? label;
}

export const FISH_RGB: { [id: string]: [number, number, number] } = {
  mullet: [217, 221, 226],
  sergeant: [242, 193, 78],
  yellowtail: [255, 210, 74],
  jack: [197, 208, 214],
  barracuda: [127, 140, 134],
  redSnapper: [226, 91, 69],
  tuna: [44, 76, 110],
  tarpon: [159, 215, 200],
};
