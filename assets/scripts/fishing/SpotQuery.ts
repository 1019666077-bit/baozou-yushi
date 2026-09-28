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

export const SPOT_EYE: { [id in SpotId]: { x: number; y: number; z: number } } = {
  beach: { x: 20, y: 1.65, z: -40 },
  pier: { x: 56.45, y: 3.95, z: 20 },
  boat: { x: 64.5, y: 2.2, z: 36.5 },
};

/** 乔的鱼摊、玛塔的渔具店。坐标和半径来自 tidewater FishStand / Chandlery。 */
export const VENDORS = [
  { id: "joe" as const, name: "乔", x: 49.9, z: -74.6, yaw: 1.45, radius: 3.2 },
  { id: "marta" as const, name: "玛塔", x: 85.5, z: -60.5, yaw: -1.9, radius: 3.0 },
];

export const BOAT_MOOR = { x: 64.5, z: 36.5 };

/** 码头和沙滩上能挪的最远距离。再远就是整座岛，这一批不走。 */
export const STROLL_M = 6.5;

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

/** 码头镜头朝侧面的水，不顺着栈桥中线。落点和这个水平方向一致。 */
const PIER_LOOK_X = 8.84;
const PIER_LOOK_Z = 7.41;

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

const REEF = { x: -78, z: 58, radius: 58 };
const PIER = {
  x: 55,
  zStart: -64,
  zEnd: 40,
  width: 2.6,
  headWidth: 14,
  headDepth: 7,
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

/** 码头木面和岸线以北的干沙滩没有水。浮标落在这里要收回。 */
export function onPierDeck(x: number, z: number): boolean {
  return pierDistance(x, z) <= 0.02;
}

export function onDryGround(x: number, z: number): boolean {
  if (onPierDeck(x, z)) return true;
  return z < -42.4;
}

/** 岸线 z≈-42 约 0.4 m。贴着码头桩的水约 2.4 m，再往外加深。干沙滩是 0。 */
export function depthAt(x: number, z: number): number {
  if (onDryGround(x, z)) return 0;
  const offshore = 0.4 + Math.max(0, z + 42) * (3.6 / 82);
  const nearPier = pierDistance(x, z);
  if (nearPier < 8 && z > 0) {
    const t = smooth(8, 1.5, nearPier);
    return 2.4 * t + offshore * (1 - t);
  }
  const reef = reefDistance(x, z);
  if (reef < 12) {
    const t = smooth(12, -6, reef);
    return Math.max(offshore, 7 * t + offshore * (1 - t));
  }
  if (z > 80) return offshore + (z - 80) * 0.12;
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
