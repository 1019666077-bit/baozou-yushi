/**
 * 手持纺车竿的手感。数字来自 tidewater `src/game/FishingRod.js`。
 * https://github.com/dgreenheck/tidewater (MIT, Copyright (c) 2026 DRG Software Solutions LLC)
 *
 * 不创建网格。姿态、弯曲弹簧、48 段鱼线、浮标和线轮角度都写在这里，
 * Cocos 和 three.js 预览只负责把这些数画出来。
 */

export const ROD_L = 2.13;
export const BLANK_START = 0.535;
export const SEAT_Y = 0.405;
export const LINE_SEGS = 48;
const GRAV = 9.81;
const LINE_PER_CRANK = 0.8;
const GEAR = 5.2;

export type RodState =
  | "stowed"
  | "idle"
  | "windup"
  | "flick"
  | "flying"
  | "floating"
  | "fighting"
  | "landing"
  | "retrieving";

interface Pose {
  elev: number;
  side: number;
  hand: readonly [number, number, number];
}

export const POSES: { [key: string]: Pose } = {
  stowed: { elev: -0.9, side: 0.35, hand: [0.3, -0.62, -0.25] },
  idle: { elev: 0.46, side: 0.22, hand: [0.15, -0.05, -0.45] },
  windup: { elev: 2.0, side: 0.12, hand: [0.22, -0.08, -0.2] },
  flick: { elev: 0.16, side: 0.14, hand: [0.18, -0.12, -0.55] },
  follow: { elev: 0.24, side: 0.02, hand: [0.17, -0.1, -0.56] },
  floating: { elev: 0.4, side: 0.18, hand: [0.15, -0.06, -0.46] },
  fighting: { elev: 0.9, side: 0.12, hand: [0.14, -0.03, -0.43] },
  landing: { elev: 0.85, side: 0.3, hand: [0.16, -0.08, -0.46] },
};

export interface RodFight {
  distance: number;
  tension: number;
  surge: number;
}

export interface RodFrame {
  camX: number;
  camY: number;
  camZ: number;
  /** 水平朝向，弧度。0 朝 +z。 */
  yaw: number;
  waterY: number;
  fight: RodFight | null;
  /** 试饵 / 吞饵把浮标往下拉，0..1.4 */
  dip: number;
}

export function bendExponent(load: number): number {
  const t = Math.min(1, Math.max(0, load));
  return 3.4 + (1.7 - 3.4) * t;
}

export class RodRig {
  state: RodState = "stowed";
  equipped = false;
  power = 0;
  castM = 22;
  reelSpeed = 1.1;
  bend = 0;
  bendP = 3.4;
  load = 0;
  rotor = 0;
  crank = 0;
  bail = 0;
  spoolAng = 0;
  splash = 0;
  bobX = 0;
  bobY = 0;
  bobZ = 0;
  tipX = 0;
  tipY = 0;
  tipZ = 0;
  /** 落水那一帧，竿尖到浮标的距离。搏斗从这里起算。 */
  splashLine = 0;
  splashX = 0;
  splashZ = 0;
  /** 这一帧画出来的仰角和侧摆。surge 和呼吸只加在这里。 */
  drawElev = POSES.stowed.elev;
  drawSide = POSES.stowed.side;
  bendDirX = 0;
  bendDirZ = -1;
  /** 鱼把线往外拖的速度，米/秒。泄力声用它。 */
  payOut = 0;
  lineOut = 0;
  line = new Float32Array((LINE_SEGS + 1) * 3);
  readonly elev = { now: POSES.stowed.elev };
  readonly side = { now: POSES.stowed.side };
  readonly hand = { x: POSES.stowed.hand[0], y: POSES.stowed.hand[1], z: POSES.stowed.hand[2] };

  private t = 0;
  private bendVel = 0;
  private splashMarked = false;
  private bobVX = 0;
  private bobVY = 0;
  private bobVZ = 0;
  private aimX = 0;
  private aimZ = 0;
  private bailTarget = 0;
  private crankRate = 0;
  private lastOut = 0;
  private wander = 0;
  private landFromX = 0;
  private landFromY = 0;
  private landFromZ = 0;

  setGear(castM: number, reelSpeed: number): void {
    this.castM = castM;
    this.reelSpeed = reelSpeed;
  }

  equip(on: boolean): void {
    this.equipped = on;
    this.setState(on ? "idle" : "stowed");
  }

  startWindup(): boolean {
    if (this.state !== "idle") return false;
    this.setState("windup");
    this.power = 0;
    return true;
  }

  /** 松手。下一帧抖竿，0.09 秒后脱手飞出。 */
  release(aimX: number, aimZ: number): boolean {
    if (this.state !== "windup") return false;
    this.aimX = aimX;
    this.aimZ = aimZ;
    this.setState("flick");
    return true;
  }

  hook(): boolean {
    if (this.state !== "floating" && this.state !== "flying") return false;
    this.setState("fighting");
    return true;
  }

  land(): void {
    this.landFromX = this.bobX;
    this.landFromY = this.bobY;
    this.landFromZ = this.bobZ;
    this.setState("landing");
  }

  retrieve(): void {
    if (this.state === "floating" || this.state === "flying") this.setState("retrieving");
  }

  endFight(): void {
    this.setState(this.lineOut > 3 ? "retrieving" : "idle");
  }

  update(dt: number, frame: RodFrame): void {
    // 弹簧 K=250。预览快进会把 dt 放到 0.1 秒以上，显式欧拉会炸，所以按 1/60 小步积。
    let left = Math.max(0, Math.min(dt, 2));
    const step = 1 / 60;
    while (left > 1e-8) {
      const d = Math.min(step, left);
      this.integrate(d, frame);
      left -= d;
    }
  }

  private integrate(dt: number, frame: RodFrame): void {
    this.t += dt;
    if (this.state === "windup") this.power = Math.min(1, this.power + dt / 1.1);
    this.easePose(dt, frame);
    this.applyDraw(frame);
    this.easeBend(dt, frame);
    this.placeTip(frame);
    this.aimBend(dt, frame);
    this.placeTip(frame);
    this.stepBobber(dt, frame);
    this.stepReel(dt, frame);
    this.writeLine(frame);
    this.splash = Math.max(0, this.splash - dt * 1.4);
  }

  private setState(next: RodState): void {
    this.state = next;
    this.t = 0;
  }

  private easePose(dt: number, frame: RodFrame): void {
    let target = POSES[this.state] ?? POSES.idle;
    if (this.state === "flying") target = POSES.follow;
    if (this.state === "retrieving") target = POSES.floating;
    if (this.state === "flick" && this.t < 0.06) target = POSES.windup;
    const speed = this.state === "flick" ? 28 : this.state === "windup" ? 7 : 5;
    const k = 1 - Math.exp(-speed * dt);
    this.elev.now += (target.elev - this.elev.now) * k;
    this.side.now += (target.side - this.side.now) * k;
    this.hand.x += (target.hand[0] - this.hand.x) * k;
    this.hand.y += (target.hand[1] - this.hand.y) * k;
    this.hand.z += (target.hand[2] - this.hand.z) * k;
  }

  /** 原版低头、侧摆、待机呼吸、收线抖动都只加在这一帧的角度上。 */
  private applyDraw(frame: RodFrame): void {
    let elev = this.elev.now;
    let side = this.side.now;
    if (this.state === "idle" || this.state === "floating") {
      elev += Math.sin(this.t * 1.3) * 0.012;
      side += Math.sin(this.t * 0.9 + 1.7) * 0.01;
    }
    if (this.state === "retrieving") elev += Math.sin(this.crank) * 0.006;
    if (this.state === "fighting" && frame.fight) {
      elev += -0.35 * frame.fight.surge + 0.12 * Math.sin(this.t * 2.3);
      side += 0.12 * Math.sin(this.t * 1.1 + frame.fight.surge * 2);
    }
    this.drawElev = elev;
    this.drawSide = side;
  }

  private easeBend(dt: number, frame: RodFrame): void {
    let bendT = 0;
    let loadT = 0.15;
    const fight = frame.fight;
    if (this.state === "fighting" && fight) {
      bendT = 0.06 + 0.3 * Math.min(fight.tension, 1.1) + 0.05 * fight.surge;
      loadT = Math.min(1, fight.tension * 1.1);
    } else if (this.state === "retrieving") bendT = 0.035;
    else if (this.state === "windup") bendT = 0.02 + 0.03 * this.power;
    else if (this.state === "flick") {
      bendT = this.t < 0.09 ? -0.2 * (0.4 + this.power) : 0;
      loadT = 0.55;
    } else if (this.state === "floating") bendT = 0.012 + Math.min(1.4, frame.dip) * 0.07;
    else if (this.state === "landing") {
      bendT = 0.14;
      loadT = 0.5;
    }
    const kSpring = 250;
    const damp = 8;
    this.bendVel += ((bendT - this.bend) * kSpring - this.bendVel * damp) * dt;
    this.bend += this.bendVel * dt;
    this.load += (loadT - this.load) * (1 - Math.exp(-dt * 6));
    this.bendP = bendExponent(this.load);
  }

  private aimBend(dt: number, frame: RodFrame): void {
    const basis = rodBasis(this.drawElev, this.drawSide, this.hand.x, this.hand.y, this.hand.z);
    const origin = basisToWorld(basis, 0, 0, 0, frame);
    const xAxis = basisToWorld(basis, 1, 0, 0, frame);
    const zAxis = basisToWorld(basis, 0, 0, 1, frame);
    const dx = this.bobX - this.tipX;
    const dz = this.bobZ - this.tipZ;
    const localX = dx * (xAxis.x - origin.x) + dz * (xAxis.z - origin.z);
    const localZ = dx * (zAxis.x - origin.x) + dz * (zAxis.z - origin.z);
    const len = Math.hypot(localX, localZ);
    if (len < 1e-3) return;
    const k = 1 - Math.exp(-dt * 4);
    this.bendDirX += (localX / len - this.bendDirX) * k;
    this.bendDirZ += (localZ / len - this.bendDirZ) * k;
    const n = Math.hypot(this.bendDirX, this.bendDirZ) || 1;
    this.bendDirX /= n;
    this.bendDirZ /= n;
  }

  private placeTip(frame: RodFrame): void {
    const basis = rodBasis(this.drawElev, this.drawSide, this.hand.x, this.hand.y, this.hand.z);
    const s = 1;
    const lat = this.bend * ROD_L * Math.pow(s, this.bendP);
    const drop = 0.5 * lat * lat / (ROD_L - BLANK_START + 0.06);
    const localX = this.bendDirX * lat;
    const localY = ROD_L - drop;
    const localZ = this.bendDirZ * lat;
    const world = basisToWorld(basis, localX, localY, localZ, frame);
    this.tipX = world.x;
    this.tipY = world.y;
    this.tipZ = world.z;
  }

  private stepBobber(dt: number, frame: RodFrame): void {
    if (this.state === "flick" && this.t > 0.09) {
      const v0 = 7 + 13 * this.power * Math.sqrt(this.castM / 22);
      // 水平指向准星前方的落点，垂直用镜头俯仰再抬一截，整段速度都是 v0。
      const tx = this.aimX - this.tipX;
      const tz = this.aimZ - this.tipZ;
      const tl = Math.max(Math.hypot(tx, tz), 1e-3);
      const aimH = Math.hypot(this.aimX - frame.camX, this.aimZ - frame.camZ) || 1;
      const camDrop = frame.waterY - frame.camY;
      const camY = camDrop / Math.hypot(aimH, camDrop);
      const dirY = Math.max(camY, -0.2) + 0.35;
      const dirX = tx / tl;
      const dirZ = tz / tl;
      const len = Math.hypot(dirX, dirY, dirZ) || 1;
      this.bobX = this.tipX;
      this.bobY = this.tipY;
      this.bobZ = this.tipZ;
      this.bobVX = (dirX / len) * v0;
      this.bobVY = (dirY / len) * v0;
      this.bobVZ = (dirZ / len) * v0;
      this.splashMarked = false;
      this.setState("flying");
    }
    if (this.state === "flying") {
      this.bobVY -= GRAV * dt;
      const drag = Math.exp(-dt * 0.25);
      this.bobVX *= drag;
      this.bobVY *= drag;
      this.bobVZ *= drag;
      this.bobX += this.bobVX * dt;
      this.bobY += this.bobVY * dt;
      this.bobZ += this.bobVZ * dt;
      // 水平距离超过这支竿的 castM 时，水平速度减半。每帧都查，所以落点停在射程附近。
      const range = Math.hypot(this.bobX - this.tipX, this.bobZ - this.tipZ);
      if (range > this.castM) {
        this.bobVX *= 0.5;
        this.bobVZ *= 0.5;
      }
      if (this.bobY <= frame.waterY) {
        this.bobY = frame.waterY;
        this.bobVX = 0;
        this.bobVY = 0;
        this.bobVZ = 0;
        this.splash = 1;
        if (!this.splashMarked) {
          this.splashMarked = true;
          this.splashX = this.bobX;
          this.splashZ = this.bobZ;
          this.splashLine = Math.hypot(this.tipX - this.bobX, this.tipY - this.bobY, this.tipZ - this.bobZ);
        }
        this.setState("floating");
      }
    } else if (this.state === "floating") {
      const bob = Math.sin(this.t * 2.1) * 0.008;
      const yT = frame.waterY + 0.012 + bob - frame.dip * 0.09;
      this.bobY += (yT - this.bobY) * (1 - Math.exp(-dt * 12));
    } else if (this.state === "fighting" && frame.fight) {
      this.wander += dt * (0.4 + frame.fight.surge * 1.5);
      const base = Math.max(3, this.splashLine || 1);
      const dist = Math.max(0.4, frame.fight.distance);
      const ratio = dist / base;
      const ox = this.splashX - frame.camX;
      const oz = this.splashZ - frame.camZ;
      const len = Math.max(Math.hypot(ox, oz), 1e-3);
      const sway = Math.sin(this.wander) * 0.9;
      const tx = frame.camX + ox * ratio + (-oz / len) * sway;
      const tz = frame.camZ + oz * ratio + (ox / len) * sway;
      const k = 1 - Math.exp(-dt * 6);
      this.bobX += (tx - this.bobX) * k;
      this.bobZ += (tz - this.bobZ) * k;
      const yT = frame.waterY - 0.05 - 0.2 * frame.fight.surge;
      this.bobY += (yT - this.bobY) * (1 - Math.exp(-dt * 8));
    } else if (this.state === "retrieving") {
      const dx = this.tipX - this.bobX;
      const dz = this.tipZ - this.bobZ;
      const d = Math.hypot(dx, dz);
      const step = Math.min(d, (3 + this.reelSpeed * 3) * dt);
      if (d > 1e-3) {
        this.bobX += (dx / d) * step;
        this.bobZ += (dz / d) * step;
      }
      this.bobY += (frame.waterY + 0.02 - this.bobY) * (1 - Math.exp(-dt * 10));
      if (d < 2.2) this.setState("idle");
    } else if (this.state === "landing") {
      const k = Math.min(1, this.t / 0.6);
      const e = k * k * (3 - 2 * k);
      const yaw = frame.yaw;
      const fx = -Math.sin(yaw);
      const fz = Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = Math.sin(yaw);
      const tx = frame.camX + fx * 1.25 + rx * 0.15;
      const ty = frame.camY - 0.35;
      const tz = frame.camZ + fz * 1.25 + rz * 0.15;
      this.bobX = this.landFromX + (tx - this.landFromX) * e;
      this.bobZ = this.landFromZ + (tz - this.landFromZ) * e;
      this.bobY = this.landFromY + (ty - this.landFromY) * e + Math.sin(e * Math.PI) * 0.8;
    }
  }

  private stepReel(dt: number, frame: RodFrame): void {
    this.bailTarget = this.state === "windup" || this.state === "flick" || this.state === "flying" ? 1 : 0;
    const bailRate = this.bailTarget > this.bail ? 6 : 16;
    const db = this.bailTarget - this.bail;
    this.bail += Math.sign(db) * Math.min(Math.abs(db), bailRate * dt);
    const outNow = this.state === "fighting" && frame.fight ? frame.fight.distance : this.lineOut;
    const dOut = dt > 0 ? outNow - this.lastOut : 0;
    this.payOut = dt > 0 && dOut > 0 ? dOut / dt : 0;
    this.lastOut = outNow;
    let rateT = 0;
    if ((this.state === "fighting" || this.state === "retrieving" || this.state === "landing") && dt > 0) {
      if (dOut < 0) rateT = Math.min(1.6, -dOut / dt / LINE_PER_CRANK);
      else if (this.state === "fighting") this.spoolAng -= Math.min(dOut, 0.5) / 0.023;
      if (this.state === "landing") rateT = this.t < 0.5 ? 1.2 : 0;
    }
    this.crankRate += (rateT - this.crankRate) * (1 - Math.exp(-dt * 10));
    const dCrank = this.crankRate * Math.PI * 2 * dt;
    this.crank += dCrank;
    this.rotor += Math.min(dCrank * GEAR, 3.1 * Math.PI * 2 * dt);
  }

  get crankSpeed(): number {
    return this.crankRate;
  }

  private writeLine(frame: RodFrame): void {
    const out = this.state === "flying" || this.state === "floating" || this.state === "fighting"
      || this.state === "retrieving" || this.state === "landing";
    this.lineOut = out ? Math.hypot(this.tipX - this.bobX, this.tipY - this.bobY, this.tipZ - this.bobZ) : 0;
    const taut = this.state === "fighting"
      ? Math.min(1, (frame.fight ? frame.fight.tension : 0) * 1.5)
      : this.state === "retrieving" ? 0.6 : 0;
    const sag = this.lineOut * (this.state === "flying" ? 0.03 : 0.07) * (1 - taut) + (out ? 0.02 : 0);
    const cx = (this.tipX + this.bobX) * 0.5;
    const cy = (this.tipY + this.bobY) * 0.5 - sag;
    const cz = (this.tipZ + this.bobZ) * 0.5;
    for (let i = 0; i <= LINE_SEGS; i++) {
      const t = i / LINE_SEGS;
      const a = 1 - t;
      const o = i * 3;
      this.line[o] = a * a * this.tipX + 2 * a * t * cx + t * t * this.bobX;
      this.line[o + 1] = a * a * this.tipY + 2 * a * t * cy + t * t * this.bobY;
      this.line[o + 2] = a * a * this.tipZ + 2 * a * t * cz + t * t * this.bobZ;
    }
  }
}

interface Basis {
  xx: number; xy: number; xz: number;
  yx: number; yy: number; yz: number;
  zx: number; zy: number; zz: number;
  px: number; py: number; pz: number;
}

function rodBasis(elev: number, side: number, hx: number, hy: number, hz: number): Basis {
  let yx = 0;
  let yy = 0;
  let yz = -1;
  const ce = Math.cos(elev);
  const se = Math.sin(elev);
  const yx1 = yx;
  const yy1 = yy * ce - yz * se;
  const yz1 = yy * se + yz * ce;
  yx = yx1;
  yy = yy1;
  yz = yz1;
  const cs = Math.cos(side);
  const ss = Math.sin(side);
  const yx2 = yx * cs + yz * ss;
  const yz2 = -yx * ss + yz * cs;
  yx = yx2;
  yz = yz2;
  const len = Math.hypot(yx, yy, yz) || 1;
  yx /= len;
  yy /= len;
  yz /= len;
  let zx = 0;
  let zy = 1 - yy * yy;
  let zz = -yy * yz;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl;
  zy /= zl;
  zz /= zl;
  const xx = yy * zz - yz * zy;
  const xy = yz * zx - yx * zz;
  const xz = yx * zy - yy * zx;
  return {
    xx, xy, xz, yx, yy, yz, zx, zy, zz,
    px: hx - yx * SEAT_Y,
    py: hy - yy * SEAT_Y,
    pz: hz - yz * SEAT_Y,
  };
}

function basisToWorld(
  b: Basis,
  x: number,
  y: number,
  z: number,
  frame: RodFrame,
): { x: number; y: number; z: number } {
  const lx = b.px + b.xx * x + b.yx * y + b.zx * z;
  const ly = b.py + b.xy * x + b.yy * y + b.zy * z;
  const lz = b.pz + b.xz * x + b.yz * y + b.zz * z;
  const cy = Math.cos(frame.yaw);
  const sy = Math.sin(frame.yaw);
  return {
    x: frame.camX + lx * cy + lz * sy,
    y: frame.camY + ly,
    z: frame.camZ - lx * sy + lz * cy,
  };
}

/**
 * 把源码姿态摆进镜头：握把在画面右下，竿身只占右下大约三分之一，竿尖不越过中线。
 * 线和竿都走 presentViewPoint。弹簧和 POSES 仍是源码的数。弯竿会跟着这组旋转一起动。
 */
const PRESENT_R = [
  0.886632, 0.242863, -0.393575,
  -0.199849, 0.968659, 0.147515,
  0.417066, -0.052136, 0.90738,
];
const PRESENT_T = [0.297124, -0.021098, -0.600602];

export function presentRodPoint(x: number, y: number, z: number): [number, number, number] {
  return [
    PRESENT_R[0] * x + PRESENT_R[1] * y + PRESENT_R[2] * z + PRESENT_T[0],
    PRESENT_R[3] * x + PRESENT_R[4] * y + PRESENT_R[5] * z + PRESENT_T[1],
    PRESENT_R[6] * x + PRESENT_R[7] * y + PRESENT_R[8] * z + PRESENT_T[2],
  ];
}

/** 在右下角那组旋转上再缩小、再压低，让竿尖留在画面中线的右下方。 */
const VIEW_ANCHOR: readonly [number, number, number] = [0.48, -0.31, -0.58];
const VIEW_SCALE = 1;
const VIEW_PITCH = 0;

export function presentViewPoint(x: number, y: number, z: number): [number, number, number] {
  const p = presentRodPoint(x, y, z);
  const x1 = VIEW_ANCHOR[0] + (p[0] - VIEW_ANCHOR[0]) * VIEW_SCALE;
  const y1 = VIEW_ANCHOR[1] + (p[1] - VIEW_ANCHOR[1]) * VIEW_SCALE;
  const z1 = VIEW_ANCHOR[2] + (p[2] - VIEW_ANCHOR[2]) * VIEW_SCALE;
  const c = Math.cos(VIEW_PITCH);
  const s = Math.sin(VIEW_PITCH);
  return [x1, y1 * c - z1 * s, y1 * s + z1 * c];
}

/** 世界坐标转到和 blankCameraPoints 相同的水平相机空间，不含镜头俯仰。 */
export function yawLocalPoint(
  x: number,
  y: number,
  z: number,
  camX: number,
  camY: number,
  camZ: number,
  yaw: number,
): [number, number, number] {
  const dx = x - camX;
  const dy = y - camY;
  const dz = z - camZ;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  return [dx * cy - dz * sy, dy, dx * sy + dz * cy];
}

/**
 * 48 段线跟竿走同一个 presentViewPoint。
 * 起点是变换后的竿尖；末端再钉到浮标的真实相机坐标，这样俯仰不会把线甩到画面外。
 */
export function presentLinePoint(
  index: number,
  segments: number,
  x: number,
  y: number,
  z: number,
  camX: number,
  camY: number,
  camZ: number,
  yaw: number,
  bobPresented: readonly [number, number, number],
  bobTrue: readonly [number, number, number],
): [number, number, number] {
  const yl = yawLocalPoint(x, y, z, camX, camY, camZ, yaw);
  const pr = presentViewPoint(yl[0], yl[1], yl[2]);
  const t = segments > 0 ? index / segments : 1;
  const px = pr[0] + (bobTrue[0] - bobPresented[0]) * t;
  const py = pr[1] + (bobTrue[1] - bobPresented[1]) * t;
  let pz = pr[2] + (bobTrue[2] - bobPresented[2]) * t;
  if (pz > -0.15) pz = -0.15;
  return [px, py, pz];
}

export interface CornerFit {
  pitch: number;
  yaw: number;
  butt: readonly [number, number, number];
}

/** 绕握把补一点点俯仰或偏航，让竿尖留在画面中线的右下方。待机已经在右下时角度是 0。 */
export function fitLowerRight(pts: Float32Array): CornerFit {
  const butt: [number, number, number] = [pts[0], pts[1], pts[2]];
  const tip = pts.length - 3;
  const pitch = solveAxis(pts[tip + 1], pts[tip + 2], butt[1], butt[2], -0.58, true);
  rotatePitch(pts, butt, pitch);
  let yaw = solveAxis(pts[tip], pts[tip + 2], butt[0], butt[2], 0.045, false);
  rotateYaw(pts, butt, yaw);
  const pull = solvePortrait(pts, tip, butt);
  rotateYaw(pts, butt, pull);
  yaw += pull;
  return { pitch, yaw, butt };
}

/** 竖屏水平视野更窄。竿尖留在画面里，不要甩出右边缘。 */
function solvePortrait(pts: Float32Array, tip: number, butt: readonly [number, number, number]): number {
  const maxSlope = 0.82 * (375 / 667) * Math.tan((62 * Math.PI) / 360);
  const at = (angle: number) => {
    const dx = pts[tip] - butt[0];
    const dz = pts[tip + 2] - butt[2];
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
      x: butt[0] + dx * c + dz * s,
      z: butt[2] - dx * s + dz * c,
    };
  };
  const wide = (angle: number) => {
    const p = at(angle);
    return p.z > -0.25 || p.x > maxSlope * -p.z;
  };
  if (!wide(0)) return 0;
  let lo = 0;
  let hi = 1.3;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (wide(mid)) lo = mid;
    else hi = mid;
  }
  const fitted = at(hi);
  if (fitted.x < 0.04) return 0;
  return hi;
}

export function applyCornerFit(
  x: number,
  y: number,
  z: number,
  fit: CornerFit,
): [number, number, number] {
  let px = x;
  let py = y;
  let pz = z;
  if (fit.pitch !== 0) {
    const dy = py - fit.butt[1];
    const dz = pz - fit.butt[2];
    const c = Math.cos(fit.pitch);
    const s = Math.sin(fit.pitch);
    py = fit.butt[1] + dy * c - dz * s;
    pz = fit.butt[2] + dy * s + dz * c;
  }
  if (fit.yaw !== 0) {
    const dx = px - fit.butt[0];
    const dz = pz - fit.butt[2];
    const c = Math.cos(fit.yaw);
    const s = Math.sin(fit.yaw);
    px = fit.butt[0] + dx * c + dz * s;
    pz = fit.butt[2] - dx * s + dz * c;
  }
  return [px, py, pz];
}

function solveAxis(a: number, b: number, originA: number, originB: number, targetA: number, pitchDown: boolean): number {
  const da = a - originA;
  const db = b - originB;
  const at = (angle: number) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return pitchDown ? originA + da * c - db * s : originA + da * c + db * s;
  };
  const tooFar = pitchDown ? at(0) > targetA : at(0) < targetA;
  if (!tooFar) return 0;
  let lo = pitchDown ? -1.5 : 0;
  let hi = pitchDown ? 0 : 1.5;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    const value = at(mid);
    const still = pitchDown ? value > targetA : value < targetA;
    if (still) {
      if (pitchDown) hi = mid;
      else lo = mid;
    } else if (pitchDown) lo = mid;
    else hi = mid;
  }
  return pitchDown ? lo : hi;
}

function rotatePitch(pts: Float32Array, butt: readonly [number, number, number], pitch: number): void {
  if (pitch === 0) return;
  const c = Math.cos(pitch);
  const s = Math.sin(pitch);
  for (let i = 0; i < pts.length; i += 3) {
    const y = pts[i + 1] - butt[1];
    const z = pts[i + 2] - butt[2];
    pts[i + 1] = butt[1] + y * c - z * s;
    pts[i + 2] = butt[2] + y * s + z * c;
  }
}

function rotateYaw(pts: Float32Array, butt: readonly [number, number, number], yaw: number): void {
  if (yaw === 0) return;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (let i = 0; i < pts.length; i += 3) {
    const x = pts[i] - butt[0];
    const z = pts[i + 2] - butt[2];
    pts[i] = butt[0] + x * c + z * s;
    pts[i + 2] = butt[2] - x * s + z * c;
  }
}

/** 物理放大仍是 max(1, 距离/7)。375 宽上再保底大约 11 像素直径。 */
export function bobberPixelScale(distance: number, viewWidth: number, viewHeight: number): number {
  const physical = Math.max(1, distance / 7);
  const radius = 0.028 * physical;
  const fov = (62 * Math.PI) / 180;
  const pxPerM = (viewHeight * 0.5) / Math.max(0.4, distance) / Math.tan(fov * 0.5);
  const diameterPx = radius * 2 * pxPerM;
  const minPx = 11 * (viewWidth / 375);
  if (diameterPx >= minPx) return physical;
  return physical * (minPx / Math.max(diameterPx, 0.01));
}

/** 竿身在相机空间里的折线。侧向跟着弯曲方向，角度用这一帧的 drawElev / drawSide。 */
export function blankCameraPoints(rig: RodRig, count = 12): Float32Array {
  const b = rodBasis(rig.drawElev, rig.drawSide, rig.hand.x, rig.hand.y, rig.hand.z);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = (ROD_L * i) / (count - 1);
    const s = Math.min(1, Math.max(0, (y - BLANK_START) / (ROD_L - BLANK_START)));
    const lat = y > BLANK_START ? rig.bend * ROD_L * Math.pow(s, rig.bendP) : 0;
    const drop = lat === 0 ? 0 : (0.5 * lat * lat) / (y - BLANK_START + 0.06);
    const lx = rig.bendDirX * lat;
    const ly = y - drop;
    const lz = rig.bendDirZ * lat;
    out[i * 3] = b.px + b.xx * lx + b.yx * ly + b.zx * lz;
    out[i * 3 + 1] = b.py + b.xy * lx + b.yy * ly + b.zy * lz;
    out[i * 3 + 2] = b.pz + b.xz * lx + b.yz * ly + b.zz * lz;
  }
  return out;
}
