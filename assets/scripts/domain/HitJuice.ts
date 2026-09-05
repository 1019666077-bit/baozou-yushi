export type JuiceKind =
  | "miss"
  | "hit"
  | "weak"
  | "perfect"
  | "catch"
  | "splash"
  | "cast"
  | "gold"
  | "sell"
  | "smash"
  | "yank"
  | "dust";

export interface JuiceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: "bubble" | "star" | "coin" | "dust";
  size: number;
}

export function juiceCount(kind: JuiceKind, lowPower: boolean): number {
  if (kind === "cast" || kind === "yank") return lowPower ? 2 : 4;
  if (kind === "gold" || kind === "sell") return lowPower ? 6 : 10;
  if (kind === "dust") return lowPower ? 10 : 24;
  if (lowPower) return kind === "miss" ? 2 : 3;
  if (kind === "miss") return 4;
  if (kind === "splash") return 10;
  if (kind === "smash") return 22;
  if (kind === "hit") return 9;
  if (kind === "catch") return 8;
  return 9;
}

export function spawnJuice(
  kind: JuiceKind,
  x: number,
  y: number,
  lowPower = false,
): JuiceParticle[] {
  const count = juiceCount(kind, lowPower);
  const burst =
    kind === "splash"
      ? 170
      : kind === "smash"
        ? 190
        : kind === "weak" || kind === "perfect"
          ? 150
          : kind === "miss"
            ? 55
            : kind === "cast" || kind === "yank"
              ? 70
              : 95;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (kind === "miss" ? 0.6 : 0.15);
    const speed = burst + (i % 3) * 18;
    const star =
      kind === "weak" ||
      kind === "perfect" ||
      kind === "catch" ||
      kind === "gold" ||
      kind === "sell" ||
      kind === "smash";
    const coin = kind === "gold" || kind === "sell";
    const dust = kind === "dust" || (kind === "smash" && i % 3 === 0);
    const up =
      kind === "splash" || kind === "smash"
        ? 90
        : kind === "dust"
          ? 72
          : kind === "miss"
            ? 30
            : kind === "cast" || kind === "yank"
              ? 18
              : coin
                ? 140
                : 8;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed * (dust ? 0.55 : 1),
      vy: Math.sin(angle) * speed * (dust ? 0.35 : 1) + up,
      life: 1,
      maxLife:
        kind === "perfect" || coin
          ? 0.4
          : kind === "smash"
            ? 0.26
            : kind === "dust"
              ? 0.58
              : kind === "splash"
                ? 0.28
                : 0.32,
      kind: coin ? "coin" : dust ? "dust" : star && i % 2 === 0 ? "star" : "bubble",
      size:
        kind === "splash" || kind === "smash"
          ? 9
          : kind === "dust"
            ? 16
            : kind === "perfect"
              ? 8
              : kind === "weak"
                ? 7
                : kind === "cast" || kind === "yank"
                  ? 4
                  : coin
                    ? 6
                    : 5,
    };
  });
}

export interface JuiceFlash {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  kind: JuiceKind;
}

export function juiceShakePx(kind: JuiceKind, lowPower: boolean): number {
  if (lowPower) return 0;
  if (kind === "smash") return 12;
  if (kind === "weak" || kind === "perfect") return 5;
  if (kind === "hit" || kind === "catch") return 3;
  return 0;
}

export function juiceShakeSeconds(lowPower: boolean): number {
  return lowPower ? 0 : 0.12;
}

export function juiceWantsPunch(kind: JuiceKind, lowPower: boolean): boolean {
  if (lowPower) return false;
  return (
    kind === "hit" ||
    kind === "weak" ||
    kind === "catch" ||
    kind === "perfect" ||
    kind === "sell" ||
    kind === "smash"
  );
}

export function juicePunchPeak(kind: JuiceKind, lowPower: boolean): number {
  if (!juiceWantsPunch(kind, lowPower)) return 1;
  if (kind === "smash") return 1.36;
  if (kind === "weak" || kind === "perfect") return 1.28;
  if (kind === "catch") return 1.18;
  return 1.14;
}

export function juicePunchSeconds(kind: JuiceKind, lowPower: boolean): number {
  if (!juiceWantsPunch(kind, lowPower)) return 0;
  return kind === "weak" || kind === "perfect" || kind === "catch" || kind === "smash"
    ? 0.16
    : 0.11;
}

export function juicePunchScaleAt(
  kind: JuiceKind,
  elapsed: number,
  lowPower: boolean,
): number {
  const duration = juicePunchSeconds(kind, lowPower);
  const peak = juicePunchPeak(kind, lowPower);
  if (duration <= 0 || peak <= 1) return 1;
  const t = Math.min(1, Math.max(0, elapsed / duration));
  const env = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
  return 1 + (peak - 1) * Math.max(0, env);
}

export function spawnJuiceFlash(
  kind: JuiceKind,
  x: number,
  y: number,
  lowPower: boolean,
): JuiceFlash | undefined {
  if (kind === "miss" || kind === "splash" || kind === "yank" || kind === "dust")
    return undefined;
  if (
    lowPower &&
    kind !== "weak" &&
    kind !== "perfect" &&
    kind !== "catch" &&
    kind !== "sell" &&
    kind !== "smash"
  ) {
    return undefined;
  }
  const maxLife =
    kind === "catch" || kind === "perfect" || kind === "sell" || kind === "smash"
      ? 0.16
      : kind === "weak"
        ? 0.14
        : 0.1;
  return {
    x,
    y,
    life: 1,
    maxLife: lowPower ? Math.min(0.12, maxLife) : maxLife,
    kind,
  };
}

export function tickJuiceFlash(
  flash: JuiceFlash | undefined,
  dt: number,
): JuiceFlash | undefined {
  if (!flash) return undefined;
  const life = flash.life - dt / flash.maxLife;
  if (life <= 0) return undefined;
  return { ...flash, life };
}

export function juiceFlashRadius(flash: JuiceFlash): number {
  const grow =
    flash.kind === "catch" || flash.kind === "perfect" || flash.kind === "sell"
      ? 42
      : flash.kind === "weak" || flash.kind === "smash"
        ? 28
        : 30;
  return 18 + grow * (1 - flash.life);
}

export function juiceFlashLineWidth(flash: JuiceFlash): number {
  if (flash.kind === "weak" || flash.kind === "perfect" || flash.kind === "smash") return 9;
  if (flash.kind === "catch" || flash.kind === "sell") return 8;
  return 6;
}

export function tickJuice(
  particles: JuiceParticle[],
  dt: number,
): JuiceParticle[] {
  const next: JuiceParticle[] = [];
  for (const particle of particles) {
    const life = particle.life - dt / particle.maxLife;
    if (life <= 0) continue;
    next.push({
      ...particle,
      x: particle.x + particle.vx * dt,
      y: particle.y + particle.vy * dt,
      vy:
        particle.vy +
        (particle.kind === "coin"
          ? -220
          : particle.kind === "dust"
            ? -160
            : particle.kind === "bubble"
              ? 40
              : 12) *
          dt,
      vx: particle.vx * Math.max(0, 1 - 0.8 * dt),
      life,
    });
  }
  return next;
}

/** 欢乐钓鱼大师式甩钩：线闪很短，低配只留细线。 */
export function castFlashSeconds(lowPower: boolean): number {
  return lowPower ? 0.12 : 0.26;
}

export function castLineWidth(
  elapsed: number,
  duration: number,
  lowPower: boolean,
): number {
  if (duration <= 0) return 6;
  const t = 1 - Math.min(1, Math.max(0, elapsed / duration));
  return lowPower ? 6 + 3 * t : 6 + 10 * t;
}

/** 砸甲板落地扬尘：横向铺开、颗粒大，静帧也能读出拍子。 */
export function spawnLandingDust(
  x: number,
  y: number,
  lowPower = false,
): JuiceParticle[] {
  return spawnJuice("dust", x, y, lowPower).map((p, i) => ({
    ...p,
    vx: (i % 2 === 0 ? -1 : 1) * (86 + (i % 5) * 34),
    vy: 62 + (i % 4) * 22,
    size: lowPower ? 12 : 22 + (i % 3) * 5,
    maxLife: lowPower ? 0.36 : 0.72,
    kind: "dust" as const,
  }));
}

export function spawnGoldRain(
  x: number,
  y: number,
  lowPower = false,
): JuiceParticle[] {
  return spawnJuice("gold", x, y, lowPower);
}

export function crateBounceScaleAt(elapsed: number, lowPower: boolean): number {
  return juicePunchScaleAt("catch", elapsed, lowPower);
}

/** 砸甲板短挤压：横向撑开、纵向压扁，低配关掉。 */
export function smashSquashSeconds(lowPower = false): number {
  return lowPower ? 0 : 0.44;
}

export function smashSquashAt(
  elapsed: number,
  lowPower = false,
  duration = smashSquashSeconds(lowPower),
): { sx: number; sy: number } {
  if (lowPower || duration <= 0 || elapsed < 0 || elapsed >= duration) {
    return { sx: 1, sy: 1 };
  }
  const t = 1 - elapsed / duration;
  return { sx: 1 + 0.72 * t, sy: 1 - 0.74 * t };
}

/** 弱点准星半径：读得出窗口，不挡点。 */
export function weakReticleRadius(nowMs: number): number {
  return 17 + 7 * (0.5 + 0.5 * Math.sin(nowMs / 130));
}

export function weakReticleTickPx(): number {
  return 10;
}

/** 空中砸 / 完美窗口高光：Runtime 画圈，低配只留细环。 */
export function smashHighlightSpec(
  grade: "none" | "open" | "perfect",
  nowMs: number,
  lowPower = false,
): {
  visible: boolean;
  radius: number;
  width: number;
  rgb: [number, number, number];
  alpha: number;
  caption: string;
} {
  if (grade === "none") {
    return {
      visible: false,
      radius: 0,
      width: 0,
      rgb: [255, 236, 120],
      alpha: 0,
      caption: "",
    };
  }
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / 110);
  const perfect = grade === "perfect";
  return {
    visible: true,
    radius: (perfect ? 46 : 38) + (lowPower ? 0 : 6 * pulse),
    width: lowPower ? 3 : perfect ? 8 : 5,
    rgb: perfect ? [255, 220, 72] : [255, 244, 170],
    alpha: lowPower ? 140 : perfect ? 230 : 170,
    caption: perfect ? "完美窗口" : "可砸",
  };
}

export function popupLiftPx(elapsed: number, duration = 0.45): number {
  const t = duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / duration));
  return 36 * (1 - (1 - t) * (1 - t));
}

export function castTipNudgePx(
  elapsed: number,
  duration: number,
  lowPower: boolean,
): number {
  if (duration <= 0) return 0;
  const t = 1 - Math.min(1, Math.max(0, elapsed / duration));
  return (lowPower ? 4 : 10) * t;
}

export function castRodScaleAt(
  elapsed: number,
  duration: number,
  lowPower: boolean,
): number {
  if (lowPower || duration <= 0) return 1;
  const t = Math.min(1, Math.max(0, elapsed / duration));
  const env = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
  return 1 + 0.08 * Math.max(0, env);
}
