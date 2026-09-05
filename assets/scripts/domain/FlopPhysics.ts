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
  /** 3.2：线更快绷上码头；dt=0.05 从海里仍不落地。 */
  pullRate: 3.2,
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
 * 甲板刚体：落地有质量，摩擦按 dt 吃水平速度，短滑移后才贴住。
 * 不再每帧乘 0.78（60fps 会瞬贴）。
 */
export const DECK_BODY = {
  massNormal: 1,
  massElite: 1.45,
  massBoss: 2.2,
  /** 未砸晕：约 0.3s 滑完 launchVx。 */
  muLive: 300,
  /** 砸晕：更快刹住，好捡。 */
  muStun: 520,
  slideStopVx: 28,
  settleVy: 48,
  /** 第一下落地至少要读出这一段滑移。 */
  minSlidePx: 20,
};

export type EscapePhase = "idle" | "slide" | "leap" | "gone";

/** 未及时处理：先往海里滑，再跳水。教学关由 Runtime 锁住。 */
export const ESCAPE_FEEL = {
  slideAfter: 1.7,
  leapAfter: 2.9,
  stunnedSlideAfter: 3.8,
  stunnedLeapAfter: 5.4,
  waterGone: 0.7,
  slideVx: 168,
  leapVx: 236,
  leapVy: 500,
};

export type SmashGrade = "none" | "open" | "perfect";

/** 空中砸窗口：相对翻扑顶点的高度比，太低像砸甲板。 */
export const SMASH_WINDOW = {
  openLo: 0.2,
  openHi: 0.94,
  perfectLo: 0.44,
  perfectHi: 0.76,
};

export type KnockKind = "body" | "weak" | "smash";
export type CarryRelease = "stash" | "drop_deck" | "drop_water";

/**
 * 翻扑落地节奏层：第一下冻结要够长，静帧也能看见砸拍+扬尘。
 * 不改经济，只改「砸甲板」能不能读出物理拍子。
 */
export const FLOP_RHYTHM = {
  freezeSeconds: 0.36,
  secondFreeze: 0.18,
  dustCount: 24,
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
  mass?: number;
}

export function flopMassForTier(tier?: string): number {
  if (tier === "boss") return DECK_BODY.massBoss;
  if (tier === "elite") return DECK_BODY.massElite;
  return DECK_BODY.massNormal;
}

export function createFlopBody(x: number, y: number, mass = 1): FlopBody {
  return { x, y, vx: 0, vy: 0, angle: 0, spin: 0, mass };
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

export function beginFlop(x: number, y: number, mass = 1): FlopBody {
  return {
    x,
    y: Math.max(y, DECK_Y + 12),
    vx: FLOP_FEEL.launchVx,
    vy: FLOP_FEEL.launchVy,
    angle: FLOP_FEEL.launchAngle,
    spin: FLOP_FEEL.launchSpin,
    mass,
  };
}

function dampToward(value: number, target: number, maxDelta: number): number {
  if (value > target) return Math.max(target, value - maxDelta);
  return Math.min(target, value + maxDelta);
}

function resolveMass(mass?: number): number {
  return mass && mass > 0 ? mass : 1;
}

export function stepFlop(body: FlopBody, dt: number, stunned: boolean): FlopBody {
  const mass = resolveMass(body.mass);
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
    const plant = 1 + Math.max(0, mass - 1) * 0.4;
    const mu = (stunned ? DECK_BODY.muStun : DECK_BODY.muLive) * plant;
    const hopping = Math.abs(vy) >= DECK_BODY.settleVy;
    vx = dampToward(vx, 0, mu * dt * (hopping ? 0.16 : 1));
    spin += -vx * 0.018;
    if (!hopping) vy = 0;
    if (Math.abs(vx) < DECK_BODY.slideStopVx) vx = 0;
  }
  if (inWater({ x, y })) {
    vx = dampToward(vx, 0, 220 * dt);
    vy = dampToward(vy, 0, 160 * dt);
    vy += 120 * dt;
  }

  return { x, y, vx, vy, angle, spin, mass };
}

export function leapTowardWater(body: FlopBody): FlopBody {
  if (isAirborne(body) || inWater(body)) return body;
  return {
    ...body,
    vx: body.vx + ESCAPE_FEEL.leapVx,
    vy: body.vy + ESCAPE_FEEL.leapVy,
    spin: body.spin + 11,
  };
}

export function knockKindOf(weakPoint: boolean, airborne: boolean): KnockKind {
  if (airborne) return "smash";
  if (weakPoint) return "weak";
  return "body";
}

export function knockScale(kind: KnockKind): number {
  if (kind === "smash") return 1.35;
  if (kind === "weak") return 1.18;
  return 0.72;
}

export function knockVector(
  body: Pick<FlopBody, "x" | "y" | "mass">,
  fromX: number,
  fromY: number,
  power: number,
  kind: KnockKind = "body",
): { vx: number; vy: number } {
  const dx = body.x - fromX;
  const dy = body.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  const mass = resolveMass(body.mass);
  const punch =
    ((KNOCK_FEEL.base + power * KNOCK_FEEL.perPower) * knockScale(kind)) / mass;
  return {
    vx: (dx / len) * punch,
    vy: (dy / len) * punch + KNOCK_FEEL.popVy * knockScale(kind),
  };
}

export function knock(
  body: FlopBody,
  fromX: number,
  fromY: number,
  power: number,
  kind: KnockKind = "body",
): FlopBody {
  const punch = knockVector(body, fromX, fromY, power, kind);
  const dx = body.x - fromX;
  return {
    ...body,
    vx: body.vx + punch.vx,
    vy: body.vy + punch.vy,
    spin: body.spin + (dx >= 0 ? -KNOCK_FEEL.spin : KNOCK_FEEL.spin),
  };
}

export function isAirborne(body: Pick<FlopBody, "y">): boolean {
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

export function escapeThresholds(stunned: boolean): {
  slideAfter: number;
  leapAfter: number;
} {
  return stunned
    ? { slideAfter: ESCAPE_FEEL.stunnedSlideAfter, leapAfter: ESCAPE_FEEL.stunnedLeapAfter }
    : { slideAfter: ESCAPE_FEEL.slideAfter, leapAfter: ESCAPE_FEEL.leapAfter };
}

export function escapePhaseAt(input: {
  onDeck: boolean;
  airborne: boolean;
  inWater: boolean;
  stunned: boolean;
  unattended: number;
  waterTime: number;
}): EscapePhase {
  if (input.inWater && input.waterTime >= ESCAPE_FEEL.waterGone) return "gone";
  if (input.airborne) return "idle";
  const { slideAfter, leapAfter } = escapeThresholds(input.stunned);
  if (input.inWater && input.unattended >= slideAfter) return "leap";
  if (!input.onDeck && !input.inWater) return "idle";
  if (input.unattended >= leapAfter) return "leap";
  if (input.unattended >= slideAfter) return "slide";
  return "idle";
}

export function applyEscape(body: FlopBody, phase: EscapePhase, dt: number): FlopBody {
  if (phase === "slide" && !isAirborne(body) && !inWater(body)) {
    return {
      ...body,
      vx: Math.max(body.vx, ESCAPE_FEEL.slideVx),
      spin: body.spin + 6 * dt,
    };
  }
  if (phase === "leap") return leapTowardWater(body);
  return body;
}

export function escapeCaption(phase: EscapePhase): string {
  if (phase === "slide") return "鱼在往海里滑。快砸或捡起来！";
  if (phase === "leap") return "要跳回去了！";
  if (phase === "gone") return "跳回海里了。再抛竿拽上来。";
  return "";
}

export function smashGradeAt(body: Pick<FlopBody, "y">, apexY: number): SmashGrade {
  if (!isAirborne(body)) return "none";
  const loft = Math.max(36, apexY - DECK_Y);
  const t = (body.y - DECK_Y) / loft;
  if (t < SMASH_WINDOW.openLo || t > SMASH_WINDOW.openHi) return "none";
  if (t >= SMASH_WINDOW.perfectLo && t <= SMASH_WINDOW.perfectHi) return "perfect";
  return "open";
}

export function airborneStyleQuality(grade: SmashGrade): number {
  if (grade === "perfect") return 1.2;
  if (grade === "open") return 1;
  return 0;
}

export function smashWindowOpen(grade: SmashGrade): boolean {
  return grade === "open" || grade === "perfect";
}

export function carryReleaseAt(x: number, y: number): CarryRelease {
  if (crateDrop(x, y)) return "stash";
  if (inWater({ x, y }) || x > WATER_X) return "drop_water";
  return "drop_deck";
}

export function clampCarry(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(40, Math.max(-600, x)),
    y: Math.min(-8, Math.max(-300, y)),
  };
}

export function carryReleaseCaption(kind: CarryRelease): string {
  if (kind === "stash") return "丢进鱼箱。";
  if (kind === "drop_water") return "掉进海里了。再抛竿。";
  return "掉在甲板上。走近再捡，或拖去鱼箱。";
}

export function carryDragHint(): string {
  return "下半屏拖到左边鱼箱，松手入箱。碰到鱼箱会吸入；松在海里会跑。";
}

/** 第一下落地后的水平滑移距离，给单测对照「不是瞬贴」。 */
export function flopSlidePx(mass = 1, stunned = false): number {
  let body = beginFlop(-320, DECK_Y, mass);
  let landedX: number | undefined;
  let stoppedX = body.x;
  for (let i = 0; i < 120; i++) {
    const prev = body;
    body = stepFlop(body, 0.016, stunned);
    if (landedX == null && bouncedOnDeck(prev, body)) landedX = body.x;
    if (landedX != null && Math.abs(body.vx) < DECK_BODY.slideStopVx && body.y <= DECK_Y + 2) {
      stoppedX = body.x;
      break;
    }
  }
  return Math.abs((landedX ?? body.x) - stoppedX);
}
