export const DOCK_X = -260;
export const DECK_Y = -118;
export const WATER_X = -150;
export const CRATE_X = -520;
export const CRATE_Y = -150;

/**
 * 甩砸手感档位。数字都要能说清「为什么更爽、还不挡下一步」。
 * 代理预览抽出同一份，避免 Runtime / 代理各调各的。
 */
export const YANK_FEEL = {
  /** 目标点在码头内侧，避免鱼停在水线像没拽上来。 */
  targetX: -340,
  targetY: DECK_Y + 52,
  /** 1.85：后半段像线突然绷直。dt=0.05 从海里仍不落地。 */
  pullRate: 1.85,
  /** 中段抬高，避免直线传送。再抬一点，甩上来能读出弧。 */
  arcPx: 72,
  liftRate: 1.55,
  /** 用当前位置估拽程，420 覆盖教学湾鳍的海里起点。 */
  span: 420,
};

export const FLOP_FEEL = {
  /** 第一下要看见抛物线，不是贴地滑。 */
  launchVx: -128,
  launchVy: 980,
  launchAngle: 1.18,
  launchSpin: 32,
  /** 未砸晕：砸甲板要弹得开，才读得出「砸」。 */
  liveRestitution: 0.94,
  /** 砸晕：第二下迅速贴地，好捡、不挡点击。 */
  stunRestitution: 0.28,
  gravityLive: -2280,
  gravityStun: -1180,
  liveFriction: 0.78,
  stunFriction: 0.68,
};

export const KNOCK_FEEL = {
  /** 命中爆点：先弹起来再旋转，空中砸才看得见。 */
  base: 420,
  perPower: 28,
  popVy: 300,
  spin: 16,
};

export const CARRY_FEEL = {
  /** 走路颠簸小，不挡点「丢掉入箱」。 */
  freqX: 9,
  freqY: 11,
  ampX: 3,
  ampY: 9,
};

/**
 * 翻扑落地节奏层：第一下冻结要够长，静帧也能看见砸拍+扬尘。
 * 不改经济，只改「砸甲板」能不能读出物理拍子。
 */
export const FLOP_RHYTHM = {
  freezeSeconds: 0.22,
  secondFreeze: 0.1,
  dustCount: 18,
  settleVy: 80,
};

export function bounceFreezeSeconds(
  bounceIndex: number,
  lowPower = false,
): number {
  if (lowPower) return 0;
  if (bounceIndex === 0) return FLOP_RHYTHM.freezeSeconds;
  if (bounceIndex === 1) return FLOP_RHYTHM.secondFreeze;
  return 0;
}

/** 至少弹过一次且速度收住，捡起窗口才更「落地了」。教学不靠这个挡点击。 */
export function flopPickupReady(bounceCount: number, vy: number): boolean {
  return bounceCount >= 1 && Math.abs(vy) < FLOP_RHYTHM.settleVy;
}

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

export function yankArcLift(x: number): number {
  const t = Math.min(1, Math.max(0, (x - YANK_FEEL.targetX) / YANK_FEEL.span));
  return Math.sin(t * Math.PI) * YANK_FEEL.arcPx;
}

export function yankStep(
  x: number,
  y: number,
  dt: number,
): { x: number; y: number; landed: boolean } {
  const tx = YANK_FEEL.targetX;
  const ty = YANK_FEEL.targetY + yankArcLift(x);
  const nx = x + (tx - x) * Math.min(1, dt * YANK_FEEL.pullRate);
  const ny = y + (ty - y) * Math.min(1, dt * YANK_FEEL.liftRate);
  return { x: nx, y: ny, landed: nx <= DOCK_X };
}

export function beginFlop(x: number, y: number): FlopBody {
  return {
    x,
    y: Math.max(y, DECK_Y + 12),
    vx: FLOP_FEEL.launchVx,
    vy: FLOP_FEEL.launchVy,
    angle: FLOP_FEEL.launchAngle,
    spin: FLOP_FEEL.launchSpin,
  };
}

export function stepFlop(body: FlopBody, dt: number, stunned: boolean): FlopBody {
  const gravity = stunned ? FLOP_FEEL.gravityStun : FLOP_FEEL.gravityLive;
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
    if (vy < 0) {
      vy = -vy * (stunned ? FLOP_FEEL.stunRestitution : FLOP_FEEL.liveRestitution);
    }
    vx *= stunned ? FLOP_FEEL.stunFriction : FLOP_FEEL.liveFriction;
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
  const punch = KNOCK_FEEL.base + power * KNOCK_FEEL.perPower;
  return {
    ...body,
    vx: body.vx + (dx / len) * punch,
    vy: body.vy + (dy / len) * punch + KNOCK_FEEL.popVy,
    spin: body.spin + (dx >= 0 ? -KNOCK_FEEL.spin : KNOCK_FEEL.spin),
  };
}

export function isAirborne(body: FlopBody): boolean {
  return body.y > DECK_Y + 22;
}

export function inWater(body: Pick<FlopBody, "x" | "y">): boolean {
  return body.x > WATER_X && body.y < -18;
}

export function crateDrop(x: number, y: number): boolean {
  return Math.hypot(x - CRATE_X, y - CRATE_Y) < 92;
}

/** 第一下抛物线相对甲板的最高点，给单测和代理对照。 */
export function flopApexAboveDeck(): number {
  let body = beginFlop(-320, DECK_Y);
  let peak = body.y;
  for (let i = 0; i < 48; i++) {
    body = stepFlop(body, 0.016, false);
    if (body.y > peak) peak = body.y;
  }
  return peak - DECK_Y;
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
  return Math.hypot(playerX - fishX, playerY - fishY) < 168;
}

export function carryBobOffset(elapsed: number): { x: number; y: number } {
  return {
    x: Math.sin(elapsed * CARRY_FEEL.freqX) * CARRY_FEEL.ampX,
    y: Math.abs(Math.sin(elapsed * CARRY_FEEL.freqY)) * CARRY_FEEL.ampY,
  };
}

/** 代理预览走箱：0.36s 够读出步伐，不拖到挡「丢掉入箱」。 */
export function carryWalkSeconds(): number {
  return 0.36;
}

export function carryWalkAt(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return 1 - (1 - u) * (1 - u);
}
