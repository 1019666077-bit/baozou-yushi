/**
 * Ported from tidewater `src/game/Bites.js`
 * https://github.com/dgreenheck/tidewater (MIT, Copyright (c) 2026 DRG Software Solutions LLC)
 *
 * 栖息地权重、时段活跃度、咬钩鱼种、体重分布、等待时间。rng 可注入。
 */
import { FISH, FISH_IDS } from "./FishTable";

export interface HabitatSample {
  depth: number;
  reefDist: number;
  pierDist: number;
}

export interface HabitatWeights {
  shallows: number;
  reef: number;
  pier: number;
  bay: number;
  deep: number;
}

export function habitatAt({ depth, reefDist, pierDist }: HabitatSample): HabitatWeights {
  const h: HabitatWeights = { shallows: 0, reef: 0, pier: 0, bay: 0, deep: 0 };
  if (depth < 0.25) return h;
  h.shallows = smooth(3.5, 1.0, depth);
  h.reef = smooth(12, -6, reefDist) * smooth(0.8, 2.5, depth);
  h.pier = smooth(9, 2, pierDist) * smooth(0.6, 2, depth);
  h.bay = smooth(1.5, 4, depth) * (1 - smooth(18, 30, depth));
  h.deep = smooth(16, 28, depth);
  return h;
}

/** 1 在偏好时段，其余时间更低。hour 为 0..24。 */
export function activity(pref: string, hour: number): number {
  const dawn = Math.exp(-((hour - 6.5) ** 2) / 2.5);
  const dusk = Math.exp(-((hour - 18.5) ** 2) / 2.5);
  const night = hour < 5.5 || hour > 19.5 ? 1 : 0;
  const day = hour > 7 && hour < 18 ? 1 : 0.35;
  switch (pref) {
    case "day": return 0.25 + 0.75 * day * (1 - night);
    case "dawnDusk": return 0.3 + 0.7 * Math.max(dawn, dusk) + 0.1 * day;
    case "night": return 0.15 + 0.85 * Math.max(night, dusk * 0.8);
    default: return 0.8 + 0.2 * Math.max(dawn, dusk);
  }
}

/** 按权重抽鱼。这片水没鱼时返回 null。 */
export function pickSpecies(
  habitat: HabitatWeights,
  hour: number,
  rng: () => number = Math.random,
): string | null {
  let total = 0;
  const weights: number[] = [];
  for (const id of FISH_IDS) {
    const fish = FISH[id];
    let hw = 0;
    for (const key in fish.habitat) {
      hw += fish.habitat[key] * habitat[key as keyof HabitatWeights];
    }
    const score = hw * fish.rarity * activity(fish.time, hour);
    weights.push(score);
    total += score;
  }
  if (total < 1e-4) return null;
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return FISH_IDS[i];
  }
  return FISH_IDS[FISH_IDS.length - 1];
}

/** 体重偏小。奖杯尺寸少见。 */
export function rollWeight(id: string, rng: () => number = Math.random): number {
  const [minKg, maxKg] = FISH[id].kg;
  const t = Math.pow(rng(), 2.2);
  return minKg + (maxKg - minKg) * t;
}

/** 水越富，咬得越快。贫瘠水域返回 Infinity。 */
export function biteDelay(
  habitat: HabitatWeights,
  hour: number,
  rng: () => number = Math.random,
): number {
  let rich = 0;
  for (const key in habitat) rich += habitat[key as keyof HabitatWeights];
  if (rich < 0.05) return Infinity;
  rich = Math.max(rich, 0.35);
  const light = hour > 6 && hour < 19 ? 1 : 0.8;
  const mean = 8 / (Math.min(rich, 1.6) * light);
  return 2 + -Math.log(1 - rng() * 0.98) * mean * 0.6;
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
