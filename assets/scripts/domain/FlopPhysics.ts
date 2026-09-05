export const DOCK_X = -260;
export const DECK_Y = -118;
export const WATER_X = -150;

export interface FlopBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
}

export function createFlopBody(x: number, y: number): FlopBody {
  return { x, y, vx: 0, vy: 0, angle: 0, spin: 0 };
}

export function yankStep(
  x: number,
  y: number,
  dt: number,
): { x: number; y: number; landed: boolean } {
  const tx = -340;
  const ty = DECK_Y + 52;
  const nx = x + (tx - x) * Math.min(1, dt * 1.15);
  const ny = y + (ty - y) * Math.min(1, dt * 1.05);
  return { x: nx, y: ny, landed: nx <= DOCK_X };
}

export function beginFlop(x: number, y: number): FlopBody {
  return {
    x,
    y: Math.max(y, DECK_Y + 12),
    vx: -90,
    vy: 520,
    angle: 0.8,
    spin: 18,
  };
}

export function stepFlop(body: FlopBody, dt: number, stunned: boolean): FlopBody {
  const gravity = stunned ? -1100 : -1980;
  let vx = body.vx;
  let vy = body.vy + gravity * dt;
  let x = body.x + vx * dt;
  let y = body.y + vy * dt;
  let spin = body.spin * (stunned ? 0.88 : 0.996);
  let angle = body.angle + spin * dt;

  if (x < -620) {
    x = -620;
    vx = Math.abs(vx) * 0.4;
  }
  if (x <= DOCK_X + 90 && y <= DECK_Y) {
    y = DECK_Y;
    if (vy < 0) vy = -vy * (stunned ? 0.32 : 0.78);
    vx *= stunned ? 0.72 : 0.84;
    spin += -vx * 0.018;
    if (Math.abs(vy) < 48) vy = 0;
  }
  if (inWater({ x, y })) {
    vx *= 0.88;
    vy *= 0.82;
    vy += 120 * dt;
  }

  return { x, y, vx, vy, angle, spin };
}

export function leapTowardWater(body: FlopBody): FlopBody {
  if (isAirborne(body) || inWater(body)) return body;
  return {
    ...body,
    vx: body.vx + 200,
    vy: body.vy + 420,
    spin: body.spin + 11,
  };
}

export function knock(
  body: FlopBody,
  fromX: number,
  fromY: number,
  power: number,
): FlopBody {
  const dx = body.x - fromX;
  const dy = body.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  const punch = 320 + power * 22;
  return {
    ...body,
    vx: body.vx + (dx / len) * punch,
    vy: body.vy + (dy / len) * punch + 200,
    spin: body.spin + (dx >= 0 ? -14 : 14),
  };
}

export function isAirborne(body: FlopBody): boolean {
  return body.y > DECK_Y + 22;
}

export function inWater(body: Pick<FlopBody, "x" | "y">): boolean {
  return body.x > WATER_X && body.y < -18;
}

export const CRATE_X = -520;
export const CRATE_Y = -150;

export function crateDrop(x: number, y: number): boolean {
  return Math.hypot(x - CRATE_X, y - CRATE_Y) < 92;
}

export function bouncedOnDeck(prev: FlopBody, next: FlopBody): boolean {
  return (
    prev.vy < -90 &&
    next.y <= DECK_Y + 2 &&
    next.x <= DOCK_X + 90
  );
}

export function canPickUp(
  playerX: number,
  playerY: number,
  fishX: number,
  fishY: number,
): boolean {
  return Math.hypot(playerX - fishX, playerY - fishY) < 140;
}
