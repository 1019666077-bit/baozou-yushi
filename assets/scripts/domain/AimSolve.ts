export function projectShot(
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  targetX: number,
  targetY: number,
  maxRange: number,
): { distance: number; along: number } {
  const length = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / length;
  const ny = dirY / length;
  const dx = targetX - originX;
  const dy = targetY - originY;
  const along = Math.min(maxRange, Math.max(0, dx * nx + dy * ny));
  const closestX = originX + nx * along;
  const closestY = originY + ny * along;
  return {
    along,
    distance: Math.hypot(targetX - closestX, targetY - closestY),
  };
}

export function classifyHit(
  bodyDistance: number,
  weakDistance: number,
  bodyRadius: number,
  weakRadius: number,
  weakOpen: boolean,
): { hit: boolean; weakPoint: boolean; accuracy: number } {
  const hit = bodyDistance <= bodyRadius;
  const weakPoint = hit && weakOpen && weakDistance <= weakRadius;
  const accuracy = hit
    ? Math.max(0.35, 1 - bodyDistance / Math.max(1, bodyRadius))
    : 0;
  return { hit, weakPoint, accuracy };
}

export function reelTimingError(marker: number, center = 0.5): number {
  return Math.abs(marker - center);
}
