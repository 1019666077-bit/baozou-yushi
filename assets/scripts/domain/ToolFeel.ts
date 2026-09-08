import type { ToolKind, ToolLevel } from "../data/types";

export function harpoonCharge(holdMs: number, level?: ToolLevel): number {
  const timeScale = level?.modifiers?.chargeTimeScale ?? 1;
  return Math.min(1.75, 0.55 + holdMs / (900 * timeScale));
}

export function cannonHoldFire(
  holding: boolean,
  sinceFireMs: number,
  cooldownMs: number,
): boolean {
  return holding && sinceFireMs >= cooldownMs;
}

export function harpoonDashBonus(
  kind: ToolKind,
  airborne: boolean,
  stunned: boolean,
  level?: ToolLevel,
): number {
  if (kind !== "harpoon") return 1;
  if (airborne || stunned) {
    return 1.28 + (level?.modifiers?.airborneBonus ?? 0);
  }
  return 1;
}

export function toolWeakRadiusScale(level: ToolLevel): number {
  return Math.max(1, level.modifiers?.weakPointRadiusScale ?? 1);
}

export function toolFreshness(
  freshness: number,
  level: ToolLevel,
): number {
  return Math.min(
    1.2,
    Math.max(0.5 + (level.modifiers?.freshnessFloorBonus ?? 0), freshness),
  );
}

export function toolShieldScale(
  blockedScale: number,
  level: ToolLevel,
): number {
  const pierce = Math.max(0, Math.min(0.6, level.modifiers?.shieldPierce ?? 0));
  return blockedScale + (1 - blockedScale) * pierce;
}
