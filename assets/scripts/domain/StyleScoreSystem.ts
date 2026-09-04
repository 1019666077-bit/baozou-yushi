import type {
  StyleAction,
  StyleEvent,
  StyleSnapshot,
} from "../data/types";

const BASE_POINTS: Record<StyleAction, number> = {
  weakPoint: 22,
  airborne: 18,
  combo: 12,
  perfectReel: 30,
};

export interface StyleRules {
  comboWindowMs: number;
  maxCombo: number;
  maxPoints: number;
  minMultiplier: number;
  maxMultiplier: number;
}

export const DEFAULT_STYLE_RULES: StyleRules = {
  comboWindowMs: 2_200,
  maxCombo: 8,
  maxPoints: 200,
  minMultiplier: 1,
  maxMultiplier: 3,
};

export class StyleScoreSystem {
  private snapshot: StyleSnapshot = {
    points: 0,
    multiplier: 1,
    combo: 0,
    lastActionAtMs: -Infinity,
    triggered: {
      weakPoint: 0,
      airborne: 0,
      combo: 0,
      perfectReel: 0,
    },
  };

  constructor(private readonly rules: StyleRules = DEFAULT_STYLE_RULES) {}

  reset(): void {
    this.snapshot = {
      points: 0,
      multiplier: 1,
      combo: 0,
      lastActionAtMs: -Infinity,
      triggered: {
        weakPoint: 0,
        airborne: 0,
        combo: 0,
        perfectReel: 0,
      },
    };
  }

  apply(event: StyleEvent): StyleSnapshot {
    const withinCombo =
      event.atMs - this.snapshot.lastActionAtMs <= this.rules.comboWindowMs;
    const combo = withinCombo
      ? Math.min(this.rules.maxCombo, this.snapshot.combo + 1)
      : 1;
    const quality = Math.min(1, Math.max(0.25, event.quality ?? 1));
    const varietyBonus =
      this.snapshot.triggered[event.action] === 0 ? 1.2 : 1;
    const comboBonus = 1 + Math.max(0, combo - 1) * 0.06;
    const earned = Math.round(
      BASE_POINTS[event.action] * quality * varietyBonus * comboBonus,
    );
    const points = Math.min(
      this.rules.maxPoints,
      this.snapshot.points + earned,
    );

    this.snapshot = {
      points,
      combo,
      lastActionAtMs: event.atMs,
      multiplier: this.multiplierFor(points),
      triggered: {
        ...this.snapshot.triggered,
        [event.action]: this.snapshot.triggered[event.action] + 1,
      },
    };
    return this.getSnapshot();
  }

  multiplierFor(points: number): number {
    const normalized = Math.min(1, Math.max(0, points / this.rules.maxPoints));
    const eased = 1 - Math.pow(1 - normalized, 1.35);
    const value =
      this.rules.minMultiplier +
      eased * (this.rules.maxMultiplier - this.rules.minMultiplier);
    return Math.round(value * 100) / 100;
  }

  getSnapshot(): StyleSnapshot {
    return {
      ...this.snapshot,
      triggered: { ...this.snapshot.triggered },
    };
  }
}
