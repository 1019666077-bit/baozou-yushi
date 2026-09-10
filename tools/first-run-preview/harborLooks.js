/**
 * 港口背景备选：海边鱼市，不要淹没楼影。
 * 仅 2D 代理自绘。2D/辅助 ≠ Creator 3D。
 */

export const HARBOR_LOOKS = [
  { id: "noon", name: "晴朗午前", blurb: "蓝天、绿岛、浅水" },
  { id: "peach", name: "桃霞晚港", blurb: "粉霞、暖村、金水" },
  { id: "mist", name: "雾青海湾", blurb: "薄雾、远山、静水" },
  { id: "lantern", name: "灯火渔市", blurb: "夜色、灯火、倒影" },
];

export const DEFAULT_HARBOR_LOOK = "peach";
const LOOK_KEY = "baozou-harbor-look";

export function readHarborLook() {
  try {
    const saved = localStorage.getItem(LOOK_KEY);
    if (HARBOR_LOOKS.some((look) => look.id === saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_HARBOR_LOOK;
}

export function writeHarborLook(id) {
  try {
    localStorage.setItem(LOOK_KEY, id);
  } catch {
    /* ignore */
  }
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundBox(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

function sky(ctx, stops, y0 = 0, y1 = 340) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, 1280, y1 - y0);
}

function sun(ctx, x, y, r, glow, core, spark) {
  ellipse(ctx, x, y, r * 2.4, r * 0.72, glow);
  ellipse(ctx, x, y, r, r, core);
  if (spark) ellipse(ctx, x + r * 0.18, y + r * 0.12, r * 0.28, r * 0.28, spark);
}

function cloud(ctx, x, y, s, color) {
  ellipse(ctx, x, y, 46 * s, 16 * s, color);
  ellipse(ctx, x - 28 * s, y + 4 * s, 28 * s, 12 * s, color);
  ellipse(ctx, x + 30 * s, y + 3 * s, 26 * s, 12 * s, color);
  ellipse(ctx, x + 8 * s, y - 8 * s, 22 * s, 10 * s, color);
}

function hill(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

function pine(ctx, x, y, h, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + h * 0.38, y);
  ctx.lineTo(x - h * 0.38, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(70, 42, 22, 0.85)";
  ctx.fillRect(x - 3, y, 6, h * 0.18);
}

function roofHouse(ctx, x, y, w, h, wall, roof, window) {
  roundBox(ctx, x, y, w, h, 3, wall);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 7, y + 3);
  ctx.lineTo(x + w / 2, y - h * 0.55);
  ctx.lineTo(x + w + 7, y + 3);
  ctx.closePath();
  ctx.fill();
  if (window) ellipse(ctx, x + w * 0.35, y + h * 0.42, 4, 5, window);
}

function sailboat(ctx, x, y, s, hull, sail) {
  ellipse(ctx, x, y + 8 * s, 22 * s, 5 * s, "rgba(8,24,36,0.28)");
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(x - 28 * s, y);
  ctx.lineTo(x + 30 * s, y);
  ctx.lineTo(x + 20 * s, y + 10 * s);
  ctx.lineTo(x - 22 * s, y + 10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(40,28,18,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 2, y);
  ctx.lineTo(x - 2, y - 26 * s);
  ctx.stroke();
  ctx.fillStyle = sail;
  ctx.beginPath();
  ctx.moveTo(x - 1, y - 2);
  ctx.lineTo(x - 1, y - 26 * s);
  ctx.lineTo(x + 18 * s, y - 8 * s);
  ctx.closePath();
  ctx.fill();
}

function gull(ctx, x, y, s = 1) {
  ctx.strokeStyle = "rgba(36,32,40,0.55)";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y);
  ctx.quadraticCurveTo(x, y - 7 * s, x + 12 * s, y);
  ctx.stroke();
}

function waveY(x, y, amp, phase) {
  return y + Math.sin(x * 0.011 + phase) * amp + Math.sin(x * 0.027 + phase * 1.3) * amp * 0.4;
}

function waterBand(ctx, yTop, yBot, amp, phase, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, waveY(0, yTop, amp, phase));
  for (let x = 12; x <= 1280; x += 12) ctx.lineTo(x, waveY(x, yTop, amp, phase));
  for (let x = 1280; x >= 0; x -= 12) ctx.lineTo(x, waveY(x, yBot, amp * 0.45, phase + 0.8));
  ctx.closePath();
  ctx.fill();
}

function sparkle(ctx, phase, y0, y1, n, color) {
  for (let i = 0; i < n; i += 1) {
    const x = (i * 137 + phase * 42) % 1280;
    const y = y0 + ((i * 53) % (y1 - y0)) + Math.sin(phase + i) * 5;
    ellipse(ctx, x, y, 2.2 + (i % 3), 1.4, color);
  }
}

function villageCluster(ctx, x, y, wall, roof, window, trees) {
  roofHouse(ctx, x, y, 38, 28, wall, roof, window);
  roofHouse(ctx, x + 42, y + 8, 30, 22, wall, roof, window);
  roofHouse(ctx, x + 78, y + 2, 36, 30, wall, roof, window);
  pine(ctx, x - 16, y + 22, 34, trees);
  pine(ctx, x + 124, y + 18, 28, trees);
}

function paintNoon(ctx, phase) {
  sky(ctx, [
    [0, "#8fd4ff"],
    [0.42, "#c8eefc"],
    [1, "#fff4cc"],
  ]);
  sun(ctx, 980, 92, 54, "rgba(255,236,150,0.45)", "#fff2a8", "#fffdf4");
  cloud(ctx, 220 + Math.sin(phase * 0.2) * 10, 78, 1.2, "rgba(255,255,255,0.82)");
  cloud(ctx, 470, 58, 0.9, "rgba(255,252,246,0.7)");
  cloud(ctx, 760, 70, 1.05, "rgba(255,255,255,0.62)");
  hill(ctx, [0, 318, 180, 248, 340, 278, 520, 236, 720, 268, 920, 242, 1280, 270, 1280, 340, 0, 340], "#7eb8c8");
  hill(ctx, [0, 328, 220, 268, 430, 292, 640, 258, 880, 286, 1280, 262, 1280, 348, 0, 348], "#5a9e7a");
  hill(ctx, [0, 338, 160, 300, 380, 318, 620, 292, 900, 312, 1280, 300, 1280, 360, 0, 360], "#3f8868");
  pine(ctx, 430, 292, 42, "#2f6a4c");
  pine(ctx, 468, 298, 34, "#2a7454");
  pine(ctx, 860, 286, 38, "#2f6a4c");
  villageCluster(ctx, 980, 286, "#f0d2a0", "#d45a3a", "rgba(255,224,120,0.9)", "#2a6a4c");
  villageCluster(ctx, 86, 300, "#ead0a0", "#2a8a86", "rgba(255,224,120,0.8)", "#2a6a4c");
  waterBand(ctx, 318, 390, 10, phase, "rgba(110, 220, 230, 0.7)");
  waterBand(ctx, 368, 470, 14, phase + 0.4, "rgba(46, 176, 196, 0.62)");
  waterBand(ctx, 448, 560, 16, phase + 0.9, "rgba(20, 124, 158, 0.58)");
  waterBand(ctx, 530, 720, 12, phase + 1.4, "rgba(12, 78, 118, 0.55)");
  ellipse(ctx, 980, 360, 160, 18, "rgba(255,248,200,0.28)");
  sparkle(ctx, phase, 340, 560, 28, "rgba(255,252,230,0.55)");
}

function paintPeach(ctx, phase) {
  sky(ctx, [
    [0, "#ff9a7a"],
    [0.28, "#ffb89a"],
    [0.62, "#ffd4b4"],
    [1, "#ffe8d0"],
  ]);
  sun(ctx, 1020, 118, 62, "rgba(255,180,110,0.42)", "#ffe0a8", "#fff6e4");
  cloud(ctx, 240, 86, 1.15, "rgba(255,236,220,0.55)");
  cloud(ctx, 520, 64, 0.85, "rgba(255,244,230,0.42)");
  cloud(ctx, 780, 78, 1, "rgba(255,228,210,0.38)");
  hill(ctx, [0, 312, 200, 250, 420, 276, 640, 238, 880, 266, 1280, 248, 1280, 340, 0, 340], "#8a7aa8");
  hill(ctx, [0, 328, 240, 278, 500, 300, 760, 268, 1040, 292, 1280, 276, 1280, 352, 0, 348], "#6e6a8a");
  hill(ctx, [0, 340, 180, 304, 460, 322, 780, 298, 1100, 318, 1280, 308, 1280, 368, 0, 360], "#4a5a72");
  villageCluster(ctx, 520, 278, "#f2c090", "#e07048", "rgba(255,210,120,0.95)", "#3a5a4a");
  villageCluster(ctx, 108, 296, "#e8b888", "#c45a38", "rgba(255,200,96,0.9)", "#3a5a4a");
  pine(ctx, 700, 292, 36, "#355848");
  pine(ctx, 736, 300, 28, "#2f5040");
  waterBand(ctx, 316, 392, 11, phase, "rgba(255, 176, 128, 0.38)");
  waterBand(ctx, 372, 468, 15, phase + 0.5, "rgba(56, 148, 168, 0.5)");
  waterBand(ctx, 452, 560, 16, phase + 1.0, "rgba(28, 96, 132, 0.52)");
  waterBand(ctx, 536, 720, 12, phase + 1.5, "rgba(14, 52, 88, 0.5)");
  ellipse(ctx, 1020, 368, 190, 22, "rgba(255,200,120,0.32)");
  sparkle(ctx, phase, 338, 540, 26, "rgba(255,236,190,0.5)");
}

function paintMist(ctx, phase) {
  sky(ctx, [
    [0, "#d7e6f4"],
    [0.45, "#c4d8e8"],
    [1, "#e8f0f6"],
  ]);
  sun(ctx, 240, 96, 36, "rgba(255,248,230,0.28)", "rgba(255,252,246,0.7)", "rgba(255,255,255,0.85)");
  cloud(ctx, 400, 70, 1.4, "rgba(255,255,255,0.55)");
  cloud(ctx, 680, 88, 1.6, "rgba(236,244,252,0.5)");
  cloud(ctx, 980, 64, 1.2, "rgba(236,244,250,0.42)");
  hill(ctx, [0, 300, 220, 236, 460, 262, 700, 228, 980, 250, 1280, 240, 1280, 340, 0, 340], "rgba(150, 176, 196, 0.7)");
  hill(ctx, [0, 322, 260, 270, 520, 292, 800, 262, 1100, 284, 1280, 270, 1280, 352, 0, 348], "rgba(118, 168, 176, 0.78)");
  hill(ctx, [0, 338, 200, 304, 480, 324, 820, 304, 1280, 314, 1280, 368, 0, 360], "#6a9aa0");
  ellipse(ctx, 640, 318, 640, 22, "rgba(236, 246, 252, 0.45)");
  villageCluster(ctx, 900, 292, "#d8c8b0", "#a86858", "rgba(255,236,200,0.55)", "#4a7068");
  villageCluster(ctx, 40, 308, "#d4c4ac", "#8a6a58", "rgba(255,236,200,0.45)", "#4a7068");
  pine(ctx, 390, 300, 40, "#4a7064");
  pine(ctx, 430, 308, 30, "#40685c");
  waterBand(ctx, 318, 396, 8, phase, "rgba(186, 216, 222, 0.7)");
  waterBand(ctx, 376, 478, 12, phase + 0.4, "rgba(118, 176, 186, 0.55)");
  waterBand(ctx, 456, 568, 14, phase + 0.9, "rgba(64, 128, 148, 0.5)");
  waterBand(ctx, 540, 720, 10, phase + 1.3, "rgba(36, 88, 112, 0.48)");
  sparkle(ctx, phase, 350, 520, 18, "rgba(255,255,255,0.4)");
}

function paintLantern(ctx, phase) {
  sky(ctx, [
    [0, "#12183a"],
    [0.4, "#243060"],
    [0.72, "#3a4478"],
    [1, "#5a4a72"],
  ]);
  for (let i = 0; i < 36; i += 1) {
    const x = (i * 197) % 1280;
    const y = 20 + ((i * 73) % 210);
    ellipse(ctx, x, y, 1.4, 1.4, `rgba(255,248,220,${0.35 + (i % 4) * 0.12})`);
  }
  sun(ctx, 200, 88, 28, "rgba(230,236,255,0.22)", "#f2f4ff", "#ffffff");
  hill(ctx, [0, 308, 240, 244, 500, 272, 760, 238, 1040, 260, 1280, 250, 1280, 340, 0, 340], "#1c2848");
  hill(ctx, [0, 328, 280, 276, 560, 300, 860, 270, 1280, 286, 1280, 352, 0, 348], "#243050");
  hill(ctx, [0, 342, 220, 312, 560, 328, 920, 308, 1280, 322, 1280, 370, 0, 360], "#2a3858");
  villageCluster(ctx, 500, 276, "#3a3048", "#c45a38", "rgba(255,186,80,0.95)", "#243848");
  villageCluster(ctx, 80, 296, "#403848", "#d46a3a", "rgba(255,170,64,0.9)", "#243848");
  villageCluster(ctx, 1000, 286, "#383044", "#e07040", "rgba(255,196,90,0.95)", "#243848");
  const flicker = 0.55 + 0.45 * Math.sin(phase * 4.6);
  for (const [x, y] of [
    [118, 312],
    [162, 318],
    [538, 292],
    [580, 300],
    [1040, 304],
    [1088, 310],
  ]) {
    ellipse(ctx, x, y, 16, 10, `rgba(255,170,64,${0.22 * flicker})`);
    ellipse(ctx, x, y, 4, 4, `rgba(255,220,120,${0.85 * flicker})`);
    ellipse(ctx, x, y + 48, 22, 6, `rgba(255,170,64,${0.16 * flicker})`);
  }
  waterBand(ctx, 316, 396, 10, phase, "rgba(90, 80, 130, 0.55)");
  waterBand(ctx, 376, 478, 14, phase + 0.5, "rgba(36, 70, 120, 0.55)");
  waterBand(ctx, 456, 568, 16, phase + 1.0, "rgba(16, 42, 82, 0.58)");
  waterBand(ctx, 540, 720, 12, phase + 1.4, "rgba(8, 22, 48, 0.6)");
  sparkle(ctx, phase, 340, 520, 22, "rgba(255,210,120,0.42)");
}

function paintTraffic(ctx, phase, lookId) {
  const drift = Math.sin(phase * 0.7) * 10;
  const boats =
    lookId === "lantern"
      ? [
          [560 + drift, 348, 0.95, "#1c2030", "#f0b040"],
          [740 - drift * 0.5, 362, 0.75, "#161820", "#f8d878"],
        ]
      : lookId === "mist"
        ? [
            [580 + drift, 350, 0.9, "#2a3844", "#e8eef4"],
            [820 - drift * 0.4, 364, 0.7, "#243038", "#dce8f0"],
          ]
        : [
            [560 + drift, 346, 1, "#1c2834", "#f4f0e4"],
            [730 - drift * 0.6, 360, 0.82, "#243040", "#fff6d0"],
            [430 + drift * 0.35, 372, 0.68, "#1a242c", "#ffe9a8"],
          ];
  for (const [x, y, s, hull, sail] of boats) sailboat(ctx, x, y, s, hull, sail);
  gull(ctx, 300 + drift, 96, 1);
  gull(ctx, 480, 78, 0.85);
  gull(ctx, 640 - drift, 110, 1.05);
  gull(ctx, 860, 88, 0.8);
}

export function paintHarborBackdrop(ctx, phase, lookId) {
  if (lookId === "noon") paintNoon(ctx, phase);
  else if (lookId === "mist") paintMist(ctx, phase);
  else if (lookId === "lantern") paintLantern(ctx, phase);
  else paintPeach(ctx, phase);
  paintTraffic(ctx, phase, lookId);
}

export function paintHarborFinish(ctx, grain, w, h, lookId) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = lookId === "lantern" ? 0.22 : 0.26;
  ctx.drawImage(grain, 0, 0, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.28;
  const warmth = ctx.createLinearGradient(0, 0, 0, h);
  if (lookId === "noon") {
    warmth.addColorStop(0, "rgba(180, 230, 255, 0.45)");
    warmth.addColorStop(0.45, "rgba(255, 244, 200, 0.12)");
    warmth.addColorStop(1, "rgba(8, 60, 88, 0.28)");
  } else if (lookId === "mist") {
    warmth.addColorStop(0, "rgba(220, 236, 248, 0.5)");
    warmth.addColorStop(0.5, "rgba(186, 214, 222, 0.1)");
    warmth.addColorStop(1, "rgba(36, 72, 92, 0.28)");
  } else if (lookId === "lantern") {
    warmth.addColorStop(0, "rgba(40, 48, 96, 0.4)");
    warmth.addColorStop(0.5, "rgba(255, 160, 80, 0.08)");
    warmth.addColorStop(1, "rgba(8, 12, 28, 0.5)");
  } else {
    warmth.addColorStop(0, "rgba(255, 176, 120, 0.42)");
    warmth.addColorStop(0.45, "rgba(255, 220, 180, 0.1)");
    warmth.addColorStop(1, "rgba(16, 40, 64, 0.32)");
  }
  ctx.fillStyle = warmth;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.48, 160, w * 0.5, h * 0.52, 760);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, lookId === "lantern" ? "rgba(4,8,18,0.46)" : "rgba(6,12,20,0.28)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}
