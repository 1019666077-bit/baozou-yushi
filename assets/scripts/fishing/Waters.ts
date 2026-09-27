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
