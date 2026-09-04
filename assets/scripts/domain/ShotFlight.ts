import type { ToolKind } from "../data/types";

export const MAX_LIVE_SHOTS = 8;
export const SHOT_MAX_RANGE = 900;
export const SHOT_MIN_AIM = 24;

export interface Shot {
  ox: number;
  oy: number;
  x: number;
  y: number;
  nx: number;
  ny: number;
  speed: number;
  traveled: number;
  maxRange: number;
  radius: number;
  kind: ToolKind;
  charge: number;
}

export function shotSpeed(kind: ToolKind, lowPower: boolean): number {
  const base = kind === "harpoon" ? 980 : kind === "cannon" ? 1680 : 1320;
  return lowPower ? Math.round(base * 0.85) : base;
}

export function shotRadius(kind: ToolKind, charge: number): number {
  if (kind === "harpoon") return 10 + charge * 4;
  if (kind === "cannon") return 9;
  return 7;
}

export function spawnShot(
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  kind: ToolKind,
  charge: number,
  lowPower = false,
): Shot | undefined {
  const length = Math.hypot(dirX, dirY);
  if (length < SHOT_MIN_AIM) return undefined;
  const nx = dirX / length;
  const ny = dirY / length;
  return {
    ox: originX,
    oy: originY,
    x: originX,
    y: originY,
    nx,
    ny,
    speed: shotSpeed(kind, lowPower),
    traveled: 0,
    maxRange: SHOT_MAX_RANGE,
    radius: shotRadius(kind, charge),
    kind,
    charge,
  };
}

export function tickShot(shot: Shot, dt: number): Shot {
  const step = shot.speed * Math.max(0, dt);
  return {
    ...shot,
    x: shot.x + shot.nx * step,
    y: shot.y + shot.ny * step,
    traveled: shot.traveled + step,
  };
}

export function shotExpired(shot: Shot): boolean {
  return shot.traveled >= shot.maxRange;
}

export function shotHitsTarget(
  shot: Shot,
  targetX: number,
  targetY: number,
  bodyRadius: number,
): boolean {
  return Math.hypot(shot.x - targetX, shot.y - targetY) <= bodyRadius + shot.radius;
}

export function shotPassedTarget(
  shot: Shot,
  targetX: number,
  targetY: number,
  bodyRadius: number,
): boolean {
  const along = (targetX - shot.ox) * shot.nx + (targetY - shot.oy) * shot.ny;
  if (along <= 0) return shot.traveled > SHOT_MIN_AIM * 2;
  return shot.traveled > along + bodyRadius + shot.radius + 36;
}

export function keepLiveShots(shots: Shot[], next: Shot): Shot[] {
  const live = shots.length >= MAX_LIVE_SHOTS ? shots.slice(1) : shots.slice();
  live.push(next);
  return live;
}
