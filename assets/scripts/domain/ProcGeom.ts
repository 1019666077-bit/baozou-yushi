/**
 * 2.5D 程序几何预算与零件清单。无贴图、无外部 glTF。
 * Runtime 用 primitives 实例化；代理只读预算，不冒充 Creator 网格。
 */
import type { FishSilhouette } from "./GrayLook";

export const STAGE_BUDGET = {
  /** 水面分段：17×11=187 顶点，低于 220。低配改成整板，不改顶点。 */
  maxWaterVerts: 220,
  waterSegX: 16,
  waterSegZ: 10,
  /** 一条鱼最多 5 个 primitive，共享 sphere/box mesh。 */
  maxFishParts: 5,
  /** 港口场景网格上限（含水、码头、岛、摊、船），避免微信主包膨胀。 */
  maxHarborMeshes: 42,
  maxHuntMeshes: 36,
  /** 只一盏平行光；不走实时点光/阴影。 */
  maxLights: 1,
  /** 0 贴图字节：unlit/standard 材质色 + 顶点波，不用 256 法线。 */
  textureBytes: 0,
  note: "顶点波水面 + 同色合批；低配关水面分段与相机跟镜",
};

export type StageFinish = "water" | "land" | "wood" | "fish" | "prop";

export type StagePart = {
  name: string;
  kind: "box" | "sphere" | "plane";
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: readonly [number, number, number, number?];
  rx?: number;
  ry?: number;
  rz?: number;
  finish?: StageFinish;
  /** 主水面：用预算分段做顶点波，不用共享整板。 */
  wave?: boolean;
  /** 灯笼 / 弱点 / 太阳：轻微自发光，仍零贴图。 */
  glow?: boolean;
};

const WOOD: [number, number, number] = [196, 126, 58];
const WOOD_DARK: [number, number, number] = [120, 72, 36];
const WOOD_LIGHT: [number, number, number] = [236, 184, 104];
const MARKET: [number, number, number] = [214, 78, 48];
const GOLD: [number, number, number] = [255, 198, 88];
const WEAK_GLOW: [number, number, number] = [255, 248, 72];

export const WATER_WAVE_AMP = 0.055;

function mixRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function shadeRgb(rgb: readonly [number, number, number], k: number): [number, number, number] {
  return [
    Math.max(0, Math.min(255, Math.round(rgb[0] * k))),
    Math.max(0, Math.min(255, Math.round(rgb[1] * k))),
    Math.max(0, Math.min(255, Math.round(rgb[2] * k))),
  ];
}

export function waterVertCount(): number {
  return (STAGE_BUDGET.waterSegX + 1) * (STAGE_BUDGET.waterSegZ + 1);
}

export function waterAmp(lowPower: boolean): number {
  return lowPower ? 0 : WATER_WAVE_AMP;
}

/** 局部/世界混用的矮波，几道叠加，不做贴图滚动法线。 */
export function waterHeight(x: number, z: number, t: number, amp = WATER_WAVE_AMP): number {
  if (amp <= 0) return 0;
  return (
    Math.sin(x * 0.42 + t * 1.45) * amp +
    Math.cos(z * 0.55 + t * 1.05) * amp * 0.62 +
    Math.sin((x + z) * 0.33 + t * 1.9) * amp * 0.28
  );
}

export function waterNormal(
  x: number,
  z: number,
  t: number,
  amp = WATER_WAVE_AMP,
): [number, number, number] {
  const e = 0.35;
  const dx = (waterHeight(x + e, z, t, amp) - waterHeight(x - e, z, t, amp)) / (2 * e);
  const dz = (waterHeight(x, z + e, t, amp) - waterHeight(x, z - e, t, amp)) / (2 * e);
  const nx = -dx;
  const ny = 1;
  const nz = -dz;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

/** 按 stride=3 改 Y，并可选写 normals。返回顶点数。 */
export function displaceWaterPositions(
  positions: number[] | Float32Array,
  time: number,
  amp: number,
  xScale = 1,
  zScale = 1,
  normals?: number[] | Float32Array,
): number {
  let n = 0;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i] * xScale;
    const z = positions[i + 2] * zScale;
    positions[i + 1] = waterHeight(x, z, time, amp);
    if (normals && i + 2 < normals.length) {
      const nor = waterNormal(x, z, time, amp);
      normals[i] = nor[0];
      normals[i + 1] = nor[1];
      normals[i + 2] = nor[2];
    }
    n += 1;
  }
  return n;
}

export function waterParts(
  near: readonly [number, number, number],
  deep: readonly [number, number, number],
): StagePart[] {
  const mid = mixRgb(near, deep, 0.48);
  return [
    {
      name: "Water",
      kind: "plane",
      x: 1.6,
      y: -0.02,
      z: 0.1,
      sx: 24,
      sy: 1,
      sz: 18,
      color: near,
      finish: "water",
      wave: true,
    },
    {
      name: "Mid",
      kind: "plane",
      x: 3.5,
      y: -0.045,
      z: -1.5,
      sx: 16,
      sy: 1,
      sz: 11,
      color: mid,
      finish: "water",
    },
    {
      name: "Deep",
      kind: "plane",
      x: 5.4,
      y: -0.07,
      z: -3.1,
      sx: 12,
      sy: 1,
      sz: 9,
      color: deep,
      finish: "water",
    },
    {
      name: "Foam",
      kind: "box",
      x: -1.1,
      y: 0.03,
      z: 0.35,
      sx: 18,
      sy: 0.03,
      sz: 0.22,
      color: [255, 244, 214],
      finish: "water",
    },
  ];
}

export function dockParts(): StagePart[] {
  const piles: StagePart[] = [];
  for (let i = 0; i < 5; i++) {
    piles.push({
      name: `Pile${i}`,
      kind: "box",
      x: -5.4 + i * 0.7,
      y: -0.15,
      z: 1.55,
      sx: 0.16,
      sy: 0.7,
      sz: 0.16,
      color: WOOD_DARK,
      finish: "wood",
    });
  }
  return [
    {
      name: "Dock",
      kind: "box",
      x: -4.2,
      y: 0.14,
      z: 1.2,
      sx: 4.6,
      sy: 0.2,
      sz: 2.5,
      color: WOOD,
      finish: "wood",
    },
    {
      name: "Plank",
      kind: "box",
      x: -4.2,
      y: 0.26,
      z: 1.2,
      sx: 4.5,
      sy: 0.04,
      sz: 2.4,
      color: WOOD_LIGHT,
      finish: "wood",
    },
    {
      name: "Rail",
      kind: "box",
      x: -4.2,
      y: 0.5,
      z: 0.06,
      sx: 4.4,
      sy: 0.08,
      sz: 0.08,
      color: WOOD_DARK,
      finish: "wood",
    },
    {
      name: "Steps",
      kind: "box",
      x: -2.15,
      y: 0.02,
      z: 0.52,
      sx: 0.72,
      sy: 0.16,
      sz: 0.95,
      color: WOOD,
      finish: "wood",
    },
    {
      name: "Crate",
      kind: "box",
      x: -5.15,
      y: 0.62,
      z: 1.55,
      sx: 0.82,
      sy: 0.68,
      sz: 0.82,
      color: [24, 154, 170],
      finish: "prop",
    },
    {
      name: "CrateLid",
      kind: "box",
      x: -5.15,
      y: 0.98,
      z: 1.55,
      sx: 0.86,
      sy: 0.08,
      sz: 0.86,
      color: GOLD,
      finish: "prop",
      glow: true,
    },
    {
      name: "BowCrate",
      kind: "box",
      x: -3.35,
      y: 0.48,
      z: 1.88,
      sx: 0.42,
      sy: 0.36,
      sz: 0.42,
      color: [18, 132, 148],
      finish: "prop",
    },
    ...piles,
  ];
}

export function boatParts(): StagePart[] {
  return [
    {
      name: "Hull",
      kind: "box",
      x: 0,
      y: 0,
      z: 0,
      sx: 1.2,
      sy: 0.28,
      sz: 0.5,
      color: [214, 156, 72],
      finish: "wood",
    },
    {
      name: "Gunwale",
      kind: "box",
      x: 0,
      y: 0.16,
      z: 0,
      sx: 1.16,
      sy: 0.06,
      sz: 0.46,
      color: WOOD_LIGHT,
      finish: "wood",
    },
    {
      name: "Cabin",
      kind: "box",
      x: 0.14,
      y: 0.28,
      z: 0,
      sx: 0.4,
      sy: 0.24,
      sz: 0.32,
      color: [255, 228, 176],
      finish: "wood",
    },
    {
      name: "Mast",
      kind: "box",
      x: -0.08,
      y: 0.46,
      z: 0,
      sx: 0.06,
      sy: 0.55,
      sz: 0.06,
      color: WOOD_DARK,
      finish: "wood",
    },
    {
      name: "Sail",
      kind: "box",
      x: 0.12,
      y: 0.52,
      z: 0,
      sx: 0.42,
      sy: 0.32,
      sz: 0.04,
      color: [255, 148, 42],
      finish: "prop",
    },
  ];
}

type FishShape = {
  bodyKind: "box" | "sphere";
  scaleKind: "box" | "sphere";
  tailKind: "box" | "sphere";
  body: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rz?: number };
  face: { x: number; y: number; z: number; sx: number; sy: number; sz: number };
  scale: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rz?: number };
  tail: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rz?: number };
  weak: { x: number; y: number; z: number; sx: number; sy: number; sz: number };
};

function fishShape(kind: FishSilhouette, s: number): FishShape {
  const weak = { x: 0.58 * s, y: 0.16 * s, z: 0.16 * s, sx: 0.22 * s, sy: 0.22 * s, sz: 0.22 * s };
  if (kind === "eel") {
    return {
      bodyKind: "sphere",
      scaleKind: "sphere",
      tailKind: "box",
      body: { x: 0, y: 0, z: 0, sx: 2.15 * s, sy: 0.22 * s, sz: 0.22 * s },
      face: { x: 0.95 * s, y: 0.02 * s, z: 0, sx: 0.32 * s, sy: 0.2 * s, sz: 0.2 * s },
      scale: { x: 0.12 * s, y: 0.04 * s, z: 0, sx: 0.7 * s, sy: 0.12 * s, sz: 0.24 * s },
      tail: { x: -1.15 * s, y: 0, z: 0, sx: 0.36 * s, sy: 0.06 * s, sz: 0.28 * s },
      weak: { x: 0.42 * s, y: 0.12 * s, z: 0.1 * s, sx: 0.2 * s, sy: 0.2 * s, sz: 0.2 * s },
    };
  }
  if (kind === "whale") {
    return {
      bodyKind: "sphere",
      scaleKind: "sphere",
      tailKind: "box",
      body: { x: 0, y: 0, z: 0, sx: 1.85 * s, sy: 0.72 * s, sz: 0.82 * s },
      face: { x: 0.72 * s, y: 0.04 * s, z: 0, sx: 0.48 * s, sy: 0.4 * s, sz: 0.46 * s },
      scale: { x: 0.08 * s, y: -0.12 * s, z: 0, sx: 1.1 * s, sy: 0.28 * s, sz: 0.55 * s },
      tail: { x: -1.05 * s, y: 0.02 * s, z: 0, sx: 0.38 * s, sy: 0.08 * s, sz: 0.7 * s },
      weak,
    };
  }
  if (kind === "sail") {
    return {
      bodyKind: "sphere",
      scaleKind: "box",
      tailKind: "box",
      body: { x: 0, y: 0, z: 0, sx: 1.45 * s, sy: 0.36 * s, sz: 0.48 * s },
      face: { x: 0.52 * s, y: 0.02 * s, z: 0, sx: 0.36 * s, sy: 0.26 * s, sz: 0.32 * s },
      scale: { x: 0.04 * s, y: 0.42 * s, z: 0, sx: 0.22 * s, sy: 0.72 * s, sz: 0.07 * s },
      tail: { x: -0.82 * s, y: 0, z: 0, sx: 0.36 * s, sy: 0.07 * s, sz: 0.32 * s },
      weak: { x: 0.2 * s, y: 0.38 * s, z: 0.08 * s, sx: 0.2 * s, sy: 0.2 * s, sz: 0.2 * s },
    };
  }
  if (kind === "ray") {
    return {
      bodyKind: "sphere",
      scaleKind: "box",
      tailKind: "box",
      body: { x: 0, y: 0, z: 0, sx: 1.55 * s, sy: 0.2 * s, sz: 1.15 * s },
      face: { x: 0.48 * s, y: 0.04 * s, z: 0, sx: 0.32 * s, sy: 0.16 * s, sz: 0.28 * s },
      scale: { x: 0, y: 0.02 * s, z: 0, sx: 0.7 * s, sy: 0.08 * s, sz: 1.05 * s },
      tail: { x: -1.05 * s, y: 0, z: 0, sx: 0.7 * s, sy: 0.05 * s, sz: 0.1 * s },
      weak,
    };
  }
  if (kind === "jaw") {
    return {
      bodyKind: "box",
      scaleKind: "box",
      tailKind: "box",
      body: { x: 0, y: 0, z: 0, sx: 1.35 * s, sy: 0.48 * s, sz: 0.58 * s },
      face: { x: 0.62 * s, y: -0.02 * s, z: 0, sx: 0.5 * s, sy: 0.36 * s, sz: 0.42 * s },
      scale: { x: 0.05 * s, y: 0.16 * s, z: 0, sx: 0.7 * s, sy: 0.16 * s, sz: 0.5 * s },
      tail: { x: -0.82 * s, y: 0, z: 0, sx: 0.34 * s, sy: 0.1 * s, sz: 0.34 * s },
      weak,
    };
  }
  if (kind === "shell") {
    return {
      bodyKind: "sphere",
      scaleKind: "sphere",
      tailKind: "box",
      body: { x: 0, y: 0, z: 0, sx: 1.35 * s, sy: 0.5 * s, sz: 0.7 * s },
      face: { x: 0.48 * s, y: -0.02 * s, z: 0, sx: 0.36 * s, sy: 0.28 * s, sz: 0.34 * s },
      scale: { x: -0.05 * s, y: 0.2 * s, z: 0, sx: 0.85 * s, sy: 0.36 * s, sz: 0.62 * s },
      tail: { x: -0.78 * s, y: 0, z: 0, sx: 0.3 * s, sy: 0.08 * s, sz: 0.28 * s },
      weak,
    };
  }
  if (kind === "ribbon") {
    return {
      bodyKind: "sphere",
      scaleKind: "box",
      tailKind: "box",
      body: { x: 0, y: 0, z: 0, sx: 1.85 * s, sy: 0.24 * s, sz: 0.32 * s },
      face: { x: 0.78 * s, y: 0.02 * s, z: 0, sx: 0.3 * s, sy: 0.18 * s, sz: 0.22 * s },
      scale: { x: 0.1 * s, y: 0.06 * s, z: 0, sx: 0.9 * s, sy: 0.08 * s, sz: 0.34 * s },
      tail: { x: -1.02 * s, y: 0, z: 0, sx: 0.4 * s, sy: 0.05 * s, sz: 0.3 * s, rz: 18 },
      weak,
    };
  }
  if (kind === "pod") {
    return {
      bodyKind: "sphere",
      scaleKind: "sphere",
      tailKind: "box",
      body: { x: 0, y: 0, z: 0, sx: 1.05 * s, sy: 0.7 * s, sz: 0.7 * s },
      face: { x: 0.38 * s, y: 0.06 * s, z: 0, sx: 0.36 * s, sy: 0.32 * s, sz: 0.34 * s },
      scale: { x: 0.02 * s, y: -0.12 * s, z: 0, sx: 0.55 * s, sy: 0.28 * s, sz: 0.4 * s },
      tail: { x: -0.62 * s, y: 0, z: 0, sx: 0.28 * s, sy: 0.1 * s, sz: 0.22 * s },
      weak: { x: 0.08 * s, y: 0.22 * s, z: 0.18 * s, sx: 0.22 * s, sy: 0.22 * s, sz: 0.22 * s },
    };
  }
  if (kind === "hopper") {
    return {
      bodyKind: "sphere",
      scaleKind: "box",
      tailKind: "box",
      body: { x: 0.04 * s, y: 0, z: 0, sx: 1.25 * s, sy: 0.4 * s, sz: 0.5 * s },
      face: { x: 0.5 * s, y: 0.04 * s, z: 0, sx: 0.34 * s, sy: 0.26 * s, sz: 0.3 * s },
      scale: { x: 0.08 * s, y: 0.24 * s, z: 0, sx: 0.28 * s, sy: 0.28 * s, sz: 0.08 * s, rz: 18 },
      tail: { x: -0.72 * s, y: 0.02 * s, z: 0, sx: 0.4 * s, sy: 0.08 * s, sz: 0.32 * s, rz: -16 },
      weak,
    };
  }
  return {
    bodyKind: "sphere",
    scaleKind: "box",
    tailKind: "box",
    body: { x: 0, y: 0, z: 0, sx: 1.52 * s, sy: 0.44 * s, sz: 0.56 * s },
    face: { x: 0.5 * s, y: 0.03 * s, z: 0, sx: 0.4 * s, sy: 0.3 * s, sz: 0.36 * s },
    scale: { x: 0.02 * s, y: 0.08 * s, z: 0, sx: 0.62 * s, sy: 0.2 * s, sz: 0.58 * s },
    tail: { x: -0.9 * s, y: 0, z: 0, sx: 0.42 * s, sy: 0.08 * s, sz: 0.38 * s },
    weak,
  };
}

export function fishParts(
  body: readonly [number, number, number],
  belly: readonly [number, number, number],
  accent: readonly [number, number, number],
  scale: number,
  silhouette: FishSilhouette = "bayfin",
): StagePart[] {
  const s = scale;
  const face = mixRgb(belly, [255, 232, 196], 0.3);
  const scaleCol = mixRgb(body, accent, 0.4);
  const shape = fishShape(silhouette, s);
  return [
    { name: "Body", kind: shape.bodyKind, ...shape.body, color: body, finish: "fish" },
    { name: "Face", kind: "sphere", ...shape.face, color: face, finish: "fish" },
    { name: "Scale", kind: shape.scaleKind, ...shape.scale, color: scaleCol, finish: "fish" },
    { name: "Tail", kind: shape.tailKind, ...shape.tail, color: accent, finish: "fish" },
    { name: "Weak", kind: "sphere", ...shape.weak, color: WEAK_GLOW, finish: "fish", glow: true },
  ];
}

export function harborExtraParts(look: {
  land: readonly [number, number, number];
  landDark: readonly [number, number, number];
  accent: readonly [number, number, number];
}): StagePart[] {
  const foamHi = shadeRgb(look.land, 1.1);
  const stormLo = shadeRgb(look.landDark, 0.82);
  return [
    {
      name: "FoamIsle",
      kind: "sphere",
      x: -1.85,
      y: 0.22,
      z: -4.75,
      sx: 2.65,
      sy: 0.52,
      sz: 1.7,
      color: look.land,
      finish: "land",
    },
    {
      name: "FoamHill",
      kind: "sphere",
      x: -1.5,
      y: 0.58,
      z: -4.9,
      sx: 1.28,
      sy: 0.52,
      sz: 0.92,
      color: foamHi,
      finish: "land",
    },
    {
      name: "FoamPalm",
      kind: "box",
      x: -1.32,
      y: 1.08,
      z: -4.68,
      sx: 0.08,
      sy: 0.72,
      sz: 0.08,
      color: look.landDark,
      finish: "land",
    },
    {
      name: "FoamFrond",
      kind: "sphere",
      x: -1.32,
      y: 1.46,
      z: -4.68,
      sx: 0.58,
      sy: 0.18,
      sz: 0.42,
      color: look.landDark,
      finish: "land",
    },
    {
      name: "PrismIsle",
      kind: "box",
      x: 1.62,
      y: 0.42,
      z: -5.15,
      sx: 1.28,
      sy: 0.88,
      sz: 0.86,
      color: look.land,
      rz: 16,
      finish: "land",
    },
    {
      name: "PrismPeak",
      kind: "box",
      x: 1.72,
      y: 1.12,
      z: -5.22,
      sx: 0.52,
      sy: 0.82,
      sz: 0.38,
      color: shadeRgb(look.land, 1.12),
      rz: 22,
      finish: "land",
    },
    {
      name: "PrismShard",
      kind: "box",
      x: 1.12,
      y: 0.86,
      z: -4.92,
      sx: 0.26,
      sy: 0.68,
      sz: 0.2,
      color: look.accent,
      rz: -18,
      finish: "land",
    },
    {
      name: "StormIsle",
      kind: "sphere",
      x: 5.45,
      y: 0.36,
      z: -5.55,
      sx: 2.05,
      sy: 0.68,
      sz: 1.38,
      color: look.landDark,
      finish: "land",
    },
    {
      name: "StormPeak",
      kind: "sphere",
      x: 5.58,
      y: 0.96,
      z: -5.68,
      sx: 1.02,
      sy: 0.68,
      sz: 0.76,
      color: stormLo,
      finish: "land",
    },
    {
      name: "StormPlume",
      kind: "sphere",
      x: 5.62,
      y: 1.68,
      z: -5.72,
      sx: 0.52,
      sy: 0.42,
      sz: 0.52,
      color: look.accent,
      finish: "prop",
      glow: true,
    },
    {
      name: "Awning",
      kind: "box",
      x: -4.6,
      y: 0.94,
      z: 1.55,
      sx: 1.22,
      sy: 0.07,
      sz: 0.96,
      color: MARKET,
      rz: -6,
      finish: "prop",
    },
    {
      name: "Stall",
      kind: "box",
      x: -4.6,
      y: 0.48,
      z: 1.55,
      sx: 0.9,
      sy: 0.5,
      sz: 0.7,
      color: [236, 208, 148],
      finish: "wood",
    },
    {
      name: "PoleL",
      kind: "box",
      x: -5.12,
      y: 0.72,
      z: 1.92,
      sx: 0.07,
      sy: 0.55,
      sz: 0.07,
      color: WOOD_DARK,
      finish: "wood",
    },
    {
      name: "PoleR",
      kind: "box",
      x: -4.08,
      y: 0.72,
      z: 1.18,
      sx: 0.07,
      sy: 0.55,
      sz: 0.07,
      color: WOOD_DARK,
      finish: "wood",
    },
    {
      name: "Banner",
      kind: "box",
      x: -4.55,
      y: 1.14,
      z: 1.55,
      sx: 0.72,
      sy: 0.16,
      sz: 0.04,
      color: GOLD,
      finish: "prop",
    },
    {
      name: "Lantern",
      kind: "sphere",
      x: -3.68,
      y: 1.0,
      z: 1.74,
      sx: 0.18,
      sy: 0.18,
      sz: 0.18,
      color: GOLD,
      finish: "prop",
      glow: true,
    },
    {
      name: "Haze",
      kind: "box",
      x: 2.6,
      y: 1.85,
      z: -7.45,
      sx: 18,
      sy: 1.55,
      sz: 0.36,
      color: [255, 176, 108],
      finish: "prop",
    },
    {
      name: "Sun",
      kind: "sphere",
      x: 7.45,
      y: 5.15,
      z: -6.85,
      sx: 1.28,
      sy: 1.28,
      sz: 1.28,
      color: look.accent,
      finish: "prop",
      glow: true,
    },
  ];
}

export function huntIsleParts(
  islandId: string,
  look: {
    land: readonly [number, number, number];
    landDark: readonly [number, number, number];
    accent: readonly [number, number, number];
  },
): StagePart[] {
  if (islandId === "island_prism_reef") {
    return [
      {
        name: "IsleA",
        kind: "box",
        x: 4.6,
        y: 0.55,
        z: -4.8,
        sx: 1.35,
        sy: 1.15,
        sz: 0.92,
        color: look.land,
        rz: 16,
        finish: "land",
      },
      {
        name: "IslePeak",
        kind: "box",
        x: 4.72,
        y: 1.35,
        z: -4.88,
        sx: 0.55,
        sy: 0.85,
        sz: 0.4,
        color: look.accent,
        rz: 20,
        finish: "land",
      },
      {
        name: "IsleB",
        kind: "box",
        x: -3.8,
        y: 0.42,
        z: -5.1,
        sx: 0.8,
        sy: 0.95,
        sz: 0.6,
        color: look.accent,
        rz: -12,
        finish: "land",
      },
    ];
  }
  if (islandId === "island_storm_eye") {
    return [
      {
        name: "IsleA",
        kind: "sphere",
        x: 4.4,
        y: 0.48,
        z: -5.0,
        sx: 2.25,
        sy: 0.95,
        sz: 1.65,
        color: look.landDark,
        finish: "land",
      },
      {
        name: "IslePeak",
        kind: "sphere",
        x: 4.55,
        y: 1.15,
        z: -5.12,
        sx: 1.05,
        sy: 0.7,
        sz: 0.8,
        color: shadeRgb(look.landDark, 0.8),
        finish: "land",
      },
      {
        name: "Smoke",
        kind: "sphere",
        x: 4.62,
        y: 1.85,
        z: -5.15,
        sx: 0.68,
        sy: 0.48,
        sz: 0.68,
        color: look.accent,
        finish: "prop",
        glow: true,
      },
    ];
  }
  return [
    {
      name: "IsleA",
      kind: "sphere",
      x: 4.85,
      y: 0.28,
      z: -4.55,
      sx: 2.5,
      sy: 0.55,
      sz: 1.65,
      color: look.land,
      finish: "land",
    },
    {
      name: "IsleHill",
      kind: "sphere",
      x: 5.05,
      y: 0.62,
      z: -4.7,
      sx: 1.2,
      sy: 0.48,
      sz: 0.9,
      color: shadeRgb(look.land, 1.1),
      finish: "land",
    },
    {
      name: "IsleB",
      kind: "sphere",
      x: -4.6,
      y: 0.24,
      z: -4.9,
      sx: 1.45,
      sy: 0.4,
      sz: 1.02,
      color: look.landDark,
      finish: "land",
    },
    {
      name: "IsleRock",
      kind: "box",
      x: -4.35,
      y: 0.52,
      z: -4.7,
      sx: 0.42,
      sy: 0.38,
      sz: 0.3,
      color: shadeRgb(look.landDark, 0.75),
      rz: 14,
      finish: "land",
    },
  ];
}

export function countParts(parts: StagePart[]): number {
  return parts.length;
}

export function findPart(parts: StagePart[], name: string): StagePart | undefined {
  return parts.find((part) => part.name === name);
}

export function stageMeshCap(kind: "harbor" | "hunt"): number {
  return kind === "harbor" ? STAGE_BUDGET.maxHarborMeshes : STAGE_BUDGET.maxHuntMeshes;
}
