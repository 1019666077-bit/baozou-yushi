export type JuiceKind = "miss" | "hit" | "weak" | "perfect" | "catch" | "splash";

export interface JuiceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: "bubble" | "star";
  size: number;
}

export function juiceCount(kind: JuiceKind, lowPower: boolean): number {
  if (lowPower) return kind === "miss" ? 2 : 3;
  if (kind === "miss") return 4;
  if (kind === "splash") return 16;
  if (kind === "hit") return 7;
  if (kind === "catch") return 8;
  return 11;
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
      : kind === "weak" || kind === "perfect"
        ? 140
        : kind === "miss"
          ? 55
          : 95;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (kind === "miss" ? 0.6 : 0.15);
    const speed = burst + (i % 3) * 18;
    const star =
      kind === "weak" || kind === "perfect" || kind === "catch";
    const up = kind === "splash" ? 90 : kind === "miss" ? 30 : 8;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + up,
      life: 1,
      maxLife: kind === "perfect" || kind === "splash" ? 0.55 : 0.4,
      kind: star && i % 2 === 0 ? "star" : "bubble",
      size: kind === "splash" ? 9 : kind === "perfect" ? 8 : kind === "weak" ? 7 : 5,
    };
  });
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
      vy: particle.vy + (particle.kind === "bubble" ? 40 : 12) * dt,
      vx: particle.vx * Math.max(0, 1 - 0.8 * dt),
      life,
    });
  }
  return next;
}
