import type { BossPhase, FishConfig, ToolKind } from "../data/types";

export function shieldGapOpen(elapsed: number): boolean {
  return Math.sin(elapsed * 1.35) > 0.32;
}

export function shieldDamageScale(options: {
  gapOpen: boolean;
  weakPoint: boolean;
  fromFront: boolean;
  toolKind: ToolKind;
}): number {
  if (options.weakPoint || options.gapOpen) {
    return options.toolKind === "cannon" ? 1.25 : 1;
  }
  if (options.fromFront) return options.toolKind === "cannon" ? 0.55 : 0.32;
  return 0.7;
}

export function shotFromFront(
  originX: number,
  fishX: number,
  facing: number,
): boolean {
  const incoming = originX - fishX;
  return incoming * facing > 0;
}

export function poseForBehavior(
  config: Pick<FishConfig, "behavior" | "speed" | "name" | "tier">,
  elapsed: number,
  hooked: boolean,
  toughnessRatio = 1,
): {
  x: number;
  y: number;
  facing: number;
  stunned: boolean;
  airborne: boolean;
} {
  const slow = hooked ? 0.42 : 1;
  let rate = Math.max(0.2, config.speed * 0.01 * slow);
  if (config.behavior === "boss") {
    rate *= toughnessRatio <= 0.33 ? 1.35 : toughnessRatio <= 0.66 ? 1.15 : 1;
  }
  const leap = config.behavior === "dash" || config.name.includes("跃");
  const cycle = elapsed % (config.tier === "elite" ? 2.8 : 2.3);
  const dashing = leap && cycle < 0.42;
  const stunWindow = config.tier === "elite" ? 0.85 : 0.4;
  const stunned = leap && !dashing && cycle < 0.42 + stunWindow;
  const airborne = leap && (dashing || config.name.includes("跃"));
  const travel = dashing ? 220 : config.behavior === "boss" ? 90 : 150;
  const wave = stunned ? elapsed - (cycle - 0.42) : elapsed;
  const x = Math.sin(wave * rate * (dashing ? 2.1 : 1)) * travel;
  const y = airborne
    ? Math.abs(Math.sin(elapsed * (dashing ? 7 : 3.2))) * (dashing ? 96 : 78)
    : Math.cos(elapsed * rate * 0.7) * (config.behavior === "boss" ? 24 : 36);
  const facing = Math.cos(wave * rate * (dashing ? 2.1 : 1)) >= 0 ? 1 : -1;
  return { x, y, facing, stunned, airborne };
}

export function bossPhaseIndex(
  toughnessRatio: number,
  phases: BossPhase[],
): number {
  const ordered = [...phases].sort((a, b) => b.threshold - a.threshold);
  let index = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (toughnessRatio <= ordered[i].threshold) index = i;
  }
  return index;
}

export function decoyOffsets(count = 2): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => ({
    x: i === 0 ? -70 : 80,
    y: i === 0 ? 36 : -28,
  }));
}
