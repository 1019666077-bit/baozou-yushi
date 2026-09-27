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
  line = new Float32Array((LINE_SEGS + 1) * 3);
  readonly elev = { now: POSES.stowed.elev };
  readonly side = { now: POSES.stowed.side };
  readonly hand = { x: POSES.stowed.hand[0], y: POSES.stowed.hand[1], z: POSES.stowed.hand[2] };

  private t = 0;
  private bendVel = 0;
  private bendDirX = 0;
  private bendDirZ = -1;
  private bobVX = 0;
  private bobVY = 0;
  private bobVZ = 0;
  private aimX = 0;
  private aimZ = 0;
  private bailTarget = 0;
  private crankRate = 0;
  private lastOut = 0;
  private lineOut = 0;
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
    this.easeBend(dt, frame);
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
    if (this.state === "fighting" && frame.fight) {
      this.elev.now += -0.35 * frame.fight.surge * k + 0.12 * Math.sin(this.t * 2.3) * k;
    }
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

  private placeTip(frame: RodFrame): void {
    const basis = rodBasis(this.elev.now, this.side.now, this.hand.x, this.hand.y, this.hand.z);
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
      const dx = this.aimX - this.tipX;
      const dz = this.aimZ - this.tipZ;
      const horiz = Math.max(Math.hypot(dx, dz), 1e-3);
      this.bobX = this.tipX;
      this.bobY = this.tipY;
      this.bobZ = this.tipZ;
      this.bobVX = (dx / horiz) * v0 * 0.72;
      this.bobVY = v0 * 0.55;
      this.bobVZ = (dz / horiz) * v0 * 0.72;
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
      if (this.bobY <= frame.waterY) {
        this.bobY = frame.waterY;
        this.bobVX = 0;
        this.bobVY = 0;
        this.bobVZ = 0;
        this.splash = 1;
        this.setState("floating");
      }
    } else if (this.state === "floating") {
      const bob = Math.sin(this.t * 2.1) * 0.008;
      const yT = frame.waterY + 0.012 + bob - frame.dip * 0.09;
      this.bobY += (yT - this.bobY) * (1 - Math.exp(-dt * 12));
    } else if (this.state === "fighting" && frame.fight) {
      this.wander += dt * (0.4 + frame.fight.surge * 1.5);
      const dist = Math.max(1, frame.fight.distance);
      const dx = this.aimX - frame.camX;
      const dz = this.aimZ - frame.camZ;
      const len = Math.max(Math.hypot(dx, dz), 1e-3);
      const sway = Math.sin(this.wander) * 0.9;
      const tx = frame.camX + (dx / len) * dist + (-dz / len) * sway;
      const tz = frame.camZ + (dz / len) * dist + (dx / len) * sway;
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

/** 竿身在相机空间里的折线。视图按这些点摆低多边形竿段。 */
export function blankCameraPoints(rig: RodRig, count = 12): Float32Array {
  const b = rodBasis(rig.elev.now, rig.side.now, rig.hand.x, rig.hand.y, rig.hand.z);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = (ROD_L * i) / (count - 1);
    const s = Math.min(1, Math.max(0, (y - BLANK_START) / (ROD_L - BLANK_START)));
    const lat = y > BLANK_START ? rig.bend * ROD_L * Math.pow(s, rig.bendP) : 0;
    const drop = lat === 0 ? 0 : (0.5 * lat * lat) / (y - BLANK_START + 0.06);
    const lx = lat * 0.15;
    const ly = y - drop;
    const lz = -lat;
    out[i * 3] = b.px + b.xx * lx + b.yx * ly + b.zx * lz;
    out[i * 3 + 1] = b.py + b.xy * lx + b.yy * ly + b.zy * lz;
    out[i * 3 + 2] = b.pz + b.xz * lx + b.yz * ly + b.zz * lz;
  }
  return out;
}
