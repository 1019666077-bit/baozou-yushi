/**
 * 落点查询。常数来自 tidewater `src/world/WorldLayout.js` 的码头 / 礁，
 * 距离算法来自 `src/game/Game.js` habitatAtPoint。
 * https://github.com/dgreenheck/tidewater (MIT, Copyright (c) 2026 DRG Software Solutions LLC)
 *
 * 沙滩和码头按抛投落点算水深。船不靠这条坡，三个航点手写采样。
 */
import { habitatAt, type HabitatWeights } from "./Bites";

export type SpotId = "beach" | "pier" | "boat";
export type WaypointId = "bay" | "reef" | "deep";

/**
 * 岛、沙滩、码头、摊位按原版相对位置收到大约 0.28。
 * 码头人站在 T 头上，海在正前方，乔和玛塔在身后两侧，沿栈桥走回岸。
 */
export const SPOT_EYE: { [id in SpotId]: { x: number; y: number; z: number } } = {
  beach: { x: -1.2, y: 1.65, z: -8.0 },
  pier: { x: 8.05, y: 3.88, z: 14.5 },
  boat: { x: 9.4, y: 2.2, z: 14.6 },
};

/** 半径仍是原版 3.2 / 3.0。朝向按缩小后的摊位对着路。 */
export const VENDORS = [
  { id: "joe" as const, name: "乔", x: 6.0, z: 2.6, yaw: 0.7, radius: 3.2 },
  { id: "marta" as const, name: "玛塔", x: 12.5, z: 2.6, yaw: -1.05, radius: 3.0 },
];

/** 停在 T 头右侧的水里，不挡正前方的抛投。 */
export const BOAT_MOOR = { x: 12.2, z: 13.4 };

/** 沿沙滩和码头能走到两个摊位，再远就不往海里放。 */
export const STROLL_M = 42;

/** 湾心的岸线。两侧沙臂伸进海里，摊位站在沙臂上。 */
export const SHORE_Z = -4;

export function vendorAt(x: number, z: number): (typeof VENDORS)[number] | null {
  let best: (typeof VENDORS)[number] | null = null;
  let score = Infinity;
  for (const vendor of VENDORS) {
    const d = Math.hypot(vendor.x - x, vendor.z - z);
    if (d < vendor.radius && d < score) {
      best = vendor;
      score = d;
    }
  }
  return best;
}

/** T 头朝海的正前方。短杆也落在木头前面的水里。 */
const PIER_LOOK_X = 0;
const PIER_LOOK_Z = 16;

export function fishingLook(spot: SpotId, eyeX: number, eyeZ: number): { x: number; y: number; z: number } {
  if (spot === "beach") return { x: eyeX, y: 0.35, z: eyeZ + 12 };
  if (spot === "boat") return { x: eyeX + 8, y: 0.4, z: eyeZ + 3 };
  return { x: eyeX + PIER_LOOK_X, y: 0.64, z: eyeZ + PIER_LOOK_Z };
}

/** 在默认视线左右转一个偏航角。旋转和 sampleCast 的落点一致。 */
export function aimLook(spot: SpotId, eyeX: number, eyeZ: number, yaw: number): { x: number; y: number; z: number } {
  const look = fishingLook(spot, eyeX, eyeZ);
  const dx = look.x - eyeX;
  const dz = look.z - eyeZ;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: eyeX + dx * c - dz * s, y: look.y, z: eyeZ + dx * s + dz * c };
}

export const WAYPOINTS: {
  [id in WaypointId]: { x: number; z: number; depth: number; reefDist: number; pierDist: number };
} = {
  bay: { x: 0, z: 80, depth: 10, reefDist: 50, pierDist: 50 },
  reef: { x: -78, z: 58, depth: 6, reefDist: -4, pierDist: 80 },
  deep: { x: 0, z: 220, depth: 26, reefDist: 90, pierDist: 90 },
};

const REEF = { x: -12, z: 12, radius: 8 };
export const PIER = {
  x: 8.05,
  zStart: -14,
  zEnd: 16,
  width: 1.8,
  headWidth: 4.4,
  headDepth: 3.2,
};

export interface CastSample {
  x: number;
  z: number;
  depth: number;
  reefDist: number;
  pierDist: number;
  reach: number;
  habitat: HabitatWeights;
}

export function reefDistance(x: number, z: number): number {
  return Math.hypot(x - REEF.x, z - REEF.z) - REEF.radius;
}

function rectDist(x: number, z: number, x0: number, x1: number, z0: number, z1: number): number {
  return Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
}

export function pierDistance(x: number, z: number): number {
  const walk = rectDist(
    x, z,
    PIER.x - PIER.width / 2, PIER.x + PIER.width / 2,
    PIER.zStart, PIER.zEnd,
  );
  const head = rectDist(
    x, z,
    PIER.x - PIER.headWidth / 2, PIER.x + PIER.headWidth / 2,
    PIER.zEnd - PIER.headDepth, PIER.zEnd,
  );
  return Math.min(walk, head);
}

/** 码头木面、后滩，以及两侧伸进海里的沙臂。浮标落在这里要收回。 */
export function onPierDeck(x: number, z: number): boolean {
  return pierDistance(x, z) <= 0.02;
}

export function onDryGround(x: number, z: number): boolean {
  if (onPierDeck(x, z)) return true;
  if (z < SHORE_Z) return true;
  if (x > 4.25 && x < 6.9 && z < 5.2) return true;
  if (x > 11.15 && z < 6.6) return true;
  return false;
}

/** 人可以站的地方：木面稍宽一点的边，加上干沙滩。不能踩进湾心的水。 */
export function onFooting(x: number, z: number): boolean {
  if (pierDistance(x, z) < 1.05) return true;
  if (z < SHORE_Z + 0.15) return true;
  if (x > 4.1 && x < 7.05 && z < 5.4) return true;
  if (x > 11.0 && z < 6.8) return true;
  return false;
}

/** 湾心岸线出去变深。沙臂旁边的水仍按离岸距离算，不把沙臂当成深海。 */
export function depthAt(x: number, z: number): number {
  if (onDryGround(x, z)) return 0;
  const offshore = 0.42 + Math.max(0, z - SHORE_Z) * 0.125;
  const nearPier = pierDistance(x, z);
  if (nearPier < 6 && z > SHORE_Z) {
    const t = smooth(6, 1.2, nearPier);
    return Math.max(offshore, 1.7 * t + offshore * (1 - t));
  }
  const reef = reefDistance(x, z);
  if (reef < 8) {
    const t = smooth(8, -4, reef);
    return Math.max(offshore, 5.5 * t + offshore * (1 - t));
  }
  if (z > 28) return offshore + (z - 28) * 0.18;
  return offshore;
}

export function sampleCast(
  spot: SpotId,
  waypoint: WaypointId,
  power: number,
  castM: number,
  yaw = 0,
  origin?: { x: number; z: number },
): CastSample {
  const clamped = Math.min(1, Math.max(0, power));
  const reach = castM * (0.35 + 0.65 * clamped);
  if (spot === "boat") {
    const mark = WAYPOINTS[waypoint];
    return {
      x: mark.x,
      z: mark.z,
      depth: mark.depth,
      reefDist: mark.reefDist,
      pierDist: mark.pierDist,
      reach,
      habitat: habitatAt({ depth: mark.depth, reefDist: mark.reefDist, pierDist: mark.pierDist }),
    };
  }
  const eye = origin ?? SPOT_EYE[spot];
  const span = Math.hypot(PIER_LOOK_X, PIER_LOOK_Z) || 1;
  const fx = spot === "pier" ? PIER_LOOK_X / span : 0;
  const fz = spot === "pier" ? PIER_LOOK_Z / span : 1;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const x = eye.x + (fx * c - fz * s) * reach;
  const z = eye.z + (fx * s + fz * c) * reach;
  const depth = depthAt(x, z);
  const reefDist = reefDistance(x, z);
  const pierDist = pierDistance(x, z);
  return {
    x, z, depth, reefDist, pierDist, reach,
    habitat: habitatAt({ depth, reefDist, pierDist }),
  };
}

export function dominantHabitat(weights: HabitatWeights): string {
  let best = "shallows";
  let score = -1;
  for (const key of Object.keys(weights)) {
    const value = weights[key as keyof HabitatWeights];
    if (value > score) {
      score = value;
      best = key;
    }
  }
  return best;
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
