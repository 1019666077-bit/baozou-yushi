export function depthT(y: number, nearY = -80, farY = 120): number {
  if (farY === nearY) return 0.5;
  return Math.min(1, Math.max(0, (y - nearY) / (farY - nearY)));
}

export function depthScale(y: number, airborne = false): number {
  const t = depthT(airborne ? y - 90 : y);
  return Math.round((1.2 - t * 0.52) * 100) / 100;
}
