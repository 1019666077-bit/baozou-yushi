/**
 * 潮退浮站灰盒布局：海 / 天际环 / 地基格 / 订单板 / 渔夫。
 * 只提供零件清单与扩建常量；HarborStage 负责按名分层实例化。
 * 零贴图、primitives 低模。不引用竞品名或素材。
 */
import {
  STAGE_BUDGET,
  boatParts,
  countParts,
  flotsamParts,
  type StagePart,
} from "./ProcGeom";

const WOOD: [number, number, number] = [196, 126, 58];
const WOOD_DARK: [number, number, number] = [120, 72, 36];
const WOOD_LIGHT: [number, number, number] = [236, 184, 104];
const MARKET: [number, number, number] = [214, 78, 48];
const GOLD: [number, number, number] = [255, 198, 88];
const CRATE: [number, number, number] = [24, 154, 170];
const SKIN: [number, number, number] = [232, 186, 142];
const CLOTH: [number, number, number] = [28, 132, 148];
const TROUSER: [number, number, number] = [52, 68, 86];

export const TIDE_STATION = {
  /** NxN 木板格。改这个即可扩浮台，不必重写零件。 */
  foundationGrid: 3,
  /** 单格边长（世界单位）。tier 2 会略放大。 */
  tileSize: 1.36,
  tileGap: 0.05,
  tileThick: 0.18,
  /** 半淹楼影一圈。 */
  horizonCount: 8,
  horizonRadius: 12.4,
  /** 斜俯视：抬高 + 更俯，一眼海环与浮台。 */
  cam: {
    x: 1.05,
    y: 10.7,
    z: 12.35,
    pitch: -46,
    yaw: 16,
    fov: 40,
    far: 90,
  },
  fisherman: { x: -0.55, y: 0, z: 0.42 },
  orderBoard: { x: 1.08, y: 0, z: -0.82 },
  boat: { x: 2.55, y: 0.34, z: 0.15 },
} as const;

export const TIDE_STATION_LAYERS = [
  "Ocean",
  "Horizon",
  "RaftRoot",
  "OrderBoard",
  "Fisherman",
] as const;

export type TideStationLayer = (typeof TIDE_STATION_LAYERS)[number];

export type TideStationLook = {
  near: readonly [number, number, number];
  deep: readonly [number, number, number];
  land: readonly [number, number, number];
  landDark: readonly [number, number, number];
  accent: readonly [number, number, number];
};

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

export function foundationPitch(tileSize: number, tileGap: number): number {
  return tileSize + tileGap;
}

/** 地基格中心。扩建时按 (ix, iz) 往外铺即可。 */
export function foundationCellCenter(
  ix: number,
  iz: number,
  opts?: { grid?: number; tileSize?: number; tileGap?: number },
): { x: number; z: number } {
  const grid = opts?.grid ?? TIDE_STATION.foundationGrid;
  const tileSize = opts?.tileSize ?? TIDE_STATION.tileSize;
  const tileGap = opts?.tileGap ?? TIDE_STATION.tileGap;
  const pitch = foundationPitch(tileSize, tileGap);
  const origin = -((grid - 1) * pitch) / 2;
  return { x: origin + ix * pitch, z: origin + iz * pitch };
}

export function foundationTileName(ix: number, iz: number): string {
  return `Foundation_${ix}_${iz}`;
}

export function foundationExtent(
  grid: number = TIDE_STATION.foundationGrid,
  tileSize: number = TIDE_STATION.tileSize,
  tileGap: number = TIDE_STATION.tileGap,
): number {
  if (grid <= 0) return 0;
  return grid * tileSize + (grid - 1) * tileGap;
}

/** 预留扩建：把 N 改成 nextGrid 即可加一圈格子。 */
export function expandFoundationGrid(nextGrid: number): number {
  const n = Math.max(1, Math.floor(nextGrid));
  return n;
}

function tileSizeForTier(tier: number): number {
  return TIDE_STATION.tileSize * (tier >= 2 ? 1.12 : 1);
}

export function oceanParts(
  near: readonly [number, number, number],
  deep: readonly [number, number, number],
): StagePart[] {
  const mid = mixRgb(near, deep, 0.48);
  const far = mixRgb(deep, [18, 28, 48], 0.35);
  return [
    {
      name: "Water",
      kind: "plane",
      x: 0,
      y: -0.02,
      z: 0,
      sx: 28,
      sy: 1,
      sz: 28,
      color: near,
      finish: "water",
      wave: true,
    },
    {
      name: "Mid",
      kind: "plane",
      x: 0.4,
      y: -0.05,
      z: -1.2,
      sx: 22,
      sy: 1,
      sz: 22,
      color: mid,
      finish: "water",
    },
    {
      name: "Deep",
      kind: "plane",
      x: 0.8,
      y: -0.08,
      z: -2.4,
      sx: 16,
      sy: 1,
      sz: 16,
      color: deep,
      finish: "water",
    },
    {
      name: "Foam",
      kind: "box",
      x: 0,
      y: 0.03,
      z: 0,
      sx: 5.6,
      sy: 0.03,
      sz: 5.6,
      color: [255, 244, 214],
      finish: "water",
    },
    {
      name: "FarBand",
      kind: "plane",
      x: 0,
      y: -0.1,
      z: -4.2,
      sx: 30,
      sy: 1,
      sz: 8,
      color: far,
      finish: "water",
    },
  ];
}

export function horizonParts(look: TideStationLook): StagePart[] {
  const ruin = mixRgb(look.landDark, [48, 52, 64], 0.62);
  const ruinWet = mixRgb(look.deep, ruin, 0.45);
  const parts: StagePart[] = [];
  const count = TIDE_STATION.horizonCount;
  const radius = TIDE_STATION.horizonRadius;
  for (let i = 0; i < count; i++) {
    const turn = (i / count) * Math.PI * 2 + 0.22;
    const x = Math.sin(turn) * radius;
    const z = -Math.cos(turn) * radius;
    const tall = 1.15 + (i % 3) * 0.42;
    const wide = 0.7 + (i % 2) * 0.38;
    const wet = i % 2 === 1;
    parts.push({
      name: `Horizon_${i}`,
      kind: "box",
      x,
      y: tall * 0.22,
      z,
      sx: wide,
      sy: tall,
      sz: 0.55 + (i % 3) * 0.12,
      color: wet ? ruinWet : shadeRgb(ruin, 0.88 + (i % 3) * 0.06),
      rz: i % 2 === 0 ? -8 : 11,
      finish: "land",
    });
  }
  parts.push(
    {
      name: "HorizonHaze",
      kind: "box",
      x: 0,
      y: 2.05,
      z: -radius - 0.6,
      sx: 22,
      sy: 1.7,
      sz: 0.4,
      color: [255, 176, 108],
      finish: "prop",
    },
    {
      name: "HorizonSun",
      kind: "sphere",
      x: 8.2,
      y: 5.4,
      z: -radius + 0.8,
      sx: 1.32,
      sy: 1.32,
      sz: 1.32,
      color: look.accent,
      finish: "prop",
      glow: true,
    },
    {
      name: "DriftA",
      kind: "box",
      x: 4.2,
      y: 0.05,
      z: 3.6,
      sx: 1.35,
      sy: 0.1,
      sz: 0.2,
      color: WOOD_DARK,
      rz: 18,
      finish: "wood",
    },
    {
      name: "DriftB",
      kind: "box",
      x: -3.8,
      y: 0.04,
      z: 4.4,
      sx: 0.95,
      sy: 0.1,
      sz: 0.18,
      color: WOOD,
      rz: -22,
      finish: "wood",
    },
  );
  return parts;
}

export function foundationParts(tier = 1, grid: number = TIDE_STATION.foundationGrid): StagePart[] {
  const n = Math.max(1, Math.floor(grid));
  const tileSize = tileSizeForTier(tier);
  const parts: StagePart[] = [];
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const cell = foundationCellCenter(ix, iz, { grid: n, tileSize });
      const checker = (ix + iz) % 2 === 0;
      parts.push({
        name: foundationTileName(ix, iz),
        kind: "box",
        x: cell.x,
        y: TIDE_STATION.tileThick * 0.5,
        z: cell.z,
        sx: tileSize,
        sy: TIDE_STATION.tileThick,
        sz: tileSize,
        color: checker ? WOOD : WOOD_LIGHT,
        finish: "wood",
      });
    }
  }
  return parts;
}

export function raftPropParts(tier = 1): StagePart[] {
  const tileSize = tileSizeForTier(tier);
  const half = foundationExtent(TIDE_STATION.foundationGrid, tileSize) * 0.5;
  const pontoons: StagePart[] = [
    { name: "PontoonNW", x: -half, z: -half },
    { name: "PontoonNE", x: half, z: -half },
    { name: "PontoonSW", x: -half, z: half },
    { name: "PontoonSE", x: half, z: half },
  ].map((spot) => ({
    name: spot.name,
    kind: "sphere" as const,
    x: spot.x,
    y: -0.12,
    z: spot.z,
    sx: 0.7,
    sy: 0.28,
    sz: 0.7,
    color: WOOD_DARK,
    finish: "wood" as const,
  }));
  const props: StagePart[] = [
    ...pontoons,
    {
      name: "Crate",
      kind: "box",
      x: 1.42,
      y: 0.58,
      z: 1.38,
      sx: 0.78,
      sy: 0.62,
      sz: 0.78,
      color: CRATE,
      finish: "prop",
    },
    {
      name: "CrateLid",
      kind: "box",
      x: 1.42,
      y: 0.92,
      z: 1.38,
      sx: 0.82,
      sy: 0.08,
      sz: 0.82,
      color: GOLD,
      finish: "prop",
      glow: true,
    },
    {
      name: "Stall",
      kind: "box",
      x: -1.38,
      y: 0.48,
      z: -1.28,
      sx: 0.9,
      sy: 0.5,
      sz: 0.7,
      color: [236, 208, 148],
      finish: "wood",
    },
    {
      name: "Awning",
      kind: "box",
      x: -1.38,
      y: 0.92,
      z: -1.28,
      sx: 1.18,
      sy: 0.07,
      sz: 0.92,
      color: MARKET,
      rz: -6,
      finish: "prop",
    },
    {
      name: "PoleL",
      kind: "box",
      x: -1.82,
      y: 0.7,
      z: -0.92,
      sx: 0.07,
      sy: 0.52,
      sz: 0.07,
      color: WOOD_DARK,
      finish: "wood",
    },
    {
      name: "PoleR",
      kind: "box",
      x: -0.94,
      y: 0.7,
      z: -1.62,
      sx: 0.07,
      sy: 0.52,
      sz: 0.07,
      color: WOOD_DARK,
      finish: "wood",
    },
    {
      name: "Banner",
      kind: "box",
      x: -1.38,
      y: 1.12,
      z: -1.28,
      sx: 0.7,
      sy: 0.16,
      sz: 0.04,
      color: GOLD,
      finish: "prop",
    },
    {
      name: "Lantern",
      kind: "sphere",
      x: -0.72,
      y: 0.98,
      z: -1.05,
      sx: 0.18,
      sy: 0.18,
      sz: 0.18,
      color: GOLD,
      finish: "prop",
      glow: true,
    },
  ];
  if (tier >= 2) {
    props.push(
      {
        name: "Shed",
        kind: "box",
        x: -1.15,
        y: 0.88,
        z: 1.35,
        sx: 1.02,
        sy: 0.7,
        sz: 0.76,
        color: [236, 208, 148],
        finish: "wood",
      },
      {
        name: "ShedRoof",
        kind: "box",
        x: -1.15,
        y: 1.26,
        z: 1.35,
        sx: 1.18,
        sy: 0.08,
        sz: 0.9,
        color: MARKET,
        rz: -8,
        finish: "prop",
      },
      {
        name: "LampPost",
        kind: "box",
        x: 0.55,
        y: 0.92,
        z: 1.55,
        sx: 0.07,
        sy: 1.05,
        sz: 0.07,
        color: WOOD_DARK,
        finish: "wood",
      },
      {
        name: "LampGlow",
        kind: "sphere",
        x: 0.55,
        y: 1.48,
        z: 1.55,
        sx: 0.2,
        sy: 0.2,
        sz: 0.2,
        color: GOLD,
        finish: "prop",
        glow: true,
      },
    );
  }
  return props;
}

/** 潮间漂木停在浮台近岸，HarborStage 用来摆和轻晃。 */
export function flotsamAnchor(): { x: number; y: number; z: number } {
  return { x: 3.15, y: 0.08, z: 1.55 };
}

export function orderBoardParts(): StagePart[] {
  return [
    {
      name: "BoardPost",
      kind: "box",
      x: 0,
      y: 0.72,
      z: 0,
      sx: 0.1,
      sy: 1.28,
      sz: 0.1,
      color: WOOD_DARK,
      finish: "wood",
    },
    {
      name: "Board",
      kind: "box",
      x: 0,
      y: 1.22,
      z: 0.04,
      sx: 1.18,
      sy: 0.72,
      sz: 0.08,
      color: MARKET,
      finish: "prop",
    },
    {
      name: "BoardHeader",
      kind: "box",
      x: 0,
      y: 1.62,
      z: 0.05,
      sx: 1.22,
      sy: 0.1,
      sz: 0.09,
      color: GOLD,
      finish: "prop",
      glow: true,
    },
  ];
}

/** 站姿灰盒：头 + 躯干 + 双腿。原创低模，无竞品轮廓。 */
export function fishermanParts(): StagePart[] {
  return [
    {
      name: "FisherLegL",
      kind: "box",
      x: -0.12,
      y: 0.42,
      z: 0,
      sx: 0.16,
      sy: 0.52,
      sz: 0.16,
      color: TROUSER,
      finish: "prop",
    },
    {
      name: "FisherLegR",
      kind: "box",
      x: 0.12,
      y: 0.42,
      z: 0,
      sx: 0.16,
      sy: 0.52,
      sz: 0.16,
      color: TROUSER,
      finish: "prop",
    },
    {
      name: "FisherTorso",
      kind: "box",
      x: 0,
      y: 0.92,
      z: 0.02,
      sx: 0.46,
      sy: 0.58,
      sz: 0.28,
      color: CLOTH,
      finish: "prop",
    },
    {
      name: "FisherHead",
      kind: "sphere",
      x: 0,
      y: 1.36,
      z: 0.02,
      sx: 0.32,
      sy: 0.32,
      sz: 0.32,
      color: SKIN,
      finish: "prop",
    },
  ];
}

export type TideStationHarborOpts = {
  pontoonTier?: number;
  showFlotsam?: boolean;
  foundationGrid?: number;
};

/** 与 HarborStage 实际生成的 mesh 清单对齐，供预算单测。 */
export function tideStationHarborParts(
  look: TideStationLook,
  opts: TideStationHarborOpts = {},
): StagePart[] {
  const tier = opts.pontoonTier ?? 1;
  const grid = opts.foundationGrid ?? TIDE_STATION.foundationGrid;
  return [
    ...oceanParts(look.near, look.deep),
    ...horizonParts(look),
    ...foundationParts(tier, grid),
    ...raftPropParts(tier),
    ...orderBoardParts(),
    ...fishermanParts(),
    ...boatParts(),
    ...(opts.showFlotsam === false ? [] : flotsamParts()),
  ];
}

export function tideStationMeshCount(
  look: TideStationLook,
  opts: TideStationHarborOpts = {},
): number {
  return countParts(tideStationHarborParts(look, opts));
}

export function tideStationWithinBudget(
  look: TideStationLook,
  opts: TideStationHarborOpts = {},
): boolean {
  return tideStationMeshCount(look, opts) <= STAGE_BUDGET.maxHarborMeshes;
}

export const TIDE_STATION_TREE = `
HarborWorld
├─ HarborLight          一盏平行光，无阴影
├─ HarborCamera         斜俯视（见 TIDE_STATION.cam / HARBOR_CAM_REST）
├─ Ocean
│  ├─ Water             主海面 + 顶点波
│  ├─ Mid / Deep / FarBand
│  └─ Foam              浮台水线
├─ Horizon              半淹远景一圈
│  ├─ Horizon_0 … Horizon_7
│  ├─ HorizonHaze / HorizonSun
│  └─ DriftA / DriftB
├─ RaftRoot             可扩地基
│  ├─ Foundation
│  │  └─ Foundation_0_0 … Foundation_N_N
│  ├─ Pontoon* / Crate / Stall…
│  ├─ OrderBoard        BoardPost / Board / BoardHeader
│  └─ Fisherman         头 + 躯干 + 双腿
├─ HarborBoat
└─ Tidewood             可选潮间漂木
`.trim();
