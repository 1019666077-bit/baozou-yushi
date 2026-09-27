/**
 * Ported from tidewater `src/game/FishingRod.js`（蓄力与抛投距离，不含网格/着色器）。
 * https://github.com/dgreenheck/tidewater (MIT, Copyright (c) 2026 DRG Software Solutions LLC)
 *
 * 蓄力约 1.1 秒到满。落点距离 = castM * (0.35 + 0.65 * power)。
 */

export const CHARGE_SECONDS = 1.1;

export function chargePower(power: number, dt: number): number {
  return Math.min(1, power + dt / CHARGE_SECONDS);
}

export function castReach(castM: number, power: number): number {
  return castM * (0.35 + 0.65 * power);
}
