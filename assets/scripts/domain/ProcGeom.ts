/**
 * 2.5D 程序几何预算与零件清单。无贴图、无外部 glTF。
 * Runtime 用 primitives 实例化；代理只读预算，不冒充 Creator 网格。
 */
export const STAGE_BUDGET = {
  /** 水面分段：17×11=187 顶点，低于 220。低配改成整板，不改顶点。 */
  maxWaterVerts: 220,
  waterSegX: 16,
  waterSegZ: 10,
  /** 一条鱼最多 5 个 primitive，共享 sphere/box mesh。 */
  maxFishParts: 5,
  /** 港口场景网格上限（含岛、桩、摊），避免微信主包膨胀。 */
  maxHarborMeshes: 42,
  maxHuntMeshes: 36,
  /** 只一盏平行光；不走实时点光/阴影。 */
  maxLights: 1,
  /** 0 贴图字节：unlit 顶点色/材质色。 */
  textureBytes: 0,
  note: "builtin-unlit + 同色合批；低配关水面分段与相机跟镜",
};

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
};

const WOOD: [number, number, number] = [196, 126, 58];
const WOOD_DARK: [number, number, number] = [120, 72, 36];
const WOOD_LIGHT: [number, number, number] = [236, 184, 104];
const MARKET: [number, number, number] = [214, 78, 48];
const GOLD: [number, number, number] = [255, 198, 88];

export function waterParts(
  near: readonly [number, number, number],
  deep: readonly [number, number, number],
): StagePart[] {
  return [
    { name: "Water", kind: "plane", x: 1.6, y: -0.02, z: 0.1, sx: 24, sy: 1, sz: 18, color: [...near, 230] },
    { name: "Deep", kind: "plane", x: 5.2, y: -0.06, z: -2.8, sx: 12, sy: 1, sz: 9, color: [...deep, 220] },
    { name: "Foam", kind: "box", x: -1.1, y: 0.02, z: 0.35, sx: 18, sy: 0.03, sz: 0.22, color: [255, 244, 210, 90] },
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
    });
  }
  return [
    { name: "Dock", kind: "box", x: -4.2, y: 0.14, z: 1.2, sx: 4.6, sy: 0.2, sz: 2.5, color: WOOD },
    { name: "Plank", kind: "box", x: -4.2, y: 0.26, z: 1.2, sx: 4.5, sy: 0.04, sz: 2.4, color: WOOD_LIGHT },
    { name: "Crate", kind: "box", x: -5.15, y: 0.62, z: 1.55, sx: 0.82, sy: 0.68, sz: 0.82, color: [24, 154, 170] },
    { name: "CrateLid", kind: "box", x: -5.15, y: 0.98, z: 1.55, sx: 0.86, sy: 0.08, sz: 0.86, color: GOLD },
    ...piles,
  ];
}

export function boatParts(): StagePart[] {
  return [
    { name: "Hull", kind: "box", x: 0, y: 0, z: 0, sx: 1.2, sy: 0.28, sz: 0.5, color: [214, 156, 72] },
    { name: "Gunwale", kind: "box", x: 0, y: 0.16, z: 0, sx: 1.16, sy: 0.06, sz: 0.46, color: WOOD_LIGHT },
    { name: "Cabin", kind: "box", x: 0.14, y: 0.28, z: 0, sx: 0.4, sy: 0.24, sz: 0.32, color: [255, 228, 176] },
    { name: "Mast", kind: "box", x: -0.08, y: 0.46, z: 0, sx: 0.06, sy: 0.55, sz: 0.06, color: WOOD_DARK },
    { name: "Sail", kind: "box", x: 0.12, y: 0.52, z: 0, sx: 0.42, sy: 0.32, sz: 0.04, color: [255, 148, 42] },
  ];
}

export function fishParts(
  body: readonly [number, number, number],
  belly: readonly [number, number, number],
  accent: readonly [number, number, number],
  scale: number,
): StagePart[] {
  const s = scale;
  return [
    { name: "Body", kind: "sphere", x: 0, y: 0, z: 0, sx: 1.5 * s, sy: 0.42 * s, sz: 0.55 * s, color: body },
    { name: "Belly", kind: "sphere", x: 0.12 * s, y: -0.08 * s, z: 0, sx: 0.9 * s, sy: 0.22 * s, sz: 0.36 * s, color: belly },
    { name: "Tail", kind: "box", x: -0.85 * s, y: 0, z: 0, sx: 0.42 * s, sy: 0.08 * s, sz: 0.36 * s, color: accent },
    { name: "Dorsal", kind: "box", x: 0.08 * s, y: 0.22 * s, z: 0, sx: 0.28 * s, sy: 0.22 * s, sz: 0.06 * s, color: accent },
    { name: "Weak", kind: "sphere", x: 0.42 * s, y: 0.12 * s, z: 0.12 * s, sx: 0.14 * s, sy: 0.14 * s, sz: 0.14 * s, color: [255, 236, 90] },
  ];
}

export function harborExtraParts(look: {
  land: readonly [number, number, number];
  landDark: readonly [number, number, number];
  accent: readonly [number, number, number];
}): StagePart[] {
  return [
    { name: "FoamIsle", kind: "sphere", x: -1.8, y: 0.35, z: -4.8, sx: 2.4, sy: 0.7, sz: 1.5, color: look.land },
    { name: "PrismIsle", kind: "box", x: 1.6, y: 0.7, z: -5.2, sx: 1.1, sy: 1.6, sz: 0.8, color: look.land, rz: 18 },
    { name: "StormIsle", kind: "sphere", x: 5.4, y: 0.55, z: -5.6, sx: 1.8, sy: 1.1, sz: 1.2, color: look.landDark },
    { name: "Awning", kind: "box", x: -4.6, y: 0.82, z: 1.55, sx: 1.1, sy: 0.08, sz: 0.9, color: MARKET },
    { name: "Stall", kind: "box", x: -4.6, y: 0.48, z: 1.55, sx: 0.9, sy: 0.5, sz: 0.7, color: [236, 208, 148] },
    { name: "Lantern", kind: "sphere", x: -3.7, y: 0.95, z: 1.7, sx: 0.16, sy: 0.16, sz: 0.16, color: GOLD },
    { name: "Sun", kind: "sphere", x: 7.2, y: 5.4, z: -6.5, sx: 1.1, sy: 1.1, sz: 1.1, color: look.accent },
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
      { name: "IsleA", kind: "box", x: 4.6, y: 0.8, z: -4.8, sx: 1.3, sy: 1.8, sz: 0.9, color: look.land, rz: 16 },
      { name: "IsleB", kind: "box", x: -3.8, y: 0.45, z: -5.1, sx: 0.8, sy: 1.1, sz: 0.6, color: look.accent, rz: -12 },
    ];
  }
  if (islandId === "island_storm_eye") {
    return [
      { name: "IsleA", kind: "sphere", x: 4.4, y: 0.7, z: -5.0, sx: 2.2, sy: 1.4, sz: 1.6, color: look.landDark },
      { name: "Smoke", kind: "sphere", x: 4.6, y: 1.8, z: -5.1, sx: 0.7, sy: 0.5, sz: 0.7, color: [...look.accent, 80] },
    ];
  }
  return [
    { name: "IsleA", kind: "sphere", x: 4.8, y: 0.4, z: -4.6, sx: 2.4, sy: 0.7, sz: 1.6, color: look.land },
    { name: "IsleB", kind: "sphere", x: -4.6, y: 0.28, z: -4.9, sx: 1.4, sy: 0.45, sz: 1.0, color: look.landDark },
  ];
}

export function countParts(parts: StagePart[]): number {
  return parts.length;
}

export function stageMeshCap(kind: "harbor" | "hunt"): number {
  return kind === "harbor" ? STAGE_BUDGET.maxHarborMeshes : STAGE_BUDGET.maxHuntMeshes;
}
