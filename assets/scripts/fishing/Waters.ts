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

/**
 * 低多边形天色。色标的钟点对齐 tidewater 界面用的天空键，不是大气着色器。
 * 太阳方向是同一套简化太阳位置：+x 东，-z 北，+y 上。
 */
const SKY_KEYS: { hour: number; zenith: number; horizon: number }[] = [
  { hour: 0, zenith: 0x040915, horizon: 0x0b1730 },
  { hour: 4.4, zenith: 0x060d22, horizon: 0x18244a },
  { hour: 5.3, zenith: 0x18264f, horizon: 0xb0616a },
  { hour: 6.1, zenith: 0x35609e, horizon: 0xf2a86e },
  { hour: 7.6, zenith: 0x3d7cc2, horizon: 0xa8d2ec },
  { hour: 12, zenith: 0x2c74c6, horizon: 0xc2e4f6 },
  { hour: 16.3, zenith: 0x3778be, horizon: 0xb6daee },
  { hour: 17.4, zenith: 0x3a5d9c, horizon: 0xf1a25f },
  { hour: 18.1, zenith: 0x262f5d, horizon: 0xdc6a4e },
  { hour: 18.9, zenith: 0x101a3c, horizon: 0x473358 },
  { hour: 19.8, zenith: 0x050b1a, horizon: 0x0f1b36 },
  { hour: 24, zenith: 0x040915, horizon: 0x0b1730 },
];

export interface SunDir {
  x: number;
  y: number;
  z: number;
}

export function sunDirection(hour: number): SunDir {
  const phi = (24 * Math.PI) / 180;
  const dec = (6 * Math.PI) / 180;
  const wrapped = ((hour % 24) + 24) % 24;
  const H = ((wrapped - 12) * 15 * Math.PI) / 180;
  const east = -Math.cos(dec) * Math.sin(H);
  const north = Math.cos(phi) * Math.sin(dec) - Math.sin(phi) * Math.cos(dec) * Math.cos(H);
  const up = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  const len = Math.hypot(east, up, north) || 1;
  return { x: east / len, y: up / len, z: -north / len };
}

function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function skyAt(hour: number): { zenith: number; horizon: number } {
  const hh = ((hour % 24) + 24) % 24;
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    const a = SKY_KEYS[i];
    const b = SKY_KEYS[i + 1];
    if (hh >= a.hour && hh <= b.hour) {
      const u = (hh - a.hour) / ((b.hour - a.hour) || 1);
      const s = u * u * (3 - 2 * u);
      return { zenith: mixHex(a.zenith, b.zenith, s), horizon: mixHex(a.horizon, b.horizon, s) };
    }
  }
  return { zenith: SKY_KEYS[0].zenith, horizon: SKY_KEYS[0].horizon };
}

export interface ShoreLook {
  zenith: number;
  horizon: number;
  fog: number;
  sun: number;
  ambient: number;
  sunInt: number;
  ambientInt: number;
  sunDir: SunDir;
  waterNear: readonly [number, number, number];
  waterFar: readonly [number, number, number];
  waterShallow: readonly [number, number, number];
  glint: readonly [number, number, number];
  foam: readonly [number, number, number];
  fogNear: number;
  fogFar: number;
}

function rgbOf(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function mixRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** 按钟点取天色、太阳和水色。甲板灯只在太阳落到地平线下时把光照提亮一档。 */
export function shoreLook(hour: number, deckLights = false): ShoreLook {
  const sky = skyAt(hour);
  const sunDir = sunDirection(hour);
  const day = Math.min(1, Math.max(0, sunDir.y * 1.8));
  const low = Math.min(1, Math.max(0, 0.35 - sunDir.y) / 0.35);
  const night = 1 - day;
  const sun = mixHex(0xfff2d2, 0xff9a4a, low * 0.85);
  const ambient = mixHex(sky.zenith, 0x9eb6d4, day * 0.55);
  const waterDay: [number, number, number] = [18, 118, 186];
  const waterNight: [number, number, number] = [6, 22, 48];
  const waterWarm: [number, number, number] = [28, 78, 128];
  const near = mixRgb(mixRgb(waterNight, waterDay, day), waterWarm, low * 0.45);
  const far = mixRgb(near, rgbOf(sky.horizon), 0.28 + night * 0.35);
  const shallow: [number, number, number] = mixRgb([168, 176, 132], near, 0.35);
  const glint = rgbOf(sun);
  const lifted = night > 0.65 && deckLights;
  return {
    zenith: sky.zenith,
    horizon: sky.horizon,
    fog: sky.horizon,
    sun: lifted ? 0xffb070 : sun,
    ambient: lifted ? 0x7eabcf : ambient,
    sunInt: lifted ? 0.85 : 0.22 + day * 1.05 + low * 0.25,
    ambientInt: lifted ? 0.62 : 0.28 + day * 0.4,
    sunDir,
    waterNear: near,
    waterFar: far,
    waterShallow: shallow,
    glint,
    foam: [236, 244, 242],
    fogNear: 28 + day * 70,
    fogFar: 90 + day * 120,
  };
}
