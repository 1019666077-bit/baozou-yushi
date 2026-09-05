import {
  fishLook,
  islandLook,
  type IslandLook,
  type Rgb,
} from "./GrayLook";

/** 0–255；a 省略则实心。坐标与 Runtime Graphics 一致：原点居中、Y 向上。 */
export type Rgba = readonly [number, number, number, number?];

export type FishFace = "idle" | "hooked" | "stunned" | "carry";

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
    }
  | { t: "poly"; pts: number[]; fill: Rgba }
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
};

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

export function skyWaterOps(look: IslandLook, phase = 0): DrawOp[] {
  const ops: DrawOp[] = [
    { t: "rect", x: -640, y: 200, w: 1280, h: 320, fill: rgba(look.skyTop) },
    { t: "rect", x: -640, y: 110, w: 1280, h: 110, fill: rgba(look.sky) },
    { t: "rect", x: -640, y: 36, w: 1280, h: 78, fill: rgba(look.far) },
    { t: "rect", x: -640, y: -36, w: 1280, h: 82, fill: rgba(look.mid) },
    { t: "rect", x: -640, y: -176, w: 1280, h: 148, fill: rgba(look.near) },
    { t: "rect", x: -640, y: -360, w: 1280, h: 196, fill: rgba(look.deep) },
  ];
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
  return ops;
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
      t: "poly",
      pts: [x, y + 34 * s, x - 28 * s, y + 16 * s, x - 6 * s, y + 26 * s],
      fill: rgba(look.landDark),
    },
    {
      t: "poly",
      pts: [x, y + 36 * s, x + 28 * s, y + 14 * s, x + 6 * s, y + 26 * s],
      fill: rgba(look.accent),
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
      x: x - 4 * s,
      y: y - 4 * s,
      w: 8 * s,
      h: 12 * s,
      r: 2,
      fill: rgba(WOOD.dark),
    },
    { t: "circle", x: x + 8 * s, y: y + 6 * s, r: 2.4 * s, fill: rgba(MARKET.glow) },
  ];
}

export function foamIsleOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  return [
    { t: "ellipse", x, y, rx: 90 * s, ry: 22 * s, fill: rgba(look.deep, 150) },
    {
      t: "ellipse",
      x,
      y: y + 6 * s,
      rx: 80 * s,
      ry: 20 * s,
      fill: rgba(look.landDark, 220),
    },
    { t: "ellipse", x, y: y + 16 * s, rx: 72 * s, ry: 18 * s, fill: rgba(look.land) },
    {
      t: "ellipse",
      x: x + 12 * s,
      y: y + 24 * s,
      rx: 26 * s,
      ry: 12 * s,
      fill: rgba(look.landDark),
    },
    {
      t: "ellipse",
      x: x - 10 * s,
      y: y + 12 * s,
      rx: 18 * s,
      ry: 5 * s,
      fill: rgba([255, 248, 214], 100),
    },
    ...palmOps(x - 24 * s, y + 12 * s, s, look),
    ...palmOps(x + 22 * s, y + 10 * s, 0.7 * s, look),
    ...hutOps(x + 2 * s, y + 8 * s, s * 0.88, look),
  ];
}

export function prismIsleOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  return [
    { t: "ellipse", x, y, rx: 72 * s, ry: 16 * s, fill: rgba(look.landDark, 160) },
    {
      t: "poly",
      pts: [x - 42 * s, y + 6 * s, x - 8 * s, y + 56 * s, x + 18 * s, y + 6 * s],
      fill: rgba(look.land),
    },
    {
      t: "poly",
      pts: [x - 6 * s, y + 6 * s, x + 16 * s, y + 64 * s, x + 36 * s, y + 6 * s],
      fill: rgba(look.accent),
    },
    {
      t: "poly",
      pts: [x + 8 * s, y + 6 * s, x + 42 * s, y + 38 * s, x + 54 * s, y + 6 * s],
      fill: rgba(look.landDark),
    },
    {
      t: "ellipse",
      x: x + 8 * s,
      y: y + 28 * s,
      rx: 8 * s,
      ry: 4 * s,
      fill: rgba([255, 248, 220], 70),
    },
  ];
}

export function stormIsleOps(x: number, y: number, s: number, look: IslandLook): DrawOp[] {
  return [
    { t: "ellipse", x, y, rx: 90 * s, ry: 20 * s, fill: rgba(look.landDark, 200) },
    {
      t: "poly",
      pts: [x - 50 * s, y + 4 * s, x, y + 60 * s, x + 50 * s, y + 4 * s],
      fill: rgba(look.land),
    },
    {
      t: "poly",
      pts: [x - 18 * s, y + 38 * s, x, y + 74 * s, x + 18 * s, y + 38 * s],
      fill: rgba(look.landDark),
    },
    { t: "ellipse", x, y: y + 60 * s, rx: 12 * s, ry: 6 * s, fill: rgba(look.accent) },
    {
      t: "ellipse",
      x: x + 6 * s,
      y: y + 82 * s,
      rx: 16 * s,
      ry: 10 * s,
      fill: rgba(look.haze, 140),
    },
    {
      t: "ellipse",
      x: x + 20 * s,
      y: y + 96 * s,
      rx: 20 * s,
      ry: 8 * s,
      fill: rgba(look.haze, 80),
    },
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
    { t: "circle", x: -456, y: -128, r: 6, fill: rgba(MARKET.lantern) },
    { t: "circle", x: -456, y: -128, r: 14, fill: rgba(MARKET.glow, 70) },
    { t: "circle", x: -430, y: -122, r: 5, fill: rgba(MARKET.lantern) },
    { t: "circle", x: -430, y: -122, r: 12, fill: rgba(MARKET.glow, 50) },
    { t: "ellipse", x: -300, y: -188, rx: 10, ry: 5, fill: rgba([36, 196, 168]) },
    { t: "ellipse", x: -278, y: -184, rx: 8, ry: 4, fill: rgba([255, 168, 96]) },
  );
  return ops;
}

export function dockOps(): DrawOp[] {
  const ops: DrawOp[] = [
    { t: "ellipse", x: -420, y: -250, rx: 220, ry: 16, fill: rgba(WOOD.shadow, 210) },
  ];
  for (let i = 0; i < 6; i++) {
    ops.push({
      t: "rect",
      x: -620 + i * 68,
      y: -268,
      w: 14,
      h: 44,
      r: 3,
      fill: rgba(WOOD.pile),
    });
  }
  push(
    ops,
    { t: "rect", x: -640, y: -230, w: 460, h: 108, r: 14, fill: rgba(WOOD.plank) },
    { t: "rect", x: -640, y: -230, w: 460, h: 18, r: 10, fill: rgba(WOOD.highlight) },
  );
  for (let i = 0; i < 8; i++) {
    ops.push({
      t: "rect",
      x: -628 + i * 54,
      y: -214,
      w: 6,
      h: 82,
      fill: rgba(WOOD.grain),
    });
  }
  push(
    ops,
    { t: "line", x1: -630, y1: -172, x2: -200, y2: -172, color: rgba(WOOD.dark, 200), width: 3 },
    { t: "line", x1: -630, y1: -196, x2: -200, y2: -196, color: rgba(WOOD.dark, 90), width: 1.6 },
    { t: "rect", x: -560, y: -186, w: 88, h: 68, r: 12, fill: rgba([28, 168, 176]) },
    { t: "rect", x: -550, y: -176, w: 68, h: 18, r: 4, fill: rgba([16, 86, 98]) },
    { t: "rect", x: -542, y: -172, w: 20, h: 8, r: 3, fill: rgba([255, 226, 140], 170) },
    { t: "circle", x: -248, y: -148, r: 7, fill: rgba(MARKET.lantern) },
    { t: "circle", x: -248, y: -148, r: 3, fill: rgba(MARKET.sign) },
    { t: "circle", x: -248, y: -148, r: 16, fill: rgba(MARKET.glow, 50) },
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
    { t: "circle", x: eyeX * s, y: eyeY * s, r: 6.4 * s, fill: rgba([255, 252, 244], white) },
  ];
  if (face === "stunned") {
    ops.push(
      { t: "circle", x: (eyeX + 0.6) * s, y: eyeY * s, r: 2.2 * s, fill: rgba([18, 28, 24], white) },
      {
        t: "ellipse",
        x: (eyeX + 6) * s,
        y: (eyeY - 8) * s,
        rx: 5 * s,
        ry: 2.2 * s,
        fill: rgba([22, 40, 32], decoy ? 90 : 200),
      },
    );
    return ops;
  }
  const lid = face === "carry" ? 0.55 : face === "hooked" ? 1.15 : 1;
  const pupil = face === "hooked" ? 3.6 : 3;
  ops.push(
    {
      t: "circle",
      x: (eyeX + 2) * s,
      y: eyeY * s,
      r: pupil * s * lid,
      fill: rgba([18, 28, 24], white),
    },
    {
      t: "circle",
      x: (eyeX + 3.2) * s,
      y: (eyeY - 1.2) * s,
      r: 1.15 * s,
      fill: rgba([255, 255, 255], 240),
    },
  );
  if (face === "hooked") {
    ops.push({
      t: "ellipse",
      x: (eyeX + 4) * s,
      y: (eyeY - 10) * s,
      rx: 4.2 * s,
      ry: 3.2 * s,
      fill: rgba([36, 48, 44], decoy ? 90 : 230),
    });
  } else if (face === "carry") {
    ops.push({
      t: "ellipse",
      x: (eyeX + 4) * s,
      y: (eyeY - 8) * s,
      rx: 4 * s,
      ry: 1.4 * s,
      fill: rgba([22, 40, 32], decoy ? 90 : 210),
    });
  } else {
    ops.push({
      t: "ellipse",
      x: (eyeX + 4) * s,
      y: (eyeY - 10) * s,
      rx: 4 * s,
      ry: 2 * s,
      fill: rgba([22, 40, 32], decoy ? 90 : 220),
    });
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
    { t: "ellipse", x: 2 * s, y: -10 * s, rx: 40 * s, ry: 10 * s, fill: rgba(WOOD.shadow, decoy ? 50 : 90) },
    { t: "poly", pts: [-24 * s, 0, -68 * s, -20 * s, -52 * s, 0, -68 * s, 20 * s], fill: rgba(accent) },
    { t: "poly", pts: [8 * s, 8 * s, 28 * s, 36 * s, 34 * s, 6 * s], fill: rgba(accent) },
    { t: "poly", pts: [6 * s, -6 * s, 0, -30 * s, 18 * s, -8 * s], fill: rgba(body) },
    { t: "ellipse", x: 6 * s, y: 2 * s, rx: 36 * s, ry: 18 * s, fill: rgba(body) },
    { t: "ellipse", x: 16 * s, y: 8 * s, rx: 22 * s, ry: 10 * s, fill: rgba(belly) },
    {
      t: "ellipse",
      x: 14 * s,
      y: 6 * s,
      rx: 10 * s,
      ry: 4 * s,
      fill: rgba([255, 252, 236], decoy ? 40 : 70),
    },
    {
      t: "ellipse",
      x: 18 * s,
      y: -2 * s,
      rx: 8 * s,
      ry: 5 * s,
      fill: rgba([255, 168, 140], decoy ? 80 : 160),
    },
    {
      t: "bezier",
      x1: -6 * s,
      y1: 2 * s,
      c1x: 8 * s,
      c1y: 12 * s,
      c2x: 20 * s,
      c2y: 10 * s,
      x2: 26 * s,
      y2: 3 * s,
      color: rgba(accent),
      width: 2.4,
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
      r: (state.flashing ? 11 : 5) * s,
      fill: rgba(glow),
    },
    {
      t: "ring",
      x: look.weakX * s,
      y: look.weakY * s,
      r: (state.flashing ? 16 : 10) * s,
      color: rgba([255, 255, 255], state.flashing ? 255 : 220),
      width: state.flashing ? 5 : 3,
    },
  );
  return ops;
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
      ...foamIsleOps(-160, 78, 1, islandLook("island_foam_bay")),
      ...prismIsleOps(170, 82, 1, islandLook("island_prism_reef")),
      ...stormIsleOps(470, 76, 0.85, islandLook("island_storm_eye")),
      ...pierMarketOps(look),
    );
    return ops;
  }
  if (islandId === "island_prism_reef") {
    ops.push(
      ...sunOps(-480, 240, look),
      ...prismIsleOps(360, 86, 1.15, look),
      ...prismIsleOps(-390, 80, 0.7, look),
    );
    return ops;
  }
  if (islandId === "island_storm_eye") {
    ops.push(
      { t: "circle", x: 500, y: 250, r: 28, fill: rgba(look.haze, 160) },
      ...stormIsleOps(340, 78, 1.2, look),
      ...foamIsleOps(-430, 70, 0.55, islandLook("island_foam_bay")),
    );
    return ops;
  }
  ops.push(
    ...sunOps(460, 248, look),
    ...foamIsleOps(380, 80, 1.1, look),
    ...foamIsleOps(-420, 74, 0.7, look),
  );
  return ops;
}

export function recipeHasTag(ops: DrawOp[], tag: string): boolean {
  return ops.some((op) => "tag" in op && op.tag === tag);
}

export function recipeKindCount(ops: DrawOp[], kind: DrawOp["t"]): number {
  return ops.filter((op) => op.t === kind).length;
}
