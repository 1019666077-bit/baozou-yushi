/**
 * 代理插画层：程序化市集/浪脊/天光，统一休闲钓鱼皮。
 * 自绘，不引用外部立绘。2D/辅助 ≠ Creator 3D。
 * 色块必须在 1280 缩略图里一眼能读，禁止再叠一层看不见的淡噪点。
 */

export function makeGrain(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  const img = g.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const u = n - Math.floor(n);
    const v = 62 + u * 160;
    img.data[i] = v;
    img.data[i + 1] = v * 0.9;
    img.data[i + 2] = v * 0.74;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return canvas;
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

function wave(ctx, y, amp, phase, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let x = 0; x <= 1280; x += 14) {
    const yy = y + Math.sin(x * 0.011 + phase) * amp + Math.sin(x * 0.029 + phase * 1.4) * amp * 0.38;
    if (x === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
}

function foamCrest(ctx, y, phase, alpha) {
  ctx.fillStyle = `rgba(255,248,230,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, y + 10);
  for (let x = 0; x <= 1280; x += 18) {
    const yy = y + Math.sin(x * 0.018 + phase) * 7 + Math.sin(x * 0.041 + phase * 1.7) * 3;
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(1280, y + 16);
  ctx.lineTo(0, y + 16);
  ctx.closePath();
  ctx.fill();
}

/** 水面活物：浪脊、焦散、鱼影。猎场更近、更实。 */
export function paintWaterLife(ctx, phase, hunt) {
  const lift = hunt ? 22 : 0;
  foamCrest(ctx, 304 + lift, phase, hunt ? 0.2 : 0.14);
  foamCrest(ctx, 368 + lift, phase * 1.1 + 0.8, hunt ? 0.16 : 0.1);
  foamCrest(ctx, 448 + lift, phase * 0.85 + 1.4, 0.08);
  wave(ctx, 318 + lift, 6, phase, "rgba(255,244,210,0.55)", 4.2);
  wave(ctx, 356 + lift, 8, phase * 1.15 + 0.6, "rgba(210,246,255,0.42)", 3.2);
  wave(ctx, 410 + lift, 11, phase * 0.8 + 1.1, "rgba(255,248,230,0.28)", 2.8);
  wave(ctx, 470 + lift, 13, phase * 1.3, "rgba(8,40,64,0.38)", 4);
  wave(ctx, 540 + lift, 9, phase * 0.7 + 2, "rgba(210,246,255,0.22)", 2.6);
  const drift = Math.sin(phase) * 22;
  const caustics = hunt
    ? [
        [180 + drift, 380, 130, 18],
        [420 - drift * 0.6, 420, 160, 22],
        [720 + drift * 0.4, 390, 120, 16],
        [980 - drift, 450, 140, 18],
        [560 + drift * 0.3, 510, 90, 12],
        [300 - drift * 0.4, 540, 80, 10],
        [860 + drift * 0.2, 530, 100, 13],
      ]
    : [
        [220 + drift, 400, 110, 16],
        [520 - drift * 0.6, 440, 140, 18],
        [860 + drift * 0.4, 480, 100, 14],
        [380 - drift, 520, 80, 11],
        [1040 - drift * 0.2, 500, 96, 12],
      ];
  for (const [x, y, rx, ry] of caustics) {
    ellipse(ctx, x, y + lift, rx, ry, "rgba(170,240,255,0.22)");
  }
  const shadows = hunt
    ? [
        [760, 400, 48, 14],
        [900, 450, 30, 9],
        [820, 520, 24, 8],
        [640, 480, 22, 7],
        [1080, 430, 36, 11],
        [480, 500, 18, 6],
      ]
    : [
        [700, 430, 34, 10],
        [880, 500, 24, 8],
        [980, 390, 20, 7],
        [560, 470, 16, 6],
      ];
  for (const [x, y, rx, ry] of shadows) {
    ellipse(ctx, x + drift * 0.4, y + lift, rx, ry, "rgba(6,28,40,0.42)");
  }
  if (hunt) {
    ctx.fillStyle = "rgba(10, 72, 64, 0.35)";
    for (let i = 0; i < 7; i += 1) {
      const x = 190 + i * 46;
      ctx.beginPath();
      ctx.moveTo(x, 620);
      ctx.quadraticCurveTo(x + Math.sin(phase + i) * 10, 560, x + 6, 500 + (i % 3) * 16);
      ctx.lineTo(x + 14, 500 + (i % 3) * 16);
      ctx.quadraticCurveTo(x + 18, 570, x + 12, 620);
      ctx.fill();
    }
  }
  for (let i = 0; i < 26; i += 1) {
    const x = (i * 137 + phase * 48) % 1280;
    const y = 340 + ((i * 53) % 230) + lift + Math.sin(phase + i) * 7;
    ellipse(ctx, x, y, 2.2 + (i % 3), 1.4, `rgba(255,248,220,${0.28 + (i % 4) * 0.08})`);
  }
}

function hut(ctx, x, y, w, h, roof, wall) {
  roundBox(ctx, x, y, w, h, 4, wall);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 4);
  ctx.lineTo(x + w / 2, y - h * 0.45);
  ctx.lineTo(x + w + 8, y + 4);
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, x + w * 0.32, y + h * 0.42, 4, 5, "rgba(255,210,96,0.85)");
}

/** 近景码头加厚：木桩、灯笼、摊位、挂鱼。让左岸读得出市集。 */
export function paintNearPier(ctx, phase, harbor) {
  if (!harbor) {
    ellipse(ctx, 210, 575, 130, 18, "rgba(8,24,36,0.45)");
    roundBox(ctx, 40, 548, 210, 28, 8, "#6a3c1c");
    ctx.fillStyle = "rgba(236,184,104,0.55)";
    ctx.fillRect(46, 552, 198, 6);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = "#4a2c16";
      ctx.fillRect(58 + i * 40, 528, 12, 28);
    }
    return;
  }
  ellipse(ctx, 210, 610, 220, 22, "rgba(6,20,32,0.5)");
  ctx.fillStyle = "#3a2210";
  for (let i = 0; i < 7; i += 1) {
    const x = 18 + i * 48;
    ctx.fillRect(x, 478, 18, 128);
    ctx.fillStyle = "rgba(236,184,104,0.42)";
    ctx.fillRect(x + 4, 488, 5, 86);
    ctx.fillStyle = "#3a2210";
    ellipse(ctx, x + 9, 478, 16, 6, "rgba(210,246,255,0.28)");
  }
  roundBox(ctx, 8, 500, 340, 102, 12, "#c47e3a");
  ctx.fillStyle = "rgba(255,214,130,0.7)";
  ctx.fillRect(14, 506, 328, 16);
  ctx.fillStyle = "rgba(92,56,28,0.5)";
  for (let i = 0; i < 10; i += 1) ctx.fillRect(22 + i * 32, 526, 6, 68);
  ctx.fillStyle = "#d64e30";
  ctx.fillRect(28, 430, 108, 64);
  ctx.fillStyle = "#ffc658";
  ctx.fillRect(36, 438, 92, 14);
  ctx.fillStyle = "#e07028";
  ctx.fillRect(148, 444, 86, 50);
  ctx.fillStyle = "#ffe27a";
  ctx.fillRect(156, 450, 70, 10);
  ctx.fillStyle = "#2a8a86";
  ctx.fillRect(248, 452, 72, 44);
  ctx.fillStyle = "#9be7c8";
  ctx.fillRect(256, 458, 56, 8);
  const flicker = 0.62 + 0.38 * Math.sin(phase * 5.2);
  ellipse(ctx, 82, 418, 22, 22, `rgba(255,214,118,${0.42 * flicker})`);
  ellipse(ctx, 82, 418, 8, 8, "#ffa838");
  ellipse(ctx, 190, 432, 16, 16, `rgba(255,214,118,${0.32 * flicker})`);
  ellipse(ctx, 190, 432, 6, 6, "#ffa838");
  ellipse(ctx, 284, 440, 14, 14, `rgba(255,214,118,${0.28 * flicker})`);
  ellipse(ctx, 284, 440, 5, 5, "#ffa838");
  const hang = [
    [54, 518, "#24c4a8"],
    [76, 522, "#ffa060"],
    [96, 516, "#ffd660"],
    [118, 520, "#3ad0b0"],
    [168, 524, "#ff8a40"],
    [190, 518, "#ffe27a"],
    [214, 522, "#2ab4a0"],
    [260, 520, "#ffb060"],
  ];
  for (const [x, y, color] of hang) {
    ctx.strokeStyle = "rgba(60,36,16,0.7)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x, y);
    ctx.stroke();
    ellipse(ctx, x, y + 4, 8, 5, color);
  }
  hut(ctx, 980, 478, 54, 42, "#d64e30", "#e8b06a");
  hut(ctx, 1044, 486, 46, 36, "#2a8a86", "#d4a060");
  hut(ctx, 1098, 472, 58, 48, "#c45a28", "#e0aa62");
  ellipse(ctx, 210, 598, 90, 12, "rgba(255,248,230,0.22)");
}

export function paintSkyBloom(ctx, phase, harbor) {
  if (!harbor) {
    const dusk = ctx.createLinearGradient(0, 0, 0, 220);
    dusk.addColorStop(0, "rgba(255,140,64,0.28)");
    dusk.addColorStop(1, "rgba(255,140,64,0)");
    ctx.fillStyle = dusk;
    ctx.fillRect(0, 0, 1280, 240);
  }
  const sunX = harbor ? 1040 : 168;
  const sunY = harbor ? 108 : 88;
  for (let i = 0; i < 7; i += 1) {
    const a = -0.7 + i * 0.22;
    ctx.strokeStyle = `rgba(255,186,72,${harbor ? 0.16 : 0.12})`;
    ctx.lineWidth = 10 - i;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(sunX + Math.cos(a) * 420, sunY + Math.sin(a) * 260);
    ctx.stroke();
  }
  ellipse(ctx, sunX, sunY, 160, 52, "rgba(255,168,72,0.32)");
  ellipse(ctx, sunX, sunY, 62, 62, "rgba(255,228,150,0.7)");
  ellipse(ctx, sunX + 10, sunY + 8, 18, 18, "rgba(255,252,236,0.92)");
  ellipse(ctx, 260 + Math.sin(phase * 0.3) * 22, 82, 140, 28, "rgba(255,236,210,0.32)");
  ellipse(ctx, 430 + Math.sin(phase * 0.25) * 16, 64, 100, 20, "rgba(255,244,220,0.26)");
  ellipse(ctx, 820, 76, 120, 22, "rgba(255,232,200,0.2)");
  ellipse(ctx, 600, 54, 80, 16, "rgba(255,248,230,0.16)");
}

/** 港心空出来的海面：远舟、浮标、飞鸟，让中屏不再是空渐变。 */
export function paintBayTraffic(ctx, phase, harbor) {
  const drift = Math.sin(phase * 0.7) * 10;
  const boats = harbor
    ? [
        [560 + drift, 338, 46, 1],
        [720 - drift * 0.6, 352, 34, 0.85],
        [430 + drift * 0.4, 364, 28, 0.7],
      ]
    : [
        [980 + drift, 330, 40, 0.9],
        [1100 - drift, 360, 26, 0.7],
      ];
  for (const [x, y, w, s] of boats) {
    ellipse(ctx, x, y + 8, w * 0.7, 6 * s, "rgba(8,24,36,0.35)");
    ctx.fillStyle = "#1c2834";
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w * 0.7, y + 10 * s);
    ctx.lineTo(x - w * 0.72, y + 10 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f0c040";
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x - 4, y - 22 * s);
    ctx.lineTo(x + 18 * s, y - 8 * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(36,24,18,0.55)";
  ctx.lineWidth = 2.2;
  for (const [x, y] of [
    [300 + drift, 96],
    [480, 78],
    [640 - drift, 110],
    [860, 88],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.quadraticCurveTo(x, y - 8, x + 14, y);
    ctx.stroke();
  }
  if (harbor) {
    for (const [x, y] of [
      [610, 410],
      [780, 430],
      [500, 450],
    ]) {
      ellipse(ctx, x, y, 7, 7, "#d64e30");
      ellipse(ctx, x, y, 3, 3, "#ffe27a");
      ellipse(ctx, x, y + 10, 10, 3, "rgba(8,28,40,0.25)");
    }
  }
}

export function paintFinish(ctx, grain, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.38;
  ctx.drawImage(grain, 0, 0, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.28;
  const warmth = ctx.createLinearGradient(0, 0, 0, h);
  warmth.addColorStop(0, "rgba(255,176,80,0.62)");
  warmth.addColorStop(0.42, "rgba(255,220,150,0.1)");
  warmth.addColorStop(1, "rgba(8,40,64,0.4)");
  ctx.fillStyle = warmth;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.46, 140, w * 0.5, h * 0.52, 780);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(6,10,18,0.5)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

export function paintChargeAura(ctx, sx, sy, charge, quality) {
  const sweet = quality === "sweet";
  const rings = sweet ? 4 : 3;
  for (let i = rings; i >= 1; i -= 1) {
    const r = 22 + charge * 28 + i * 16;
    ctx.strokeStyle = sweet
      ? `rgba(255,154,26,${0.18 + i * 0.08})`
      : quality === "late"
        ? `rgba(200,208,214,${0.1 + i * 0.05})`
        : `rgba(255,226,122,${0.12 + i * 0.06})`;
    ctx.lineWidth = sweet ? 4 : 2.4;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ellipse(
    ctx,
    sx,
    sy,
    32 + charge * 40,
    (32 + charge * 40) * 0.55,
    sweet ? "rgba(255,154,26,0.28)" : "rgba(255,226,122,0.18)",
  );
  ellipse(
    ctx,
    sx,
    sy,
    12 + charge * 10,
    12 + charge * 10,
    sweet ? "rgba(255,236,150,0.55)" : "rgba(255,248,220,0.32)",
  );
}
