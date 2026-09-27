/**
 * 五块水域与四个时段。不是 tidewater 源文件的逐行移植。
 *
 * tidewater 用连续的水深 / 离礁 / 离码头（`Bites.habitatAt`，`Game.js` habitatAtPoint）
 * 决定栖息地。这里没有那张三维海图，改成策划可点的五块水，
 * 再用同一套 habitatAt 算出权重。蓄力越大，落点越深（仍落在该水域的深度带里）。
 */
import { habitatAt, type HabitatSample, type HabitatWeights } from "./Bites";

export type WaterId = "shallows" | "pier" | "reef" | "bay" | "deep";
export type PeriodId = "dawn" | "day" | "dusk" | "night";

export interface WaterDef {
  id: WaterId;
  name: string;
  depth: readonly [number, number];
  reefDist: number;
  pierDist: number;
}

export const WATERS: { [id in WaterId]: WaterDef } = {
  shallows: { id: "shallows", name: "浅滩", depth: [1.05, 2.4], reefDist: 48, pierDist: 48 },
  pier: { id: "pier", name: "码头", depth: [1.8, 3.4], reefDist: 36, pierDist: 1.2 },
  reef: { id: "reef", name: "礁石", depth: [3.2, 9], reefDist: -4, pierDist: 40 },
  bay: { id: "bay", name: "海湾", depth: [7, 15], reefDist: 50, pierDist: 50 },
  deep: { id: "deep", name: "深海", depth: [24, 36], reefDist: 90, pierDist: 90 },
};

export const WATER_IDS = Object.keys(WATERS) as WaterId[];

export const PERIODS: { [id in PeriodId]: { id: PeriodId; name: string; hour: number } } = {
  dawn: { id: "dawn", name: "清晨", hour: 6.5 },
  day: { id: "day", name: "白天", hour: 12 },
  dusk: { id: "dusk", name: "黄昏", hour: 18.5 },
  night: { id: "night", name: "夜晚", hour: 22 },
};

export const PERIOD_IDS = Object.keys(PERIODS) as PeriodId[];

/** 四个时段的清屏色和光。卡通纯色，不是原版大气。 */
export const PERIOD_LOOK: {
  [id in PeriodId]: { clear: number; fog: number; sun: number; ambient: number; sunInt: number };
} = {
  dawn: { clear: 0xf0b48a, fog: 0xe8a888, sun: 0xffc2a0, ambient: 0x9eb6d4, sunInt: 1.05 },
  day: { clear: 0x7eb6e0, fog: 0x8ec8ea, sun: 0xfff4e0, ambient: 0x8eb8dc, sunInt: 1.2 },
  dusk: { clear: 0xe08a62, fog: 0xd09068, sun: 0xffb070, ambient: 0x7eabcf, sunInt: 1.12 },
  night: { clear: 0x0e1a30, fog: 0x101828, sun: 0x6a88b0, ambient: 0x1a3050, sunInt: 0.28 },
};

/** Cocos 海面是一块无光纯色。饱和蓝，避开灰绿。预览在顶点色上再加暖色反光。 */
export const WATER_RGB: { [id in PeriodId]: readonly [number, number, number] } = {
  dawn: [58, 124, 178],
  day: [28, 132, 200],
  dusk: [24, 108, 178],
  night: [8, 28, 64],
};

/** 蓄力 0..1 把落点推进该水域的深度带。 */
export function spotAlong(water: WaterId, power: number): HabitatSample {
  const def = WATERS[water];
  const t = Math.min(1, Math.max(0, power));
  return {
    depth: def.depth[0] + (def.depth[1] - def.depth[0]) * t,
    reefDist: def.reefDist,
    pierDist: def.pierDist,
  };
}

export function habitatFor(water: WaterId, power: number): HabitatWeights {
  return habitatAt(spotAlong(water, power));
}
