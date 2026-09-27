/**
 * Ported from tidewater `src/game/FishTable.js`
 * https://github.com/dgreenheck/tidewater (MIT, Copyright (c) 2026 DRG Software Solutions LLC)
 *
 * 原表 18 种，这里按五块水域裁成 8 种。除 `nameZh`（本游戏中文名）外，
 * 数值与字段和源文件一致：lw、habitat、kg、price、fight、stamina、time、rarity。
 */

export type TimePref = "day" | "dawnDusk" | "night" | "any";

export interface FishDef {
  name: string;
  nameZh: string;
  sci: string;
  lw: readonly [number, number];
  model: string;
  habitat: { [key: string]: number };
  kg: readonly [number, number];
  price: number;
  fight: number;
  stamina: number;
  time: TimePref;
  rarity: number;
}

export const FISH: { [id: string]: FishDef } = {
  mullet: { name: "Striped mullet", nameZh: "鲻鱼", sci: "Mugil cephalus", lw: [0.0112, 2.98], model: "mullet", habitat: { shallows: 1, pier: 0.4 }, kg: [0.4, 2.2], price: 5, fight: 0.3, stamina: 5, time: "day", rarity: 0.8 },
  sergeant: { name: "Sergeant major", nameZh: "军曹雀鲷", sci: "Abudefduf saxatilis", lw: [0.0234, 3.0], model: "sergeant", habitat: { pier: 1, reef: 0.8 }, kg: [0.1, 0.35], price: 6, fight: 0.15, stamina: 2.5, time: "day", rarity: 1 },
  yellowtail: { name: "Yellowtail snapper", nameZh: "黄尾笛鲷", sci: "Ocyurus chrysurus", lw: [0.0137, 2.98], model: "yellowtail", habitat: { reef: 1, pier: 0.4, bay: 0.4 }, kg: [0.4, 1.6], price: 12, fight: 0.4, stamina: 5, time: "dawnDusk", rarity: 0.9 },
  jack: { name: "Crevalle jack", nameZh: "马鲹", sci: "Caranx hippos", lw: [0.02, 2.93], model: "jack", habitat: { shallows: 0.5, pier: 0.7, bay: 0.8 }, kg: [1, 9], price: 6, fight: 0.75, stamina: 12, time: "dawnDusk", rarity: 0.5 },
  barracuda: { name: "Great barracuda", nameZh: "大梭鱼", sci: "Sphyraena barracuda", lw: [0.0051, 3.08], model: "barracuda", habitat: { reef: 0.5, bay: 0.8, deep: 0.5 }, kg: [2, 16], price: 5, fight: 0.7, stamina: 11, time: "any", rarity: 0.45 },
  redSnapper: { name: "Red snapper", nameZh: "红鲷", sci: "Lutjanus campechanus", lw: [0.0137, 2.98], model: "redSnapper", habitat: { deep: 1, bay: 0.2 }, kg: [1.5, 9], price: 18, fight: 0.5, stamina: 9, time: "any", rarity: 0.7 },
  tuna: { name: "Blackfin tuna", nameZh: "黑鳍金枪鱼", sci: "Thunnus atlanticus", lw: [0.0145, 3.0], model: "tuna", habitat: { deep: 1 }, kg: [3, 14], price: 16, fight: 0.85, stamina: 16, time: "dawnDusk", rarity: 0.5 },
  tarpon: { name: "Tarpon", nameZh: "大海鲢", sci: "Megalops atlanticus", lw: [0.0077, 3.02], model: "tarpon", habitat: { pier: 0.35, bay: 0.5, shallows: 0.15 }, kg: [10, 45], price: 4, fight: 1, stamina: 24, time: "night", rarity: 0.2 },
};

export const FISH_IDS = Object.keys(FISH);

/** $ / 金币。体长接近上限的鱼每公斤再加一点。原 fishValue。 */
export function fishValue(id: string, kg: number): number {
  const fish = FISH[id];
  const span = Math.max(fish.kg[1] - fish.kg[0], 1e-6);
  const t = (kg - fish.kg[0]) / span;
  return Math.max(1, Math.round(fish.price * kg * (1 + 0.25 * Math.max(0, t - 0.7) / 0.3)));
}

/** 全长厘米。W(g) = a * L(cm) ^ b。原 fishLengthCm。 */
export function fishLengthCm(id: string, kg: number): number {
  const [a, b] = FISH[id].lw;
  return Math.pow(Math.max(kg, 0.001) * 1000 / a, 1 / b);
}

export function lengthRangeCm(id: string): [number, number] {
  const fish = FISH[id];
  return [fishLengthCm(id, fish.kg[0]), fishLengthCm(id, fish.kg[1])];
}
