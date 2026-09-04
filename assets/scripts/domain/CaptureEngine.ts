import type { FishConfig, ToolLevel } from "../data/types";

export interface HitResult {
  damage: number;
  remainingToughness: number;
  weakPoint: boolean;
  readyToReel: boolean;
}

export class CaptureEngine {
  private remaining: number;

  constructor(private readonly fish: FishConfig) {
    this.remaining = fish.toughness;
  }

  hit(
    tool: ToolLevel,
    accuracy: number,
    weakPoint: boolean,
    charge = 1,
    damageScale = 1,
  ): HitResult {
    if (this.remaining <= 0) {
      return {
        damage: 0,
        remainingToughness: 0,
        weakPoint,
        readyToReel: true,
      };
    }
    const safeAccuracy = clamp(accuracy, 0.2, 1);
    const safeCharge = clamp(charge, 0.5, 1.75);
    const weakMultiplier = weakPoint ? this.fish.weakPointMultiplier : 1;
    const damage = Math.max(
      1,
      Math.round(
        tool.power *
          safeAccuracy *
          safeCharge *
          weakMultiplier *
          clamp(damageScale, 0.2, 1.5),
      ),
    );
    this.remaining = Math.max(0, this.remaining - damage);
    return {
      damage,
      remainingToughness: this.remaining,
      weakPoint,
      readyToReel: this.remaining === 0,
    };
  }

  reel(timingError: number, lineStrength: number): {
    captured: boolean;
    perfect: boolean;
  } {
    if (this.remaining > 0) return { captured: false, perfect: false };
    const error = Math.abs(timingError);
    const perfectWindow = 0.08 + clamp(lineStrength, 0, 100) / 2_000;
    const captureWindow = 0.28 + clamp(lineStrength, 0, 100) / 1_000;
    return {
      captured: error <= captureWindow,
      perfect: error <= perfectWindow,
    };
  }

  get remainingToughness(): number {
    return this.remaining;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
