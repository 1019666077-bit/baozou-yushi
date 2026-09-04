import type { ToolKind } from "../data/types";

export function harpoonCharge(holdMs: number): number {
  return Math.min(1.75, 0.55 + holdMs / 900);
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
): number {
  if (kind !== "harpoon") return 1;
  if (airborne || stunned) return 1.28;
  return 1;
}
