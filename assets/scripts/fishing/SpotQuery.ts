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
  pier: { x: 55, y: 3.95, z: 28 },
  boat: { x: 64.5, y: 2.2, z: 36.5 },
};

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

/** 岸线 z≈-42 约 0.4 m。贴着码头桩的水约 2.4 m，再往外加深。 */
export function depthAt(x: number, z: number): number {
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
  const eye = SPOT_EYE[spot];
  // 码头朝侧面的水里抛，落点贴着桩，不会一下抛进开阔的海湾。
  const x = spot === "pier" ? eye.x + 3.1 : eye.x;
  const z = spot === "pier" ? eye.z + 5 + clamped * 6 : eye.z + reach;
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
