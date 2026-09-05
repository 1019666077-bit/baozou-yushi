import {
  fishLook,
  islandLook,
  type IslandLook,
  type Rgb,
} from "./GrayLook";

/** 0–255；a 省略则实心。坐标与 Runtime Graphics 一致：原点居中、Y 向上。 */
export type Rgba = readonly [number, number, number, number?];

export type FishFace = "idle" | "hooked" | "stunned" | "carry" | "happy";

export type DrawOp =
  | {
      t: "ellipse";
      x: number;
      y: number;
      rx: number;
      ry: number;
      fill: Rgba;
      tag?: string;
    }
  | { t: "circle"; x: number; y: number; r: number; fill: Rgba; tag?: string }
  | {
      t: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      r?: number;
      fill: Rgba;
      tag?: string;
    }
  | { t: "poly"; pts: number[]; fill: Rgba; tag?: string }
  | {
      t: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: Rgba;
      width: number;
    }
  | {
      t: "bezier";
      x1: number;
      y1: number;
      c1x: number;
      c1y: number;
      c2x: number;
      c2y: number;
      x2: number;
      y2: number;
      color: Rgba;
      width: number;
      tag?: string;
    }
  | { t: "ring"; x: number; y: number; r: number; color: Rgba; width: number }
  | {
      t: "strokeRect";
      x: number;
      y: number;
      w: number;
      h: number;
      r?: number;
      color: Rgba;
      width: number;
    }
  | {
      t: "grad";
      x: number;
      y: number;
      w: number;
      h: number;
      from: Rgba;
      to: Rgba;
      axis?: "y" | "x";
      r?: number;
      tag?: string;
    }
  | {
      t: "speckle";
      x: number;
      y: number;
      w: number;
      h: number;
      color: Rgba;
      count: number;
      size: number;
      seed?: number;
      tag?: string;
    }
  | {
      t: "shadow";
      x: number;
      y: number;
      rx: number;
      ry: number;
      fill: Rgba;
      tag?: string;
    }
  | {
      t: "grain";
      x: number;
      y: number;
      w: number;
      h: number;
      color: Rgba;
      count: number;
      size: number;
      seed?: number;
      dir?: "h" | "v" | "diag";
      tag?: string;
    }
  | {
      t: "wash";
      x: number;
      y: number;
      w: number;
      h: number;
      color: Rgba;
      count: number;
      seed?: number;
      tag?: string;
    }
  | {
      t: "burst";
      x: number;
      y: number;
      r: number;
      spikes: number;
      fill: Rgba;
      tag?: string;
    };

/** 码头/船/箱共用木色，避免一块一块各调各的。 */
export const WOOD = {
  shadow: [8, 24, 36] as Rgb,
  pile: [74, 46, 24] as Rgb,
  plank: [196, 126, 58] as Rgb,
  highlight: [236, 184, 104] as Rgb,
  grain: [120, 72, 36] as Rgb,
  dark: [92, 56, 28] as Rgb,
  rope: [214, 176, 108] as Rgb,
};

/** 市集暖色，跟港口日落同一暖金方向。 */
export const MARKET = {
  awningA: [214, 78, 48] as Rgb,
  awningB: [255, 198, 88] as Rgb,
  stall: [236, 208, 148] as Rgb,
  lantern: [255, 168, 56] as Rgb,
  glow: [255, 214, 118] as Rgb,
  sign: [255, 226, 140] as Rgb,
  lamp: [255, 196, 88] as Rgb,
  strip: [255, 168, 72] as Rgb,
};

/** 代理/Runtime 共用的灯火与鱼活节奏，避免预览另写一套。 */
export const TAIL_WAG_AMP = 0.3;
export const TAIL_WAG_MS = 150;
export const BLINK_PERIOD_MS = 2600;
export const BLINK_SHUT_MS = 100;
export const WEAK_PULSE_MS = 128;

export function lanternFlickerAt(phase: number, x: number): number {
  const slow = 0.5 + 0.5 * Math.sin(phase * 2.35 + x * 0.034);
  const tick = 0.72 + 0.28 * Math.sin(phase * 8.4 + x * 0.17);
  return Math.min(1.18, slow * 0.72 + tick * 0.4);
}

export function lampFlickerAt(phase: number, x: number): number {
  return 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(phase * 5.4 + x * 0.09));
}

export function fireworkLiftPx(phase: number, x: number): number {
  const t = (Math.sin(phase * 1.15 + x * 0.045) + 1) * 0.5;
  return t * 42;
}

export function sheenDriftPx(phase: number): number {
  return Math.sin(phase * 0.9) * 32;
}

export function tailWagRad(nowMs: number): number {
  return Math.sin(nowMs / TAIL_WAG_MS) * TAIL_WAG_AMP;
}

export function blinkClosed(nowMs: number): boolean {
  return nowMs % BLINK_PERIOD_MS < BLINK_SHUT_MS;
}

export function weakPulseK(nowMs: number): number {
  return 0.58 + 0.42 * (0.5 + 0.5 * Math.sin(nowMs / WEAK_PULSE_MS));
}

export const SWIM_CURVE_MS = 380;

/** 湾鳍游动 S 线：水平摆 + 垂直起伏 + 身体倾角。 */
export function swimSway(nowMs: number): { x: number; y: number; angle: number } {
  return {
    x: Math.sin(nowMs / SWIM_CURVE_MS) * 22,
    y: Math.sin(nowMs / 260) * 12,
    angle: Math.sin(nowMs / 320) * 0.28,
  };
}

export function fishUnderwater(x: number, y: number): boolean {
  return x > -150 && y < 80;
}

export function rgba(rgb: Rgb, a = 255): Rgba {
  return [rgb[0], rgb[1], rgb[2], a];
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function shade(rgb: Rgb, k: number): Rgb {
  return [
    Math.max(0, Math.min(255, Math.round(rgb[0] * k))),
    Math.max(0, Math.min(255, Math.round(rgb[1] * k))),
    Math.max(0, Math.min(255, Math.round(rgb[2] * k))),
  ];
}

function tintDecoy(rgb: Rgb, decoy: boolean): Rgb {
  if (!decoy) return rgb;
  return mix(rgb, [200, 210, 220], 0.55);
}

function push(ops: DrawOp[], ...more: DrawOp[]): void {
  ops.push(...more);
}

function speckleField(
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgba,
  count: number,
  size: number,
  seed = 1,
  tag = "speckle",
): DrawOp {
  return { t: "speckle", x, y, w, h, color, count, size, seed, tag };
}

function softShadow(x: number, y: number, rx: number, ry: number, a = 90): DrawOp {
  return {
    t: "shadow",
    x,
    y,
    rx,
    ry,
    fill: rgba([6, 16, 28], a),
    tag: "shadow",
  };
}

function unit01(i: number, seed: number): number {
  const n = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function grainStrokes(op: {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  size: number;
  seed?: number;
  dir?: "h" | "v" | "diag";
}): Array<{ x1: number; y1: number; x2: number; y2: number; w: number }> {
  const seed = op.seed ?? 1;
  const dir = op.dir ?? "h";
  const strokes: Array<{ x1: number; y1: number; x2: number; y2: number; w: number }> = [];
  for (let i = 0; i < op.count; i++) {
    const u = unit01(i, seed);
    const v = unit01(i + 17, seed + 3);
    const x1 = op.x + u * op.w;
    const y1 = op.y + v * op.h;
    const len = op.size * (0.65 + 0.9 * unit01(i + 9, seed));
    const dx = dir === "v" ? (i % 2 === 0 ? 0.8 : -0.6) : dir === "diag" ? len * 0.78 : len;
    const dy = dir === "h" ? (i % 2 === 0 ? 1.1 : -0.9) : dir === "diag" ? len * 0.38 : len;
    strokes.push({
      x1,
      y1,
      x2: x1 + dx,
      y2: y1 + dy,
      w: 0.7 + 0.8 * u,
    });
  }
  return strokes;
}

export function washBlobs(op: {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  seed?: number;
}): Array<{ x: number; y: number; rx: number; ry: number }> {
  const seed = op.seed ?? 1;
  const blobs: Array<{ x: number; y: number; rx: number; ry: number }> = [];
  for (let i = 0; i < op.count; i++) {
    const u = unit01(i, seed);
    const v = unit01(i + 11, seed + 2);
    blobs.push({
      x: op.x + u * op.w,
      y: op.y + v * op.h,
      rx: 8 + u * 18,
      ry: 3.2 + v * 7,
    });
  }
  return blobs;
}

export function burstPts(op: { x: number; y: number; r: number; spikes: number }): number[] {
  const pts: number[] = [];
  const n = Math.max(5, op.spikes) * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? op.r : op.r * 0.4;
    pts.push(op.x + Math.cos(a) * rad, op.y + Math.sin(a) * rad);
  }
  return pts;
}

function grainField(
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgba,
  count: number,
  size: number,
  seed = 1,
  dir: "h" | "v" | "diag" = "h",
  tag = "grain",
): DrawOp {
  return { t: "grain", x, y, w, h, color, count, size, seed, dir, tag };
}

function washField(
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgba,
  count: number,
  seed = 1,
  tag = "brush",
): DrawOp {
  return { t: "wash", x, y, w, h, color, count, seed, tag };
}

function hatchStrokes(
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgba,
  count: number,
  width: number,
  seed = 1,
): DrawOp[] {
  const ops: DrawOp[] = [];
  for (let i = 0; i < count; i++) {
    const n = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    const u = n - Math.floor(n);
    const m = Math.sin((i + 3) * 4.1414 + seed * 19.19) * 23421.196;
    const v = m - Math.floor(m);
    const x1 = x + u * w;
    const y1 = y + v * h;
    ops.push({
      t: "line",
      x1,
      y1,
      x2: x1 + 6 + u * 10,
      y2: y1 + (i % 2 === 0 ? 3 : -2),
      color,
      width,
    });
  }
  return ops;
}

function rockOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  return [
    {
      t: "ellipse",
      x,
      y: y - 2 * s,
      rx: 10 * s,
      ry: 4 * s,
      fill: rgba([8, 20, 28], 90),
      tag: "shadow",
    },
    {
      t: "ellipse",
      x,
      y,
      rx: 9 * s,
      ry: 5.2 * s,
      fill: rgba(mix(look.landDark, [48, 42, 36], 0.45)),
      tag: "rock",
    },
    {
      t: "ellipse",
      x: x + 2 * s,
      y: y + 1.6 * s,
      rx: 4 * s,
      ry: 2 * s,
      fill: rgba([255, 226, 170], 70),
      tag: "rim",
    },
  ];
}

function bushOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  return [
    {
      t: "ellipse",
      x,
      y,
      rx: 8 * s,
      ry: 6 * s,
      fill: rgba(look.landDark),
      tag: "bush",
    },
    {
      t: "ellipse",
      x: x + 3 * s,
      y: y + 2 * s,
      rx: 5 * s,
      ry: 3.4 * s,
      fill: rgba(mix(look.land, look.accent, 0.35)),
      tag: "bush",
    },
    {
      t: "ellipse",
      x: x - 2 * s,
      y: y + 3 * s,
      rx: 3.2 * s,
      ry: 2 * s,
      fill: rgba([255, 236, 150], 55),
      tag: "rim",
    },
  ];
}

function foamLace(
  x: number,
  y: number,
  w: number,
  _look: IslandLook,
): DrawOp[] {
  const ops: DrawOp[] = [];
  for (let i = 0; i < 11; i++) {
    ops.push({
      t: "ellipse",
      x: x + (i - 5) * (w / 11),
      y: y + (i % 2 === 0 ? 3 : -2),
      rx: 12 + (i % 3) * 4,
      ry: 3.8,
      fill: rgba([255, 248, 230], 54 + (i % 3) * 14),
      tag: "foam",
    });
  }
  return ops;
}

function waveCrestY(x: number, y: number, amp: number, phase: number, freq = 0.012): number {
  return y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.45 + phase * 1.35) * amp * 0.38;
}

function waveBandPoly(
  yTop: number,
  yBot: number,
  amp: number,
  phase: number,
  fill: Rgba,
  tag: string,
  step = 40,
): DrawOp {
  const pts: number[] = [];
  for (let x = -640; x <= 640; x += step) {
    pts.push(x, waveCrestY(x, yTop, amp, phase));
  }
  for (let x = 640; x >= -640; x -= step) {
    pts.push(x, waveCrestY(x, yBot, amp * 0.45, phase + 0.85, 0.01));
  }
  return { t: "poly", pts, fill, tag };
}

function waveRidgeOps(
  y: number,
  amp: number,
  phase: number,
  color: Rgba,
  width: number,
  tag = "ridge",
): DrawOp[] {
  const ops: DrawOp[] = [];
  const segs = 5;
  const span = 1280 / segs;
  for (let i = 0; i < segs; i++) {
    const x1 = -640 + i * span;
    const x2 = x1 + span;
    const t1 = x1 + span * 0.33;
    const t2 = x1 + span * 0.66;
    ops.push({
      t: "bezier",
      x1,
      y1: waveCrestY(x1, y, amp, phase),
      c1x: t1,
      c1y: waveCrestY(t1, y, amp, phase),
      c2x: t2,
      c2y: waveCrestY(t2, y, amp, phase),
      x2,
      y2: waveCrestY(x2, y, amp, phase),
      color,
      width,
      tag,
    });
  }
  return ops;
}

/** 猎场水面：浪脊 + 焦散 + 深度色带 + 泡沫，告别平直水带。 */
export function huntWaterOps(look: IslandLook, phase = 0): DrawOp[] {
  const drift = Math.sin(phase) * 16;
  const ops: DrawOp[] = [
    waveBandPoly(34, 8, 8, phase, rgba([255, 244, 214], 78), "foam"),
    waveBandPoly(10, -74, 11, phase + 0.28, rgba(mix(look.far, [210, 246, 255], 0.22), 96), "depth"),
    waveBandPoly(-66, -166, 15, phase + 0.82, rgba(mix(look.mid, look.near, 0.38), 100), "depth"),
    waveBandPoly(-156, -254, 17, phase + 1.18, rgba(mix(look.near, look.deep, 0.32), 108), "depth"),
    waveBandPoly(-244, -360, 13, phase + 1.72, rgba(look.deep, 128), "depth"),
    ...waveRidgeOps(24, 8, phase, rgba([255, 248, 230], 170), 4.6),
    ...waveRidgeOps(16, 7, phase + 0.18, rgba([10, 48, 72], 100), 3.4),
    ...waveRidgeOps(-22, 10, phase + 0.52, rgba([210, 246, 255], 130), 3.8),
    ...waveRidgeOps(-32, 9, phase + 0.68, rgba([8, 36, 58], 88), 3),
    ...waveRidgeOps(-94, 13, phase + 1.02, rgba([255, 248, 230], 112), 3.6),
    ...waveRidgeOps(-170, 15, phase + 1.42, rgba([170, 236, 255], 96), 3.2),
    ...waveRidgeOps(-246, 12, phase + 1.84, rgba([255, 244, 210], 78), 2.8),
    ...foamLace(-90, 12, 300, look),
    ...foamLace(210, -2, 240, look),
    ...foamLace(-340, -86, 280, look),
    ...foamLace(70, -166, 250, look),
    ...foamLace(-40, -248, 220, look),
    speckleField(-640, -70, 1280, 170, rgba([210, 246, 255], 62), 88, 2.3, 91, "speckle"),
    speckleField(-640, -280, 1280, 170, rgba([8, 40, 64], 76), 76, 2.5, 93, "speckle"),
    washField(-600, -36, 1200, 96, rgba([255, 248, 220], 40), 32, 95, "brush"),
    washField(-600, -196, 1200, 130, rgba([90, 210, 230], 54), 36, 97, "brush"),
    grainField(-640, -56, 1280, 86, rgba([255, 236, 180], 56), 68, 16, 99, "h", "grain"),
    grainField(-640, -236, 1280, 110, rgba([16, 72, 96], 66), 56, 14, 101, "diag", "grain"),
  ];
  const caustics: Array<[number, number, number, number, number]> = [
    [-210 + drift, -36, 190, 15, 78],
    [50 - drift * 0.6, -88, 230, 17, 64],
    [370 + drift * 0.4, -138, 170, 13, 56],
    [-370 + drift * 0.3, -118, 150, 12, 50],
    [170 - drift, -198, 200, 14, 48],
    [-70 + drift * 0.8, -238, 130, 10, 42],
    [490 - drift * 0.3, -76, 140, 11, 50],
    [-490 + drift * 0.2, -176, 120, 9, 40],
    [270 + drift * 0.5, -278, 110, 9, 36],
    [-150 - drift * 0.4, -302, 96, 8, 34],
    [90 + drift * 0.2, -56, 76, 7, 46],
    [530 - drift * 0.5, -216, 92, 8, 38],
    [-260 + drift * 0.15, -210, 84, 7, 36],
    [320 - drift * 0.25, -40, 100, 8, 44],
  ];
  for (const [x, y, rx, ry, a] of caustics) {
    ops.push({
      t: "ellipse",
      x,
      y,
      rx,
      ry,
      fill: rgba([170, 240, 255], a),
      tag: "caustic",
    });
  }
  const shadows: Array<[number, number, number, number]> = [
    [220 + drift * 0.3, -90, 42, 12],
    [380 - drift * 0.2, -150, 28, 8],
    [-120 + drift * 0.15, -200, 24, 7],
    [80, -260, 20, 6],
    [500, -120, 32, 9],
    [-300, -170, 18, 6],
  ];
  for (const [x, y, rx, ry] of shadows) {
    ops.push({
      t: "ellipse",
      x,
      y,
      rx,
      ry,
      fill: rgba([6, 24, 36], 110),
      tag: "shadow",
    });
  }
  const sparks: Array<[number, number]> = [
    [-240, -20],
    [80, -70],
    [320, -130],
    [-80, -190],
    [180, -40],
    [-400, -110],
    [460, -60],
    [20, -230],
    [-180, -270],
    [280, -210],
  ];
  for (const [x, y] of sparks) {
    ops.push({
      t: "circle",
      x: x + drift * 0.15,
      y,
      r: 2.4,
      fill: rgba([255, 252, 236], 130),
      tag: "spark",
    });
  }
  return ops;
}

export function skyWaterOps(look: IslandLook, phase = 0): DrawOp[] {
  const ops: DrawOp[] = [
    {
      t: "grad",
      x: -640,
      y: 110,
      w: 1280,
      h: 410,
      from: rgba(look.skyTop),
      to: rgba(look.sky),
      axis: "y",
      tag: "grad",
    },
    {
      t: "grad",
      x: -640,
      y: -8,
      w: 1280,
      h: 118,
      from: rgba(look.sky),
      to: rgba(look.far),
      axis: "y",
      tag: "grad",
    },
    {
      t: "grad",
      x: -640,
      y: -176,
      w: 1280,
      h: 168,
      from: rgba(look.mid),
      to: rgba(look.near),
      axis: "y",
      tag: "grad",
    },
    {
      t: "grad",
      x: -640,
      y: -360,
      w: 1280,
      h: 184,
      from: rgba(look.near),
      to: rgba(look.deep),
      axis: "y",
      tag: "grad",
    },
    waveBandPoly(30, 8, 6, phase, rgba([255, 244, 210], 62), "foam"),
    waveBandPoly(12, -20, 7, phase + 0.4, rgba(mix(look.far, look.mid, 0.45), 86), "depth"),
    waveBandPoly(-86, -112, 9, phase + 0.9, rgba(mix(look.mid, look.near, 0.5), 78), "depth"),
    waveBandPoly(-236, -262, 8, phase + 1.3, rgba(mix(look.near, look.deep, 0.4), 84), "depth"),
    ...waveRidgeOps(44, 6, phase, rgba([255, 236, 180], 120), 3.4),
    ...waveRidgeOps(-38, 8, phase + 0.6, rgba(look.haze, 76), 2.6),
    speckleField(-640, -176, 1280, 148, rgba([210, 246, 255], 42), 64, 1.7, 3, "speckle"),
    speckleField(-640, -360, 1280, 196, rgba([8, 40, 64], 52), 56, 2, 7, "speckle"),
    speckleField(-640, 110, 1280, 220, rgba([255, 248, 220], 28), 32, 1.4, 11, "speckle"),
    speckleField(-640, -40, 1280, 80, rgba([255, 236, 180], 22), 24, 1.6, 15, "speckle"),
    washField(-640, 140, 1280, 260, rgba([255, 236, 196], 48), 36, 21, "brush"),
    washField(-640, -220, 1280, 200, rgba([120, 220, 236], 56), 44, 23, "brush"),
    washField(-640, -360, 1280, 140, rgba([8, 48, 72], 64), 28, 25, "brush"),
    grainField(-640, -168, 1280, 130, rgba([210, 246, 255], 70), 120, 12, 27, "h", "grain"),
    grainField(-640, -340, 1280, 160, rgba([16, 64, 88], 72), 90, 11, 29, "diag", "grain"),
  ];
  if ((look.skyTop[0] ?? 0) > 240) {
    push(
      ops,
      {
        t: "rect",
        x: -640,
        y: 268,
        w: 1280,
        h: 92,
        fill: rgba([255, 92, 42], 72),
      },
      {
        t: "ellipse",
        x: 380,
        y: 228,
        rx: 340,
        ry: 42,
        fill: rgba([255, 168, 72], 64),
      },
      {
        t: "ellipse",
        x: 300,
        y: 18,
        rx: 420,
        ry: 20,
        fill: rgba([255, 150, 64], 40),
        tag: "caustic",
      },
    );
  }
  push(
    ops,
    {
      t: "ellipse",
      x: 80,
      y: 176,
      rx: 280,
      ry: 30,
      fill: rgba([255, 236, 196], 56),
    },
    {
      t: "ellipse",
      x: -240,
      y: 154,
      rx: 150,
      ry: 16,
      fill: rgba([255, 248, 224], 32),
    },
    {
      t: "ellipse",
      x: 0,
      y: 96,
      rx: 640,
      ry: 28,
      fill: rgba(look.haze, 170),
    },
  );
  const drift = Math.sin(phase) * 12;
  const caustics: Array<[number, number, number, number, number]> = [
    [-220 + drift, -68, 170, 11, 46],
    [160 - drift * 0.6, -122, 210, 13, 34],
    [420 + drift * 0.4, -206, 140, 9, 28],
    [-80 - drift, -188, 96, 7, 22],
    [40 + drift * 0.8, -96, 70, 6, 26],
    [-360 + drift * 0.3, -148, 110, 8, 20],
    [280 - drift * 0.5, -248, 90, 6, 18],
    [-480 + drift * 0.2, -88, 80, 6, 22],
    [520 - drift * 0.3, -140, 100, 7, 20],
  ];
  for (const [x, y, rx, ry, a] of caustics) {
    push(ops, {
      t: "ellipse",
      x,
      y,
      rx,
      ry,
      fill: rgba([210, 246, 255], a),
      tag: "caustic",
    });
  }
  const shafts: Array<[number, number]> = [
    [-180, 0.55],
    [40, 0.4],
    [260, 0.32],
  ];
  for (const [x, k] of shafts) {
    push(ops, {
      t: "ellipse",
      x: x + drift * 0.25,
      y: -40,
      rx: 18,
      ry: 120,
      fill: rgba([255, 244, 200], Math.round(22 * k)),
      tag: "shaft",
    });
  }
  push(
    ops,
    {
      t: "line",
      x1: -640,
      y1: 48,
      x2: 640,
      y2: 48,
      color: rgba([255, 236, 180], 110),
      width: 6,
    },
    {
      t: "line",
      x1: -640,
      y1: 40,
      x2: 640,
      y2: 40,
      color: rgba([255, 252, 236], 80),
      width: 2.4,
    },
    {
      t: "bezier",
      x1: -520,
      y1: -40,
      c1x: -360,
      c1y: -16,
      c2x: -200,
      c2y: -56,
      x2: -40,
      y2: -32,
      color: rgba(look.haze, 80),
      width: 2.6,
      tag: "ripple",
    },
    {
      t: "bezier",
      x1: 40,
      y1: -88,
      c1x: 180,
      c1y: -64,
      c2x: 320,
      c2y: -108,
      x2: 480,
      y2: -82,
      color: rgba(look.haze, 64),
      width: 2.2,
      tag: "ripple",
    },
    {
      t: "bezier",
      x1: -300,
      y1: -160,
      c1x: -140,
      c1y: -148,
      c2x: 20,
      c2y: -176,
      x2: 180,
      y2: -158,
      color: rgba([255, 252, 236], 40),
      width: 1.8,
      tag: "ripple",
    },
    {
      t: "bezier",
      x1: -80,
      y1: -230,
      c1x: 80,
      c1y: -218,
      c2x: 240,
      c2y: -244,
      x2: 400,
      y2: -226,
      color: rgba([210, 246, 255], 28),
      width: 1.6,
      tag: "ripple",
    },
  );
  for (const [x, y] of [
    [-300, -54],
    [90, -110],
    [340, -170],
    [-120, -210],
    [200, -80],
    [-460, -126],
    [480, -70],
    [20, -250],
    [-200, -280],
  ] as Array<[number, number]>) {
    push(ops, {
      t: "circle",
      x: x + drift * 0.2,
      y,
      r: 2.2,
      fill: rgba([255, 252, 236], 90),
      tag: "spark",
    });
  }
  const sheen = sheenDriftPx(phase);
  push(
    ops,
    {
      t: "ellipse",
      x: 300 + sheen,
      y: -20,
      rx: 70,
      ry: 160,
      fill: rgba([255, 236, 180], 28),
      tag: "sheen",
    },
    {
      t: "ellipse",
      x: 310 + sheen * 0.6,
      y: -90,
      rx: 36,
      ry: 90,
      fill: rgba([255, 248, 220], 36),
      tag: "sheen",
    },
    {
      t: "ellipse",
      x: 318 + sheen * 0.4,
      y: -170,
      rx: 18,
      ry: 50,
      fill: rgba([255, 252, 236], 44),
      tag: "sheen",
    },
    {
      t: "bezier",
      x1: -520,
      y1: 8,
      c1x: -200,
      c1y: 22,
      c2x: 80,
      c2y: -6,
      x2: 360,
      y2: 12,
      color: rgba([255, 248, 220], 70),
      width: 2.4,
      tag: "ripple",
    },
    washField(-520, -40, 980, 70, rgba([255, 248, 220], 18), 16, 31, "brush"),
    grainField(-600, 20, 1200, 40, rgba([255, 236, 180], 36), 40, 14, 33, "h", "grain"),
  );
  return ops;
}

export function farRidgeOps(look: IslandLook): DrawOp[] {
  const ink = mix(look.deep, [18, 22, 40], 0.55);
  return [
    {
      t: "poly",
      pts: [-640, 40, -520, 78, -400, 52, -280, 92, -140, 58, 20, 88, 180, 50, 320, 96, 480, 62, 640, 86, 640, 36, -640, 36],
      fill: rgba(ink, 210),
      tag: "paraFar",
    },
    {
      t: "poly",
      pts: [-640, 36, -480, 58, -300, 42, -80, 70, 140, 44, 360, 66, 540, 40, 640, 54, 640, 32, -640, 32],
      fill: rgba(mix(ink, look.far, 0.25), 160),
      tag: "paraFar",
    },
    {
      t: "poly",
      pts: [-640, 40, -520, 78, -400, 52, -280, 92, -140, 58, 20, 88, 180, 50, 320, 96, 480, 62, 640, 86, 640, 36, -640, 36],
      fill: rgba(ink, 90),
      tag: "silhouette",
    },
  ];
}

export function farBoatOps(): DrawOp[] {
  const hull = [16, 22, 36] as Rgb;
  return [
    { t: "ellipse", x: -280, y: 28, rx: 28, ry: 5, fill: rgba(hull, 180), tag: "silhouette" },
    { t: "rect", x: -292, y: 28, w: 26, h: 8, r: 2, fill: rgba(hull, 200) },
    { t: "rect", x: -274, y: 34, w: 3, h: 14, fill: rgba(hull, 210) },
    { t: "poly", pts: [-274, 48, -258, 40, -274, 38], fill: rgba([40, 28, 22], 180), tag: "silhouette" },
    { t: "ellipse", x: 210, y: 24, rx: 22, ry: 4, fill: rgba(hull, 160), tag: "silhouette" },
    { t: "rect", x: 198, y: 24, w: 20, h: 6, r: 2, fill: rgba(hull, 180) },
    { t: "rect", x: 210, y: 28, w: 2, h: 10, fill: rgba(hull, 190) },
    { t: "ellipse", x: 520, y: 22, rx: 16, ry: 3, fill: rgba(hull, 140), tag: "silhouette" },
    { t: "rect", x: 512, y: 22, w: 14, h: 5, r: 2, fill: rgba(hull, 160) },
    { t: "ellipse", x: -40, y: 20, rx: 18, ry: 3.4, fill: rgba(hull, 150), tag: "silhouette" },
    { t: "rect", x: -50, y: 20, w: 16, h: 5, r: 2, fill: rgba(hull, 170) },
    { t: "rect", x: -40, y: 24, w: 2, h: 9, fill: rgba(hull, 180) },
    { t: "ellipse", x: 360, y: 18, rx: 14, ry: 2.8, fill: rgba(hull, 130), tag: "silhouette" },
  ];
}

export function lightStripOps(): DrawOp[] {
  const ops: DrawOp[] = [
    {
      t: "bezier",
      x1: -500,
      y1: -112,
      c1x: -430,
      c1y: -96,
      c2x: -360,
      c2y: -120,
      x2: -280,
      y2: -104,
      color: rgba(WOOD.rope, 190),
      width: 2,
    },
    {
      t: "bezier",
      x1: -360,
      y1: -108,
      c1x: -300,
      c1y: -92,
      c2x: -250,
      c2y: -118,
      x2: -210,
      y2: -100,
      color: rgba(WOOD.rope, 160),
      width: 1.6,
    },
  ];
  const lamps: Array<[number, number]> = [
    [-490, -110],
    [-460, -104],
    [-430, -100],
    [-400, -108],
    [-370, -114],
    [-340, -106],
    [-310, -100],
    [-280, -106],
    [-340, -98],
    [-300, -94],
    [-260, -108],
    [-230, -102],
  ];
  for (const [x, y] of lamps) {
    ops.push(
      { t: "circle", x, y, r: 8, fill: rgba(MARKET.glow, 40), tag: "lamp" },
      { t: "circle", x, y, r: 3.2, fill: rgba(MARKET.lamp), tag: "lamp" },
    );
  }
  return ops;
}

export function fireworkOps(): DrawOp[] {
  const sparks: Array<[number, number, number]> = [
    [-430, -40, 3],
    [-390, -8, 2.4],
    [-350, -28, 2.8],
    [-310, 6, 2.2],
    [-270, -18, 2.6],
    [-410, 20, 2],
    [-330, 28, 2.2],
    [-360, 48, 1.8],
  ];
  return sparks.map(([x, y, r]) => ({
    t: "circle" as const,
    x,
    y,
    r,
    fill: rgba(MARKET.sign, 200),
    tag: "firework",
  }));
}

export function sunOps(x: number, y: number, look: IslandLook): DrawOp[] {
  return [
    { t: "circle", x, y, r: 72, fill: rgba(look.accent, 28) },
    { t: "circle", x, y, r: 48, fill: rgba(look.accent, 70) },
    { t: "circle", x, y, r: 26, fill: rgba([255, 228, 150]) },
    { t: "circle", x: x + 7, y: y + 6, r: 8, fill: rgba([255, 248, 220], 210) },
  ];
}

function palmOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  return [
    {
      t: "rect",
      x: x - 3.4 * s,
      y,
      w: 6.8 * s,
      h: 34 * s,
      r: 2,
      fill: rgba(WOOD.pile),
    },
    {
      t: "rect",
      x: x - 1.2 * s,
      y: y + 6 * s,
      w: 2.2 * s,
      h: 22 * s,
      fill: rgba(WOOD.highlight, 120),
    },
    {
      t: "poly",
      pts: [x, y + 34 * s, x - 28 * s, y + 16 * s, x - 6 * s, y + 26 * s],
      fill: rgba(look.landDark),
    },
    {
      t: "poly",
      pts: [x - 4 * s, y + 32 * s, x - 22 * s, y + 22 * s, x - 8 * s, y + 28 * s],
      fill: rgba(mix(look.land, look.accent, 0.35)),
    },
    {
      t: "poly",
      pts: [x, y + 36 * s, x + 28 * s, y + 14 * s, x + 6 * s, y + 26 * s],
      fill: rgba(look.accent),
    },
    {
      t: "poly",
      pts: [x + 4 * s, y + 34 * s, x + 20 * s, y + 20 * s, x + 8 * s, y + 28 * s],
      fill: rgba(mix(look.land, [255, 236, 140], 0.25)),
    },
    {
      t: "poly",
      pts: [x, y + 38 * s, x - 12 * s, y + 54 * s, x + 12 * s, y + 54 * s],
      fill: rgba(look.land),
    },
  ];
}

function hutOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  return [
    {
      t: "poly",
      pts: [x - 24 * s, y + 10 * s, x, y + 34 * s, x + 24 * s, y + 10 * s],
      fill: rgba(look.accent),
    },
    {
      t: "poly",
      pts: [x - 18 * s, y + 14 * s, x, y + 30 * s, x + 16 * s, y + 14 * s],
      fill: rgba(mix(look.accent, MARKET.sign, 0.35)),
    },
    {
      t: "rect",
      x: x - 16 * s,
      y: y - 4 * s,
      w: 32 * s,
      h: 18 * s,
      r: 3,
      fill: rgba(MARKET.stall),
    },
    {
      t: "rect",
      x: x - 14 * s,
      y: y + 8 * s,
      w: 28 * s,
      h: 4 * s,
      fill: rgba(WOOD.highlight, 90),
    },
    {
      t: "rect",
      x: x - 4 * s,
      y: y - 4 * s,
      w: 8 * s,
      h: 12 * s,
      r: 2,
      fill: rgba(WOOD.dark),
    },
    {
      t: "rect",
      x: x + 6 * s,
      y: y + 2 * s,
      w: 6 * s,
      h: 6 * s,
      r: 1,
      fill: rgba([72, 140, 168], 180),
    },
    { t: "circle", x: x + 8 * s, y: y + 6 * s, r: 2.4 * s, fill: rgba(MARKET.glow) },
  ];
}

export function foamIsleOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  const ops: DrawOp[] = [
    softShadow(x, y - 6 * s, 108 * s, 18 * s, 140),
    { t: "ellipse", x, y: y - 4 * s, rx: 102 * s, ry: 24 * s, fill: rgba(look.deep, 170) },
    {
      t: "ellipse",
      x: x - 6 * s,
      y: y + 4 * s,
      rx: 88 * s,
      ry: 22 * s,
      fill: rgba(mix(look.landDark, [42, 36, 28], 0.25), 230),
    },
    {
      t: "poly",
      pts: [
        x - 78 * s, y + 2 * s,
        x - 62 * s, y + 22 * s,
        x - 28 * s, y + 36 * s,
        x + 8 * s, y + 28 * s,
        x - 40 * s, y + 4 * s,
      ],
      fill: rgba(mix(look.landDark, [56, 46, 32], 0.4)),
      tag: "cliff",
    },
    {
      t: "ellipse",
      x,
      y: y + 16 * s,
      rx: 76 * s,
      ry: 20 * s,
      fill: rgba(look.land),
      tag: "paraMid",
    },
    {
      t: "poly",
      pts: [x - 58 * s, y + 10 * s, x - 22 * s, y + 34 * s, x + 6 * s, y + 16 * s, x - 36 * s, y + 6 * s],
      fill: rgba(mix(look.land, look.landDark, 0.4)),
      tag: "terrace",
    },
    {
      t: "poly",
      pts: [x - 10 * s, y + 16 * s, x + 20 * s, y + 40 * s, x + 52 * s, y + 16 * s, x + 18 * s, y + 10 * s],
      fill: rgba(mix(look.land, [255, 226, 140], 0.32)),
      tag: "terrace",
    },
    {
      t: "ellipse",
      x: x + 14 * s,
      y: y + 28 * s,
      rx: 28 * s,
      ry: 13 * s,
      fill: rgba(look.landDark),
    },
    {
      t: "ellipse",
      x: x + 22 * s,
      y: y + 32 * s,
      rx: 16 * s,
      ry: 5 * s,
      fill: rgba([255, 236, 170], 90),
      tag: "rim",
    },
    {
      t: "ellipse",
      x: x - 12 * s,
      y: y + 14 * s,
      rx: 22 * s,
      ry: 6 * s,
      fill: rgba([255, 248, 214], 110),
      tag: "rim",
    },
    {
      t: "ellipse",
      x: x - 40 * s,
      y: y + 2 * s,
      rx: 26 * s,
      ry: 6 * s,
      fill: rgba([255, 248, 230], 88),
      tag: "foam",
    },
    {
      t: "ellipse",
      x: x + 36 * s,
      y: y + 1 * s,
      rx: 22 * s,
      ry: 5 * s,
      fill: rgba([210, 246, 255], 60),
      tag: "foam",
    },
    speckleField(x - 70 * s, y + 4 * s, 140 * s, 36 * s, rgba(look.landDark, 70), 28, 1.8 * s, 5, "speckle"),
    speckleField(x - 50 * s, y + 10 * s, 100 * s, 22 * s, rgba([255, 236, 170], 40), 16, 1.3 * s, 8, "speckle"),
    ...hatchStrokes(x - 56 * s, y + 8 * s, 110 * s, 24 * s, rgba(WOOD.grain, 55), 16, 1.1, 4),
    ...palmOps(x - 26 * s, y + 14 * s, s, look),
    ...palmOps(x + 24 * s, y + 12 * s, 0.72 * s, look),
    ...palmOps(x - 48 * s, y + 8 * s, 0.5 * s, look),
    ...palmOps(x + 40 * s, y + 8 * s, 0.42 * s, look),
    ...hutOps(x + 2 * s, y + 10 * s, s * 0.9, look),
    ...rockOps(x - 62 * s, y + 4 * s, s * 0.9, look),
    ...rockOps(x + 58 * s, y + 3 * s, s * 0.7, look),
    ...bushOps(x - 8 * s, y + 22 * s, s, look),
    ...bushOps(x + 18 * s, y + 18 * s, 0.7 * s, look),
    { t: "ellipse", x: x + 30 * s, y: y + 8 * s, rx: 6 * s, ry: 3.4 * s, fill: rgba(WOOD.dark) },
    { t: "ellipse", x: x + 38 * s, y: y + 7 * s, rx: 4.6 * s, ry: 2.8 * s, fill: rgba(WOOD.plank) },
    { t: "ellipse", x: x + 34 * s, y: y + 9 * s, rx: 2.4 * s, ry: 1.2 * s, fill: rgba(WOOD.highlight, 140) },
    { t: "circle", x: x - 10 * s, y: y + 20 * s, r: 2.4 * s, fill: rgba([46, 96, 72], 190), tag: "paraMid" },
    ...foamLace(x, y - 2 * s, 150 * s, look),
    ...foamLace(x + 8 * s, y - 8 * s, 110 * s, look),
    { t: "ellipse", x: x - 52 * s, y: y - 6 * s, rx: 28 * s, ry: 6 * s, fill: rgba([255, 248, 230], 70), tag: "foam" },
    { t: "ellipse", x: x + 48 * s, y: y - 5 * s, rx: 24 * s, ry: 5 * s, fill: rgba([210, 246, 255], 48), tag: "foam" },
    grainField(x - 70 * s, y + 2 * s, 140 * s, 34 * s, rgba(WOOD.grain, 90), 36, 9 * s, 41, "diag", "grain"),
    washField(x - 48 * s, y + 8 * s, 96 * s, 22 * s, rgba([255, 236, 170], 56), 14, 43, "brush"),
    ...bushOps(x - 28 * s, y + 16 * s, 0.55 * s, look),
    ...rockOps(x + 8 * s, y + 4 * s, 0.48 * s, look),
    { t: "ellipse", x: x - 18 * s, y: y + 8 * s, rx: 10 * s, ry: 2.4 * s, fill: rgba(WOOD.dark, 90), tag: "path" },
    { t: "ellipse", x: x + 6 * s, y: y + 10 * s, rx: 12 * s, ry: 2.2 * s, fill: rgba(mix(look.land, WOOD.plank, 0.35), 120), tag: "path" },
  ];
  return ops;
}

export function prismIsleOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  return [
    softShadow(x, y - 4 * s, 86 * s, 14 * s, 110),
    { t: "ellipse", x, y, rx: 80 * s, ry: 18 * s, fill: rgba(look.landDark, 180) },
    {
      t: "poly",
      pts: [x - 46 * s, y + 4 * s, x - 10 * s, y + 60 * s, x + 16 * s, y + 6 * s],
      fill: rgba(look.land),
    },
    {
      t: "poly",
      pts: [x - 8 * s, y + 6 * s, x + 14 * s, y + 70 * s, x + 34 * s, y + 6 * s],
      fill: rgba(look.accent),
    },
    {
      t: "poly",
      pts: [x + 6 * s, y + 6 * s, x + 40 * s, y + 42 * s, x + 56 * s, y + 6 * s],
      fill: rgba(look.landDark),
    },
    {
      t: "poly",
      pts: [x - 18 * s, y + 28 * s, x - 8 * s, y + 52 * s, x + 4 * s, y + 30 * s],
      fill: rgba(mix(look.land, [255, 236, 210], 0.35)),
      tag: "rim",
    },
    {
      t: "ellipse",
      x: x + 10 * s,
      y: y + 30 * s,
      rx: 9 * s,
      ry: 4.4 * s,
      fill: rgba([255, 248, 220], 90),
      tag: "rim",
    },
    speckleField(x - 40 * s, y + 6 * s, 90 * s, 40 * s, rgba([255, 220, 255], 36), 12, 1.4 * s, 6, "speckle"),
    ...rockOps(x - 50 * s, y + 2 * s, 0.7 * s, look),
    ...foamLace(x, y - 1 * s, 120 * s, look),
    grainField(x - 36 * s, y + 8 * s, 80 * s, 36 * s, rgba([255, 220, 255], 40), 18, 6 * s, 45, "diag", "grain"),
    washField(x - 20 * s, y + 16 * s, 50 * s, 24 * s, rgba([255, 248, 220], 26), 8, 47, "brush"),
  ];
}

export function stormIsleOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  return [
    softShadow(x, y - 5 * s, 104 * s, 16 * s, 120),
    { t: "ellipse", x, y, rx: 96 * s, ry: 22 * s, fill: rgba(look.landDark, 210) },
    {
      t: "poly",
      pts: [x - 56 * s, y + 4 * s, x - 8 * s, y + 52 * s, x, y + 66 * s, x + 54 * s, y + 4 * s],
      fill: rgba(look.land),
    },
    {
      t: "poly",
      pts: [x - 22 * s, y + 36 * s, x, y + 80 * s, x + 20 * s, y + 36 * s],
      fill: rgba(look.landDark),
    },
    {
      t: "poly",
      pts: [x + 6 * s, y + 40 * s, x + 18 * s, y + 62 * s, x + 32 * s, y + 38 * s],
      fill: rgba(mix(look.land, look.accent, 0.25)),
      tag: "rim",
    },
    { t: "ellipse", x, y: y + 62 * s, rx: 13 * s, ry: 6.5 * s, fill: rgba(look.accent) },
    {
      t: "ellipse",
      x: x + 6 * s,
      y: y + 84 * s,
      rx: 18 * s,
      ry: 11 * s,
      fill: rgba(look.haze, 150),
    },
    {
      t: "ellipse",
      x: x + 22 * s,
      y: y + 100 * s,
      rx: 22 * s,
      ry: 9 * s,
      fill: rgba(look.haze, 80),
    },
    speckleField(x - 40 * s, y + 8 * s, 80 * s, 36 * s, rgba([20, 18, 16], 50), 14, 1.5 * s, 2, "speckle"),
    ...rockOps(x - 48 * s, y + 3 * s, 0.8 * s, look),
    ...rockOps(x + 46 * s, y + 2 * s, 0.65 * s, look),
    grainField(x - 44 * s, y + 6 * s, 88 * s, 40 * s, rgba([12, 14, 18], 55), 20, 7 * s, 49, "v", "grain"),
    washField(x - 16 * s, y + 48 * s, 40 * s, 28 * s, rgba(look.haze, 40), 7, 51, "brush"),
  ];
}

export function pierMarketOps(look: IslandLook): DrawOp[] {
  const ops: DrawOp[] = [
    { t: "ellipse", x: -400, y: -214, rx: 128, ry: 16, fill: rgba(look.deep, 200) },
  ];
  for (let i = 0; i < 6; i++) {
    ops.push({
      t: "rect",
      x: -510 + i * 46,
      y: -252,
      w: 12,
      h: 40,
      r: 3,
      fill: rgba(WOOD.pile),
    });
    ops.push({
      t: "ellipse",
      x: -504 + i * 46,
      y: -252,
      rx: 16,
      ry: 4,
      fill: rgba([210, 246, 255], 36),
      tag: "caustic",
    });
  }
  push(
    ops,
    { t: "rect", x: -530, y: -226, w: 310, h: 22, r: 6, fill: rgba(WOOD.plank) },
    { t: "rect", x: -530, y: -210, w: 310, h: 12, r: 4, fill: rgba(WOOD.highlight) },
    { t: "rect", x: -530, y: -198, w: 310, h: 8, r: 3, fill: rgba(WOOD.dark) },
    { t: "line", x1: -520, y1: -214, x2: -230, y2: -214, color: rgba(WOOD.grain, 160), width: 2 },
    { t: "line", x1: -520, y1: -204, x2: -230, y2: -204, color: rgba(WOOD.grain, 110), width: 1.4 },
    { t: "rect", x: -486, y: -168, w: 92, h: 56, r: 8, fill: rgba(MARKET.awningA) },
    { t: "rect", x: -474, y: -156, w: 68, h: 14, r: 3, fill: rgba(MARKET.sign) },
    { t: "rect", x: -470, y: -186, w: 18, h: 22, r: 2, fill: rgba(MARKET.awningB) },
    { t: "rect", x: -448, y: -186, w: 18, h: 22, r: 2, fill: rgba(MARKET.awningA) },
    { t: "rect", x: -426, y: -186, w: 18, h: 22, r: 2, fill: rgba(MARKET.awningB) },
    { t: "rect", x: -388, y: -176, w: 28, h: 22, r: 4, fill: rgba(WOOD.plank) },
    { t: "rect", x: -384, y: -168, w: 20, h: 8, r: 2, fill: rgba(WOOD.highlight) },
    { t: "rect", x: -352, y: -172, w: 18, h: 16, r: 3, fill: rgba(WOOD.dark) },
    { t: "circle", x: -456, y: -128, r: 6, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: -456, y: -128, r: 14, fill: rgba(MARKET.glow, 70), tag: "lantern" },
    { t: "circle", x: -430, y: -122, r: 5, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: -430, y: -122, r: 12, fill: rgba(MARKET.glow, 50), tag: "lantern" },
    { t: "ellipse", x: -300, y: -188, rx: 10, ry: 5, fill: rgba([36, 196, 168]) },
    { t: "ellipse", x: -278, y: -184, rx: 8, ry: 4, fill: rgba([255, 168, 96]) },
    { t: "rect", x: -360, y: -168, w: 72, h: 40, r: 7, fill: rgba(MARKET.awningB) },
    { t: "rect", x: -352, y: -158, w: 56, h: 10, r: 3, fill: rgba(MARKET.sign) },
    { t: "poly", pts: [-330, -128, -318, -104, -306, -128], fill: rgba(MARKET.awningA) },
    { t: "circle", x: -324, y: -118, r: 5, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: -324, y: -118, r: 12, fill: rgba(MARKET.glow, 48), tag: "lantern" },
    { t: "ellipse", x: -250, y: -196, rx: 9, ry: 4, fill: rgba([255, 214, 96]) },
    { t: "ellipse", x: -232, y: -192, rx: 7, ry: 3.4, fill: rgba([46, 186, 168]) },
    { t: "ellipse", x: -456, y: -210, rx: 22, ry: 6, fill: rgba(MARKET.glow, 36), tag: "lantern" },
    { t: "ellipse", x: -324, y: -208, rx: 18, ry: 5, fill: rgba(MARKET.glow, 28), tag: "lantern" },
    { t: "circle", x: -400, y: -124, r: 5, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: -400, y: -124, r: 13, fill: rgba(MARKET.glow, 42), tag: "lantern" },
    softShadow(-400, -232, 140, 10, 80),
    speckleField(-530, -226, 310, 22, rgba(WOOD.grain, 70), 18, 1.2, 9, "speckle"),
    { t: "rect", x: -508, y: -196, w: 16, h: 12, r: 2, fill: rgba(WOOD.dark) },
    { t: "rect", x: -504, y: -192, w: 8, h: 6, r: 1, fill: rgba([36, 196, 168]) },
    { t: "rect", x: -488, y: -194, w: 14, h: 10, r: 2, fill: rgba(WOOD.plank) },
    { t: "ellipse", x: -478, y: -148, rx: 5, ry: 8, fill: rgba([36, 196, 168]), tag: "paraNear" },
    { t: "ellipse", x: -466, y: -146, rx: 4, ry: 7, fill: rgba([255, 168, 96]), tag: "paraNear" },
    { t: "rect", x: -420, y: -148, w: 28, h: 8, r: 2, fill: rgba(MARKET.awningA), tag: "banner" },
    { t: "circle", x: -500, y: -186, r: 3.2, fill: rgba([46, 40, 32], 200) },
    { t: "circle", x: -488, y: -184, r: 2.6, fill: rgba([72, 48, 36], 180) },
    { t: "rect", x: -502, y: -186, w: 4, h: 10, fill: rgba([28, 24, 20], 160) },
    ...lightStripOps(),
    ...fireworkOps(),
    grainField(-530, -226, 310, 22, rgba(WOOD.dark, 70), 28, 8, 53, "h", "grain"),
    washField(-486, -186, 92, 56, rgba([255, 168, 88], 28), 8, 55, "brush"),
    { t: "ellipse", x: -468, y: -136, rx: 7, ry: 3.2, fill: rgba([36, 196, 168]), tag: "hang" },
    { t: "ellipse", x: -452, y: -132, rx: 6, ry: 2.8, fill: rgba([255, 168, 96]), tag: "hang" },
    { t: "ellipse", x: -438, y: -134, rx: 5.4, ry: 2.4, fill: rgba([255, 214, 96]), tag: "hang" },
    { t: "rect", x: -344, y: -148, w: 18, h: 12, r: 2, fill: rgba(WOOD.plank), tag: "crate" },
    { t: "rect", x: -340, y: -144, w: 10, h: 4, fill: rgba(WOOD.grain), tag: "crate" },
    { t: "ellipse", x: -300, y: -154, rx: 6, ry: 9, fill: rgba([18, 36, 42], 160), tag: "vendor" },
    { t: "rect", x: -306, y: -160, w: 12, h: 10, r: 2, fill: rgba(WOOD.dark), tag: "vendor" },
    { t: "rect", x: -470, y: -176, w: 64, h: 4, fill: rgba(MARKET.awningB), tag: "stripe" },
    { t: "rect", x: -470, y: -166, w: 64, h: 4, fill: rgba(MARKET.awningA), tag: "stripe" },
  );
  return ops;
}

function gullOps(x: number, y: number, s: number): DrawOp[] {
  return [
    {
      t: "bezier",
      x1: x - 14 * s,
      y1: y,
      c1x: x - 5 * s,
      c1y: y + 7 * s,
      c2x: x + 5 * s,
      c2y: y + 7 * s,
      x2: x + 14 * s,
      y2: y,
      color: rgba([36, 24, 18], 170),
      width: 2.4,
      tag: "gull",
    },
  ];
}

export function harborAmbienceOps(look: IslandLook): DrawOp[] {
  return [
    {
      t: "ellipse",
      x: -180,
      y: 236,
      rx: 96,
      ry: 16,
      fill: rgba([255, 236, 210], 42),
      tag: "cloud",
    },
    {
      t: "ellipse",
      x: 40,
      y: 250,
      rx: 76,
      ry: 13,
      fill: rgba([255, 244, 220], 32),
      tag: "cloud",
    },
    ...gullOps(-80, 200, 1),
    ...gullOps(60, 214, 0.75),
    ...gullOps(210, 188, 0.6),
    {
      t: "ellipse",
      x: -200,
      y: -230,
      rx: 78,
      ry: 9,
      fill: rgba([255, 248, 230], 42),
      tag: "foam",
    },
    {
      t: "ellipse",
      x: -360,
      y: -238,
      rx: 56,
      ry: 7,
      fill: rgba([210, 246, 255], 32),
      tag: "foam",
    },
    {
      t: "poly",
      pts: [220, -210, 286, -196, 272, -186, 208, -200],
      fill: rgba(shade(WOOD.plank, 0.72)),
    },
    { t: "rect", x: 232, y: -198, w: 30, h: 11, r: 3, fill: rgba(WOOD.highlight) },
    { t: "poly", pts: [246, -188, 270, -166, 246, -176], fill: rgba(look.accent) },
    { t: "ellipse", x: 80, y: 220, rx: 118, ry: 18, fill: rgba([255, 232, 200], 28), tag: "cloud" },
    { t: "ellipse", x: 340, y: 242, rx: 86, ry: 13, fill: rgba([255, 244, 214], 26), tag: "cloud" },
    ...gullOps(320, 196, 0.7),
    ...gullOps(-200, 188, 0.55),
    ...foamLace(-280, -242, 220, look),
    washField(-260, 220, 220, 40, rgba([255, 244, 220], 22), 8, 69, "brush"),
    washField(-20, 236, 180, 28, rgba([255, 236, 200], 18), 6, 71, "brush"),
    ...gullOps(140, 206, 0.5),
    ...gullOps(-320, 176, 0.45),
  ];
}

/** 近景装饰：桩、网、灯笼、水草，把码头从色块抬成可上架前景。 */
export function harborForegroundOps(): DrawOp[] {
  const ops: DrawOp[] = [
    { t: "rect", x: -618, y: -320, w: 22, h: 88, r: 5, fill: rgba(WOOD.pile), tag: "paraNear" },
    { t: "rect", x: -612, y: -300, w: 6, h: 50, fill: rgba(WOOD.highlight, 110), tag: "paraNear" },
    { t: "rect", x: 520, y: -316, w: 20, h: 80, r: 5, fill: rgba(WOOD.pile), tag: "paraNear" },
    { t: "rect", x: 526, y: -298, w: 5, h: 46, fill: rgba(WOOD.highlight, 90), tag: "paraNear" },
    {
      t: "bezier",
      x1: -610,
      y1: -240,
      c1x: -520,
      c1y: -210,
      c2x: -430,
      c2y: -250,
      x2: -340,
      y2: -226,
      color: rgba(WOOD.rope, 200),
      width: 2.4,
    },
    {
      t: "poly",
      pts: [-560, -236, -500, -228, -492, -248, -552, -256],
      fill: rgba([36, 72, 78], 90),
      tag: "paraNear",
    },
    { t: "ellipse", x: -200, y: -268, rx: 18, ry: 28, fill: rgba([18, 92, 78], 120), tag: "paraNear" },
    { t: "ellipse", x: -178, y: -258, rx: 12, ry: 20, fill: rgba([28, 122, 96], 110), tag: "paraNear" },
    { t: "circle", x: -540, y: -218, r: 9, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: -540, y: -218, r: 20, fill: rgba(MARKET.glow, 48), tag: "lantern" },
    { t: "circle", x: -400, y: -210, r: 7, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: -400, y: -210, r: 16, fill: rgba(MARKET.glow, 40), tag: "lantern" },
    { t: "ellipse", x: 80, y: -250, rx: 26, ry: 6, fill: rgba([255, 248, 230], 36), tag: "foam" },
    { t: "rect", x: -580, y: -236, w: 16, h: 12, r: 2, fill: rgba(WOOD.dark), tag: "paraNear" },
    { t: "ellipse", x: -572, y: -228, rx: 5, ry: 7, fill: rgba([36, 196, 168]), tag: "hang" },
    { t: "ellipse", x: -560, y: -226, rx: 4.2, ry: 6, fill: rgba([255, 168, 96]), tag: "hang" },
    { t: "circle", x: 500, y: -248, r: 8, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: 500, y: -248, r: 16, fill: rgba(MARKET.glow, 36), tag: "lantern" },
    grainField(-618, -320, 22, 88, rgba(WOOD.highlight, 70), 12, 6, 57, "v", "grain"),
    { t: "bezier", x1: 530, y1: -250, c1x: 470, c1y: -230, c2x: 420, c2y: -260, x2: 360, y2: -236, color: rgba(WOOD.rope, 170), width: 2 },
  ];
  return ops;
}

export function dockOps(): DrawOp[] {
  const ops: DrawOp[] = [
    { t: "ellipse", x: -420, y: -252, rx: 236, ry: 18, fill: rgba(WOOD.shadow, 220) },
  ];
  for (let i = 0; i < 7; i++) {
    ops.push({
      t: "rect",
      x: -628 + i * 62,
      y: -274,
      w: 16,
      h: 50,
      r: 4,
      fill: rgba(i % 2 === 0 ? WOOD.pile : shade(WOOD.pile, 0.86)),
    });
    ops.push({
      t: "rect",
      x: -624 + i * 62,
      y: -236,
      w: 5,
      h: 22,
      fill: rgba(WOOD.highlight, 90),
    });
    ops.push({
      t: "ellipse",
      x: -620 + i * 62,
      y: -274,
      rx: 14,
      ry: 4,
      fill: rgba([210, 246, 255], 40),
      tag: "foam",
    });
  }
  push(
    ops,
    { t: "rect", x: -640, y: -232, w: 468, h: 112, r: 12, fill: rgba(WOOD.dark) },
    { t: "rect", x: -636, y: -228, w: 460, h: 104, r: 10, fill: rgba(WOOD.plank) },
    { t: "rect", x: -636, y: -228, w: 460, h: 16, r: 8, fill: rgba(WOOD.highlight) },
    { t: "rect", x: -636, y: -214, w: 460, h: 6, fill: rgba([255, 236, 180], 70), tag: "rim" },
  );
  for (let i = 0; i < 9; i++) {
    ops.push({
      t: "rect",
      x: -628 + i * 50,
      y: -210,
      w: 7,
      h: 84,
      fill: rgba(i % 3 === 0 ? WOOD.grain : shade(WOOD.grain, 0.82)),
    });
    if (i % 2 === 0) {
      ops.push({
        t: "ellipse",
        x: -610 + i * 50,
        y: -168,
        rx: 16,
        ry: 5,
        fill: rgba([72, 48, 28], 50),
      });
    }
  }
  push(
    ops,
    { t: "line", x1: -630, y1: -170, x2: -190, y2: -170, color: rgba(WOOD.dark, 210), width: 3.2 },
    { t: "line", x1: -630, y1: -194, x2: -190, y2: -194, color: rgba(WOOD.dark, 100), width: 1.8 },
    { t: "rect", x: -562, y: -188, w: 92, h: 70, r: 12, fill: rgba([22, 150, 158]) },
    { t: "rect", x: -552, y: -178, w: 72, h: 16, r: 4, fill: rgba([14, 78, 90]) },
    { t: "rect", x: -546, y: -174, w: 22, h: 8, r: 3, fill: rgba([255, 226, 140], 180) },
    { t: "rect", x: -548, y: -154, w: 64, h: 10, r: 3, fill: rgba([10, 56, 68], 160) },
    { t: "circle", x: -248, y: -146, r: 8, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: -248, y: -146, r: 3.2, fill: rgba(MARKET.sign) },
    { t: "circle", x: -248, y: -146, r: 18, fill: rgba(MARKET.glow, 55), tag: "lantern" },
    { t: "ellipse", x: -400, y: -250, rx: 90, ry: 8, fill: rgba([255, 248, 230], 40), tag: "foam" },
    { t: "circle", x: -200, y: -154, r: 6, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: -200, y: -154, r: 13, fill: rgba(MARKET.glow, 44), tag: "lantern" },
    { t: "circle", x: -320, y: -142, r: 7, fill: rgba(MARKET.lantern), tag: "lantern" },
    { t: "circle", x: -320, y: -142, r: 16, fill: rgba(MARKET.glow, 50), tag: "lantern" },
    { t: "ellipse", x: -248, y: -226, rx: 22, ry: 6, fill: rgba(MARKET.glow, 34), tag: "lantern" },
    { t: "ellipse", x: -320, y: -224, rx: 18, ry: 5, fill: rgba(MARKET.glow, 28), tag: "lantern" },
    softShadow(-420, -238, 210, 13, 110),
    speckleField(-636, -228, 460, 104, rgba(WOOD.grain, 70), 42, 1.5, 13, "speckle"),
    ...hatchStrokes(-620, -220, 430, 90, rgba(WOOD.dark, 60), 22, 1.2, 11),
    { t: "rect", x: -612, y: -146, w: 24, h: 9, r: 2, fill: rgba(MARKET.awningB), tag: "banner" },
    { t: "ellipse", x: -580, y: -250, rx: 20, ry: 6, fill: rgba([255, 248, 230], 48), tag: "foam" },
    { t: "ellipse", x: -500, y: -148, rx: 10, ry: 7, fill: rgba(WOOD.dark), tag: "paraNear" },
    { t: "ellipse", x: -486, y: -146, rx: 8, ry: 6, fill: rgba(WOOD.plank), tag: "paraNear" },
    { t: "rect", x: -240, y: -168, w: 36, h: 8, r: 2, fill: rgba(WOOD.rope) },
    { t: "bezier", x1: -240, y1: -164, c1x: -210, c1y: -150, c2x: -190, c2y: -172, x2: -168, y2: -156, color: rgba(WOOD.rope, 190), width: 2.2 },
    grainField(-636, -228, 460, 104, rgba(WOOD.dark, 95), 80, 12, 61, "h", "grain"),
    washField(-620, -210, 420, 70, rgba([255, 220, 140], 40), 18, 63, "brush"),
    { t: "circle", x: -600, y: -200, r: 1.6, fill: rgba([40, 28, 18], 200), tag: "nail" },
    { t: "circle", x: -540, y: -198, r: 1.6, fill: rgba([40, 28, 18], 200), tag: "nail" },
    { t: "circle", x: -480, y: -202, r: 1.5, fill: rgba([40, 28, 18], 190), tag: "nail" },
    { t: "circle", x: -420, y: -196, r: 1.6, fill: rgba([40, 28, 18], 200), tag: "nail" },
    { t: "circle", x: -360, y: -200, r: 1.5, fill: rgba([40, 28, 18], 190), tag: "nail" },
    { t: "ellipse", x: -560, y: -176, rx: 18, ry: 5, fill: rgba([40, 90, 110], 40), tag: "wet" },
    { t: "ellipse", x: -300, y: -168, rx: 16, ry: 4, fill: rgba([40, 90, 110], 32), tag: "wet" },
    { t: "circle", x: -630, y: -250, r: 3.2, fill: rgba([90, 72, 48], 160), tag: "barnacle" },
    { t: "circle", x: -568, y: -254, r: 2.6, fill: rgba([110, 86, 56], 150), tag: "barnacle" },
    { t: "circle", x: -250, y: -248, r: 2.8, fill: rgba([90, 72, 48], 150), tag: "barnacle" },
  );
  return ops;
}

export function boatOps(): DrawOp[] {
  return [
    { t: "ellipse", x: 4, y: -16, rx: 74, ry: 13, fill: rgba(WOOD.shadow, 170) },
    { t: "poly", pts: [48, -4, 82, 8, 58, 16, 28, 6], fill: rgba(shade(WOOD.plank, 0.92)) },
    { t: "rect", x: -64, y: -16, w: 128, h: 38, r: 16, fill: rgba(WOOD.plank) },
    { t: "rect", x: -58, y: 4, w: 116, h: 10, r: 4, fill: rgba(WOOD.highlight) },
    { t: "rect", x: -56, y: 12, w: 112, h: 7, r: 3, fill: rgba(WOOD.dark) },
    { t: "line", x1: -50, y1: -4, x2: 50, y2: -4, color: rgba(WOOD.grain, 140), width: 1.6 },
    { t: "rect", x: -18, y: 10, w: 58, h: 28, r: 8, fill: rgba([255, 228, 176]) },
    { t: "circle", x: 12, y: 24, r: 9, fill: rgba([72, 206, 220]) },
    { t: "circle", x: 14, y: 26, r: 3.4, fill: rgba([255, 252, 240], 230) },
    { t: "rect", x: -8, y: 12, w: 6, h: 48, r: 2, fill: rgba(WOOD.dark) },
    { t: "poly", pts: [-6, 58, 34, 42, -6, 32], fill: rgba([255, 148, 42]) },
    { t: "poly", pts: [-6, 56, 18, 42, -6, 38], fill: rgba([255, 226, 150], 220) },
    { t: "circle", x: -40, y: 8, r: 4, fill: rgba(MARKET.lantern) },
    { t: "rect", x: -28, y: -8, w: 16, h: 6, r: 2, fill: rgba(WOOD.rope) },
    grainField(-58, -12, 112, 32, rgba(WOOD.grain, 70), 18, 8, 65, "h", "grain"),
    { t: "rect", x: 36, y: -6, w: 10, h: 8, r: 2, fill: rgba(WOOD.dark) },
    { t: "ellipse", x: 40, y: -2, rx: 3.2, ry: 2, fill: rgba([36, 196, 168]) },
    { t: "bezier", x1: -50, y1: 10, c1x: -36, c1y: 18, c2x: -20, c2y: 6, x2: -8, y2: 14, color: rgba(WOOD.rope, 180), width: 1.8 },
  ];
}

export function crateOps(): DrawOp[] {
  return [
    { t: "ellipse", x: 0, y: -30, rx: 52, ry: 10, fill: rgba(WOOD.shadow, 160) },
    { t: "rect", x: -46, y: -28, w: 92, h: 58, r: 8, fill: rgba(WOOD.dark) },
    { t: "rect", x: -42, y: -24, w: 84, h: 46, r: 6, fill: rgba(WOOD.plank) },
    { t: "rect", x: -46, y: 12, w: 92, h: 18, r: 6, fill: rgba(WOOD.highlight) },
    { t: "rect", x: -40, y: 18, w: 80, h: 7, r: 3, fill: rgba(MARKET.sign) },
    { t: "rect", x: -36, y: -20, w: 5, h: 32, fill: rgba(WOOD.grain) },
    { t: "rect", x: -14, y: -20, w: 5, h: 32, fill: rgba(WOOD.grain) },
    { t: "rect", x: 8, y: -20, w: 5, h: 32, fill: rgba(WOOD.grain) },
    { t: "rect", x: 30, y: -20, w: 5, h: 32, fill: rgba(WOOD.grain) },
    { t: "rect", x: -40, y: -8, w: 80, h: 4, fill: rgba(WOOD.rope, 180) },
    { t: "circle", x: 0, y: 20, r: 5, fill: rgba(MARKET.lantern) },
    { t: "circle", x: 0, y: 20, r: 2, fill: rgba(MARKET.sign) },
    {
      t: "strokeRect",
      x: -46,
      y: -28,
      w: 92,
      h: 58,
      r: 8,
      color: rgba(MARKET.sign, 230),
      width: 4,
    },
    grainField(-42, -24, 84, 46, rgba(WOOD.dark, 70), 16, 7, 67, "v", "grain"),
    { t: "circle", x: -32, y: 8, r: 1.6, fill: rgba([40, 28, 18], 200), tag: "nail" },
    { t: "circle", x: 32, y: 8, r: 1.6, fill: rgba([40, 28, 18], 200), tag: "nail" },
  ];
}

function faceOps(
  s: number,
  face: FishFace,
  decoy: boolean,
  eyeX: number,
  eyeY: number,
): DrawOp[] {
  const white = decoy ? 120 : 255;
  const ops: DrawOp[] = [
    {
      t: "circle",
      x: (eyeX - 0.6) * s,
      y: (eyeY - 0.4) * s,
      r: 7.6 * s,
      fill: rgba([12, 28, 26], decoy ? 80 : 220),
      tag: "outline",
    },
    { t: "circle", x: eyeX * s, y: eyeY * s, r: 6.8 * s, fill: rgba([255, 252, 244], white), tag: "eye" },
    {
      t: "circle",
      x: (eyeX + 0.4) * s,
      y: (eyeY - 0.6) * s,
      r: 5.2 * s,
      fill: rgba([186, 236, 210], white),
      tag: "eye",
    },
  ];
  if (face === "stunned") {
    ops.push(
      { t: "circle", x: (eyeX + 0.8) * s, y: eyeY * s, r: 2.4 * s, fill: rgba([18, 28, 24], white), tag: "eye" },
      {
        t: "ellipse",
        x: (eyeX + 6) * s,
        y: (eyeY - 9) * s,
        rx: 5.4 * s,
        ry: 2.4 * s,
        fill: rgba([22, 40, 32], decoy ? 90 : 210),
      },
      {
        t: "ellipse",
        x: (eyeX + 8) * s,
        y: (eyeY - 2) * s,
        rx: 3.2 * s,
        ry: 1.4 * s,
        fill: rgba([18, 110, 96], decoy ? 70 : 180),
        tag: "mouth",
      },
    );
    return ops;
  }
  const lid = face === "carry" || face === "happy" ? 0.5 : face === "hooked" ? 1.2 : 1;
  const pupil = face === "hooked" ? 3.8 : 3.2;
  ops.push(
    {
      t: "circle",
      x: (eyeX + 2.1) * s,
      y: eyeY * s,
      r: pupil * s * lid,
      fill: rgba([18, 28, 24], white),
      tag: "eye",
    },
    {
      t: "circle",
      x: (eyeX + 3.4) * s,
      y: (eyeY + 0.4) * s,
      r: 1.05 * s,
      fill: rgba([40, 64, 52], 200),
      tag: "eye",
    },
    {
      t: "circle",
      x: (eyeX + 3.6) * s,
      y: (eyeY - 1.4) * s,
      r: 1.35 * s,
      fill: rgba([255, 255, 255], 250),
      tag: "eye",
    },
    {
      t: "circle",
      x: (eyeX + 1.2) * s,
      y: (eyeY - 2.2) * s,
      r: 0.7 * s,
      fill: rgba([255, 255, 255], 180),
      tag: "eye",
    },
  );
  if (face === "hooked") {
    ops.push(
      {
        t: "ellipse",
        x: (eyeX + 4) * s,
        y: (eyeY - 11) * s,
        rx: 4.6 * s,
        ry: 3.4 * s,
        fill: rgba([36, 48, 44], decoy ? 90 : 230),
      },
      {
        t: "ellipse",
        x: (eyeX + 10) * s,
        y: (eyeY - 3) * s,
        rx: 3.6 * s,
        ry: 1.8 * s,
        fill: rgba([16, 86, 74], decoy ? 80 : 210),
        tag: "mouth",
      },
    );
  } else if (face === "carry" || face === "happy") {
    ops.push(
      {
        t: "ellipse",
        x: (eyeX + 4) * s,
        y: (eyeY - 8) * s,
        rx: 4.2 * s,
        ry: 1.5 * s,
        fill: rgba([22, 40, 32], decoy ? 90 : 210),
      },
      {
        t: "ellipse",
        x: (eyeX + 6) * s,
        y: (eyeY - 13) * s,
        rx: 5.4 * s,
        ry: 2.6 * s,
        fill: rgba([22, 48, 40], decoy ? 80 : 210),
      },
      {
        t: "ellipse",
        x: (eyeX + 9) * s,
        y: (eyeY - 4) * s,
        rx: 4.2 * s,
        ry: 1.6 * s,
        fill: rgba([20, 120, 102], decoy ? 70 : 200),
        tag: "mouth",
      },
    );
  } else {
    ops.push(
      {
        t: "ellipse",
        x: (eyeX + 4) * s,
        y: (eyeY - 11) * s,
        rx: 4.4 * s,
        ry: 2.2 * s,
        fill: rgba([22, 40, 32], decoy ? 90 : 220),
        tag: "lid",
      },
      {
        t: "ellipse",
        x: (eyeX + 9) * s,
        y: (eyeY - 3) * s,
        rx: 3.4 * s,
        ry: 1.3 * s,
        fill: rgba([18, 110, 96], decoy ? 70 : 190),
        tag: "mouth",
      },
    );
  }
  return ops;
}

export function fishBodyOps(
  id: string,
  scale: number,
  decoy: boolean,
  armored: boolean,
  face: FishFace = "idle",
): DrawOp[] {
  const look = fishLook(id);
  const s = scale;
  const body = tintDecoy(look.body, decoy);
  const belly = tintDecoy(look.belly, decoy);
  const accent = tintDecoy(look.accent, decoy);
  const kind = look.silhouette;
  if (kind === "eel") {
    return [
      { t: "ellipse", x: -28 * s, y: -4 * s, rx: 22 * s, ry: 9 * s, fill: rgba(accent) },
      { t: "ellipse", x: -6 * s, y: 0, rx: 24 * s, ry: 11 * s, fill: rgba(body) },
      { t: "ellipse", x: 18 * s, y: 2 * s, rx: 20 * s, ry: 10 * s, fill: rgba(belly) },
      grainField(-24 * s, -6 * s, 50 * s, 14 * s, rgba(shade(accent, 0.8), 80), 8, 4 * s, 75, "h", "grain"),
      { t: "ellipse", x: 2 * s, y: 2 * s, rx: 5 * s, ry: 2.4 * s, fill: rgba(mix(belly, accent, 0.3), 140), tag: "scale" },
      ...faceOps(s, face, decoy, 30, 3),
    ];
  }
  if (kind === "ray") {
    return [
      { t: "poly", pts: [22 * s, 4 * s, -8 * s, 36 * s, -28 * s, 4 * s, -8 * s, -28 * s], fill: rgba(body) },
      { t: "ellipse", x: 8 * s, y: 2 * s, rx: 16 * s, ry: 10 * s, fill: rgba(belly) },
      { t: "poly", pts: [-24 * s, 2 * s, -52 * s, 8 * s, -52 * s, -4 * s], fill: rgba(accent) },
      ...faceOps(s, face, decoy, 16, 4),
    ];
  }
  if (kind === "whale") {
    return [
      { t: "ellipse", x: 4 * s, y: 0, rx: 48 * s, ry: 22 * s, fill: rgba(body) },
      { t: "ellipse", x: 10 * s, y: -8 * s, rx: 36 * s, ry: 12 * s, fill: rgba(belly) },
      { t: "poly", pts: [-36 * s, 0, -72 * s, 22 * s, -72 * s, -22 * s], fill: rgba(accent) },
      { t: "poly", pts: [6 * s, 18 * s, 18 * s, 34 * s, 22 * s, 16 * s], fill: rgba(accent) },
      ...faceOps(s, face, decoy, 28, 6),
    ];
  }
  if (kind === "ribbon") {
    return [
      { t: "ellipse", x: 8 * s, y: 0, rx: 38 * s, ry: 10 * s, fill: rgba(body) },
      { t: "ellipse", x: 16 * s, y: -3 * s, rx: 22 * s, ry: 6 * s, fill: rgba(belly) },
      { t: "poly", pts: [-28 * s, 0, -70 * s, 16 * s, -58 * s, 0, -70 * s, -16 * s], fill: rgba(accent) },
      ...faceOps(s, face, decoy, 36, 2),
    ];
  }
  if (kind === "pod") {
    return [
      { t: "ellipse", x: 0, y: 0, rx: 28 * s, ry: 22 * s, fill: rgba(body) },
      { t: "ellipse", x: 4 * s, y: -6 * s, rx: 18 * s, ry: 12 * s, fill: rgba(belly) },
      { t: "circle", x: -6 * s, y: 8 * s, r: 5 * s, fill: rgba(accent) },
      { t: "circle", x: 8 * s, y: 10 * s, r: 4 * s, fill: rgba(accent) },
      ...faceOps(s, face, decoy, 10, 4),
    ];
  }
  if (kind === "sail") {
    return [
      { t: "poly", pts: [-6 * s, 8 * s, 8 * s, 48 * s, 22 * s, 8 * s], fill: rgba(accent) },
      { t: "ellipse", x: 2 * s, y: -2 * s, rx: 30 * s, ry: 14 * s, fill: rgba(body) },
      { t: "ellipse", x: 8 * s, y: -6 * s, rx: 20 * s, ry: 8 * s, fill: rgba(belly) },
      { t: "poly", pts: [-26 * s, 0, -52 * s, 14 * s, -52 * s, -14 * s], fill: rgba(body) },
      ...faceOps(s, face, decoy, 22, 2),
    ];
  }
  if (kind === "jaw") {
    const ops: DrawOp[] = [
      { t: "ellipse", x: 0, y: 0, rx: 34 * s, ry: 20 * s, fill: rgba(body) },
      { t: "ellipse", x: 8 * s, y: -8 * s, rx: 22 * s, ry: 10 * s, fill: rgba(belly) },
      { t: "ellipse", x: 22 * s, y: -4 * s, rx: 16 * s, ry: 12 * s, fill: rgba(accent) },
      { t: "poly", pts: [18 * s, -12 * s, 40 * s, -6 * s, 22 * s, 2 * s], fill: rgba(accent) },
      { t: "poly", pts: [-28 * s, 0, -50 * s, 16 * s, -50 * s, -16 * s], fill: rgba(body) },
      ...faceOps(s, face, decoy, 20, 4),
    ];
    if (armored) {
      ops.push({
        t: "ellipse",
        x: 4 * s,
        y: 4 * s,
        rx: 22 * s,
        ry: 16 * s,
        fill: rgba([210, 176, 110], 230),
      });
    }
    return ops;
  }
  if (kind === "shell") {
    const ops: DrawOp[] = [
      { t: "ellipse", x: 0, y: 0, rx: 32 * s, ry: 20 * s, fill: rgba(belly) },
      { t: "ellipse", x: 4 * s, y: 6 * s, rx: 24 * s, ry: 16 * s, fill: rgba(body) },
      { t: "ellipse", x: -8 * s, y: 8 * s, rx: 16 * s, ry: 12 * s, fill: rgba(accent) },
      { t: "ellipse", x: 12 * s, y: 10 * s, rx: 14 * s, ry: 12 * s, fill: rgba(accent) },
      { t: "poly", pts: [-24 * s, 0, -44 * s, 12 * s, -44 * s, -12 * s], fill: rgba(accent) },
      ...faceOps(s, face, decoy, 18, 0),
    ];
    if (armored) {
      ops.push({
        t: "ellipse",
        x: 6 * s,
        y: 4 * s,
        rx: 20 * s,
        ry: 16 * s,
        fill: rgba([230, 196, 120], 240),
      });
    }
    return ops;
  }
  if (kind === "hopper") {
    return [
      { t: "ellipse", x: 4 * s, y: 0, rx: 28 * s, ry: 16 * s, fill: rgba(body) },
      { t: "ellipse", x: 10 * s, y: -6 * s, rx: 18 * s, ry: 9 * s, fill: rgba(belly) },
      { t: "poly", pts: [4 * s, 10 * s, 18 * s, 28 * s, 20 * s, 8 * s], fill: rgba(accent) },
      { t: "poly", pts: [-22 * s, 2 * s, -48 * s, 18 * s, -40 * s, 0, -48 * s, -16 * s], fill: rgba(body) },
      ...faceOps(s, face, decoy, 22, 2),
    ];
  }
  return [
    { t: "ellipse", x: 2 * s, y: -12 * s, rx: 44 * s, ry: 12 * s, fill: rgba(WOOD.shadow, decoy ? 50 : 110) },
    {
      t: "ellipse",
      x: 6 * s,
      y: 2 * s,
      rx: 40 * s,
      ry: 21 * s,
      fill: rgba([10, 36, 34], decoy ? 70 : 200),
      tag: "outline",
    },
    { t: "poly", pts: [-24 * s, 0, -72 * s, -22 * s, -54 * s, 0, -72 * s, 22 * s], fill: rgba(shade(accent, 0.72)), tag: "outline" },
    { t: "poly", pts: [-24 * s, 0, -68 * s, -20 * s, -52 * s, 0, -68 * s, 20 * s], fill: rgba(accent), tag: "tail" },
    { t: "poly", pts: [-40 * s, -4 * s, -62 * s, -12 * s, -50 * s, -2 * s], fill: rgba([255, 236, 170], decoy ? 40 : 90), tag: "rim" },
    { t: "poly", pts: [8 * s, 8 * s, 30 * s, 40 * s, 36 * s, 6 * s], fill: rgba(shade(accent, 0.75)), tag: "outline" },
    { t: "poly", pts: [8 * s, 8 * s, 28 * s, 36 * s, 34 * s, 6 * s], fill: rgba(accent) },
    { t: "poly", pts: [16 * s, 18 * s, 26 * s, 30 * s, 28 * s, 12 * s], fill: rgba([255, 236, 180], decoy ? 40 : 80), tag: "rim" },
    { t: "poly", pts: [6 * s, -6 * s, -2 * s, -34 * s, 20 * s, -8 * s], fill: rgba(shade(body, 0.78)), tag: "outline" },
    { t: "poly", pts: [6 * s, -6 * s, 0, -30 * s, 18 * s, -8 * s], fill: rgba(body) },
    { t: "ellipse", x: 6 * s, y: 2 * s, rx: 36 * s, ry: 18 * s, fill: rgba(body) },
    { t: "ellipse", x: 16 * s, y: 8 * s, rx: 22 * s, ry: 10 * s, fill: rgba(belly) },
    {
      t: "ellipse",
      x: 14 * s,
      y: 8 * s,
      rx: 14 * s,
      ry: 5 * s,
      fill: rgba([255, 252, 236], decoy ? 40 : 90),
      tag: "rim",
    },
    {
      t: "ellipse",
      x: 18 * s,
      y: -2 * s,
      rx: 8 * s,
      ry: 5 * s,
      fill: rgba([255, 168, 140], decoy ? 80 : 170),
    },
    {
      t: "bezier",
      x1: -8 * s,
      y1: 4 * s,
      c1x: 6 * s,
      c1y: 14 * s,
      c2x: 18 * s,
      c2y: 12 * s,
      x2: 28 * s,
      y2: 4 * s,
      color: rgba(shade(accent, 0.7)),
      width: 3.2,
    },
    {
      t: "ellipse",
      x: 4 * s,
      y: 8 * s,
      rx: 7.4 * s,
      ry: 4.2 * s,
      fill: rgba(accent, decoy ? 80 : 200),
      tag: "scale",
    },
    {
      t: "ellipse",
      x: -6 * s,
      y: 6 * s,
      rx: 6.4 * s,
      ry: 3.6 * s,
      fill: rgba(mix(body, [255, 236, 140], 0.35), decoy ? 70 : 170),
      tag: "scale",
    },
    {
      t: "ellipse",
      x: 12 * s,
      y: 1 * s,
      rx: 5.4 * s,
      ry: 3.2 * s,
      fill: rgba(mix(belly, accent, 0.45), decoy ? 60 : 160),
      tag: "scale",
    },
    {
      t: "ellipse",
      x: 22 * s,
      y: 5 * s,
      rx: 5.2 * s,
      ry: 2.8 * s,
      fill: rgba(mix(belly, [255, 252, 236], 0.4), decoy ? 50 : 140),
      tag: "scale",
    },
    {
      t: "ellipse",
      x: -2 * s,
      y: -2 * s,
      rx: 5.4 * s,
      ry: 3 * s,
      fill: rgba(mix(body, accent, 0.3), decoy ? 50 : 140),
      tag: "scale",
    },
    {
      t: "ellipse",
      x: -14 * s,
      y: 3 * s,
      rx: 5 * s,
      ry: 2.6 * s,
      fill: rgba(mix(body, [255, 226, 140], 0.25), decoy ? 40 : 120),
      tag: "scale",
    },
    {
      t: "ellipse",
      x: 8 * s,
      y: -4 * s,
      rx: 4.6 * s,
      ry: 2.4 * s,
      fill: rgba([255, 248, 210], decoy ? 40 : 110),
      tag: "scale",
    },
    {
      t: "ellipse",
      x: 18 * s,
      y: 9 * s,
      rx: 4.8 * s,
      ry: 2.4 * s,
      fill: rgba(mix(belly, [255, 252, 236], 0.35), decoy ? 40 : 130),
      tag: "scale",
    },
    {
      t: "ellipse",
      x: -10 * s,
      y: -1 * s,
      rx: 4.4 * s,
      ry: 2.2 * s,
      fill: rgba(mix(body, accent, 0.25), decoy ? 40 : 120),
      tag: "scale",
    },
    {
      t: "ellipse",
      x: 26 * s,
      y: -1 * s,
      rx: 3.8 * s,
      ry: 2 * s,
      fill: rgba([255, 236, 180], decoy ? 30 : 100),
      tag: "scale",
    },
    grainField(-18 * s, -8 * s, 48 * s, 20 * s, rgba(shade(accent, 0.8), decoy ? 40 : 90), 14, 4 * s, 73, "diag", "grain"),
    { t: "line", x1: 10 * s, y1: 10 * s, x2: 26 * s, y2: 30 * s, color: rgba(shade(accent, 0.7), decoy ? 60 : 140), width: 1.2 },
    { t: "line", x1: 14 * s, y1: 8 * s, x2: 30 * s, y2: 26 * s, color: rgba([255, 236, 180], decoy ? 40 : 90), width: 1 },
    { t: "ellipse", x: 24 * s, y: 6 * s, rx: 3.2 * s, ry: 5 * s, fill: rgba(shade(body, 0.72), decoy ? 50 : 150), tag: "gill" },
    {
      t: "ellipse",
      x: 10 * s,
      y: 4 * s,
      rx: 20 * s,
      ry: 10 * s,
      fill: rgba([90, 230, 214], decoy ? 28 : 52),
      tag: "refract",
    },
    {
      t: "ellipse",
      x: 24 * s,
      y: 2 * s,
      rx: 9 * s,
      ry: 4.4 * s,
      fill: rgba([160, 255, 240], decoy ? 20 : 42),
      tag: "refract",
    },
    {
      t: "ellipse",
      x: 0,
      y: -6 * s,
      rx: 16 * s,
      ry: 3.2 * s,
      fill: rgba([8, 48, 44], decoy ? 50 : 140),
    },
    ...faceOps(s, face, decoy, 30, 1),
  ];
}

export function fishOps(
  id: string,
  scale: number,
  state: {
    decoy: boolean;
    armored: boolean;
    hit: boolean;
    hooked: boolean;
    flashing: boolean;
    face?: FishFace;
  },
): DrawOp[] {
  const look = fishLook(id);
  const s = scale;
  const face = state.face ?? (state.hooked ? "hooked" : state.hit ? "stunned" : "idle");
  const ops: DrawOp[] = [];
  if (state.hooked) {
    ops.push({
      t: "ring",
      x: 0,
      y: 0,
      r: 58 * s,
      color: rgba([255, 210, 90], 230),
      width: 4,
    });
  }
  ops.push(...fishBodyOps(id, s, state.decoy, state.armored, face));
  if (state.hit) {
    ops.push({
      t: "ring",
      x: 0,
      y: 0,
      r: 42 * s,
      color: rgba([255, 255, 255], 230),
      width: 6,
    });
  }
  const glow = state.flashing ? ([255, 255, 120] as Rgb) : ([255, 245, 150] as Rgb);
  ops.push(
    {
      t: "circle",
      x: look.weakX * s,
      y: look.weakY * s,
      r: (state.flashing ? 16 : 11) * s,
      fill: rgba(glow, state.flashing ? 255 : 230),
      tag: "weak",
    },
    {
      t: "circle",
      x: look.weakX * s,
      y: look.weakY * s,
      r: (state.flashing ? 24 : 18) * s,
      fill: rgba([255, 236, 120], state.flashing ? 70 : 40),
      tag: "weak",
    },
    {
      t: "ring",
      x: look.weakX * s,
      y: look.weakY * s,
      r: (state.flashing ? 22 : 15) * s,
      color: rgba([255, 255, 255], state.flashing ? 255 : 230),
      width: state.flashing ? 5 : 3.4,
    },
  );
  return ops;
}

/** 砸甲板静帧：星爆 + 裂纹 + 扬尘，一眼能读出拍子。 */
export function slamMarkOps(x = 0, y = 0): DrawOp[] {
  return [
    { t: "ellipse", x, y: y - 4, rx: 132, ry: 38, fill: rgba([48, 28, 14], 110), tag: "slam" },
    { t: "ellipse", x, y: y + 2, rx: 104, ry: 26, fill: rgba([168, 108, 52], 160), tag: "slam" },
    { t: "ellipse", x, y: y + 8, rx: 70, ry: 16, fill: rgba([230, 176, 96], 130), tag: "slam" },
    { t: "burst", x, y: y + 22, r: 58, spikes: 9, fill: rgba([255, 236, 150], 220), tag: "burst" },
    { t: "burst", x, y: y + 22, r: 30, spikes: 7, fill: rgba([255, 158, 42], 240), tag: "burst" },
    { t: "ring", x, y: y + 10, r: 78, color: rgba([255, 236, 180], 230), width: 8 },
    { t: "ring", x, y: y + 10, r: 46, color: rgba([255, 210, 110], 190), width: 4 },
    { t: "line", x1: x - 86, y1: y + 6, x2: x - 18, y2: y + 18, color: rgba([40, 22, 10], 210), width: 3.2 },
    { t: "line", x1: x + 20, y1: y + 16, x2: x + 92, y2: y + 4, color: rgba([40, 22, 10], 200), width: 3 },
    { t: "line", x1: x - 10, y1: y + 2, x2: x + 8, y2: y - 28, color: rgba([28, 16, 8], 190), width: 2.6 },
    { t: "line", x1: x - 36, y1: y - 6, x2: x - 8, y2: y + 22, color: rgba([28, 16, 8], 170), width: 2.2 },
    { t: "line", x1: x + 14, y1: y - 8, x2: x + 40, y2: y + 20, color: rgba([28, 16, 8], 160), width: 2 },
    washField(x - 90, y - 8, 180, 36, rgba([186, 132, 64], 70), 12, 81, "brush"),
    grainField(x - 80, y - 4, 160, 28, rgba([72, 44, 20], 90), 20, 10, 83, "diag", "grain"),
    { t: "ellipse", x: x - 70, y: y + 10, rx: 28, ry: 12, fill: rgba([168, 118, 58], 90), tag: "dust" },
    { t: "ellipse", x: x + 72, y: y + 8, rx: 26, ry: 11, fill: rgba([168, 118, 58], 80), tag: "dust" },
    { t: "ellipse", x: x - 40, y: y + 16, rx: 18, ry: 8, fill: rgba([230, 186, 110], 70), tag: "dust" },
    { t: "ellipse", x: x + 44, y: y + 14, rx: 16, ry: 7, fill: rgba([230, 186, 110], 60), tag: "dust" },
  ];
}

export function islandSetOps(
  islandId: string,
  harbor: boolean,
  phase = 0,
): DrawOp[] {
  const look = islandLook(islandId, harbor);
  const ops = [...skyWaterOps(look, phase)];
  if (harbor) {
    ops.push(
      ...sunOps(420, 250, look),
      ...farRidgeOps(look),
      ...farBoatOps(),
      ...foamIsleOps(-160, 70, 1.48, islandLook("island_foam_bay")),
      ...prismIsleOps(170, 74, 1.38, islandLook("island_prism_reef")),
      ...stormIsleOps(470, 68, 1.22, islandLook("island_storm_eye")),
      ...pierMarketOps(look),
      ...harborAmbienceOps(look),
      ...harborForegroundOps(),
    );
    return ops;
  }
  if (islandId === "island_prism_reef") {
    ops.push(
      ...sunOps(-480, 240, look),
      ...huntWaterOps(look, phase),
      ...prismIsleOps(360, 86, 1.15, look),
      ...prismIsleOps(-390, 80, 0.7, look),
    );
    return ops;
  }
  if (islandId === "island_storm_eye") {
    ops.push(
      { t: "circle", x: 500, y: 250, r: 28, fill: rgba(look.haze, 160) },
      ...huntWaterOps(look, phase),
      ...stormIsleOps(340, 78, 1.2, look),
      ...foamIsleOps(-430, 70, 0.55, islandLook("island_foam_bay")),
    );
    return ops;
  }
  ops.push(
    ...sunOps(460, 248, look),
    ...huntWaterOps(look, phase),
    ...foamIsleOps(380, 86, 1.68, look),
    ...foamIsleOps(-420, 78, 1.18, look),
    ...harborForegroundOps(),
  );
  return ops;
}

export function speckleDots(op: {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  size: number;
  seed?: number;
}): Array<{ x: number; y: number; r: number }> {
  const seed = op.seed ?? 1;
  const dots: Array<{ x: number; y: number; r: number }> = [];
  for (let i = 0; i < op.count; i++) {
    const n = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    const u = n - Math.floor(n);
    const m = Math.sin((i + 3) * 4.1414 + seed * 19.19) * 23421.196;
    const v = m - Math.floor(m);
    dots.push({
      x: op.x + u * op.w,
      y: op.y + v * op.h,
      r: op.size * (0.65 + 0.7 * u),
    });
  }
  return dots;
}

export function recipeHasTag(ops: DrawOp[], tag: string): boolean {
  return ops.some((op) => "tag" in op && op.tag === tag);
}

export function recipeTagCount(ops: DrawOp[], tag: string): number {
  return ops.filter((op) => "tag" in op && op.tag === tag).length;
}

export function recipeKindCount(ops: DrawOp[], kind: DrawOp["t"]): number {
  return ops.filter((op) => op.t === kind).length;
}
