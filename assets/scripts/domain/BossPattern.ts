import type { BossPhase } from "../data/types";

export type BossMove = "wave" | "vortex" | "rush";

export function bossMoveForPhase(phaseIndex: number): BossMove {
  if (phaseIndex >= 2) return "rush";
  if (phaseIndex === 1) return "vortex";
  return "wave";
}

export function patternBeat(
  elapsedSeconds: number,
  interval: number,
): { t: number; telegraph: boolean; active: boolean } {
  const cycle = Math.max(1.6, interval);
  const t = elapsedSeconds % cycle;
  const telegraphLen = Math.min(0.9, cycle * 0.24);
  const activeLen = Math.min(0.65, cycle * 0.2);
  return {
    t,
    telegraph: t < telegraphLen,
    active: t >= telegraphLen && t < telegraphLen + activeLen,
  };
}

export function waveHits(boatY: number, waveY: number, halfHeight = 40): boolean {
  return Math.abs(boatY - waveY) <= halfHeight;
}

export function vortexHits(
  boatX: number,
  boatY: number,
  centers: Array<{ x: number; y: number }>,
  radius = 72,
): boolean {
  return centers.some(
    (center) => Math.hypot(boatX - center.x, boatY - center.y) <= radius,
  );
}

export function rushWindows(
  elapsedSeconds: number,
  interval: number,
): { rushing: boolean; output: boolean } {
  const cycle = Math.max(6.5, interval);
  const t = elapsedSeconds % cycle;
  return { rushing: t < 1.15, output: t >= 1.15 && t < 6.15 };
}

export function phaseInterval(phases: BossPhase[], phaseIndex: number): number {
  const ordered = [...phases].sort((a, b) => b.threshold - a.threshold);
  return ordered[phaseIndex]?.patternIntervalSeconds ?? 4.5;
}
