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

function waveY(x, y, amp, phase) {
  return y + Math.sin(x * 0.011 + phase) * amp + Math.sin(x * 0.029 + phase * 1.4) * amp * 0.38;
}

function wave(ctx, y, amp, phase, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let x = 0; x <= 1280; x += 12) {
    const yy = waveY(x, y, amp, phase);
    if (x === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
}

function fillWaveBand(ctx, yTop, yBot, amp, phase, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, waveY(0, yTop, amp, phase));
  for (let x = 12; x <= 1280; x += 12) ctx.lineTo(x, waveY(x, yTop, amp, phase));
  for (let x = 1280; x >= 0; x -= 12) ctx.lineTo(x, waveY(x, yBot, amp * 0.5, phase + 0.9));
  ctx.closePath();
  ctx.fill();
}

function foamCrest(ctx, y, phase, alpha) {
  ctx.fillStyle = `rgba(255,248,230,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, y + 12);
  for (let x = 0; x <= 1280; x += 16) {
    const yy = y + Math.sin(x * 0.018 + phase) * 8 + Math.sin(x * 0.041 + phase * 1.7) * 3.4;
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(1280, y + 18);
  ctx.lineTo(0, y + 18);
  ctx.closePath();
  ctx.fill();
}

function ridgePair(ctx, y, amp, phase, hi, lo, wHi, wLo) {
  wave(ctx, y, amp, phase, hi, wHi);
  wave(ctx, y + 8, amp * 0.86, phase + 0.22, lo, wLo);
}

/** 水面活物：浪脊、焦散、深度色带、泡沫。猎场必须一眼不是平直水带。 */
export function paintWaterLife(ctx, phase, hunt) {
  const lift = hunt ? 18 : 0;
  if (hunt) {
    fillWaveBand(ctx, 292 + lift, 336 + lift, 8, phase, "rgba(186, 236, 248, 0.38)");
    fillWaveBand(ctx, 328 + lift, 412 + lift, 12, phase + 0.4, "rgba(28, 148, 176, 0.42)");
    fillWaveBand(ctx, 400 + lift, 508 + lift, 16, phase + 0.9, "rgba(12, 92, 128, 0.46)");
    fillWaveBand(ctx, 492 + lift, 640 + lift, 13, phase + 1.4, "rgba(6, 42, 68, 0.5)");
    fillWaveBand(ctx, 600 + lift, 740, 10, phase + 1.8, "rgba(4, 24, 42, 0.42)");
  } else {
    fillWaveBand(ctx, 308, 358, 7, phase, "rgba(24, 158, 178, 0.3)");
    fillWaveBand(ctx, 348, 438, 10, phase + 0.5, "rgba(10, 116, 148, 0.34)");
    fillWaveBand(ctx, 428, 538, 12, phase + 1.0, "rgba(8, 78, 112, 0.38)");
    fillWaveBand(ctx, 520, 680, 9, phase + 1.5, "rgba(4, 32, 52, 0.36)");
  }
  foamCrest(ctx, 300 + lift, phase, hunt ? 0.36 : 0.16);
  foamCrest(ctx, 348 + lift, phase * 1.1 + 0.7, hunt ? 0.28 : 0.12);
  foamCrest(ctx, 412 + lift, phase * 0.85 + 1.3, hunt ? 0.2 : 0.09);
  foamCrest(ctx, 478 + lift, phase * 0.7 + 2.1, hunt ? 0.14 : 0.06);
  ridgePair(ctx, 314 + lift, 7, phase, "rgba(255,248,230,0.78)", "rgba(8,40,64,0.42)", hunt ? 5.2 : 3.6, 3.2);
  ridgePair(ctx, 368 + lift, 10, phase * 1.12 + 0.5, "rgba(210,246,255,0.62)", "rgba(6,32,52,0.38)", hunt ? 4.4 : 3, 2.8);
  ridgePair(ctx, 428 + lift, 13, phase * 0.82 + 1.1, "rgba(255,244,210,0.48)", "rgba(8,48,72,0.34)", hunt ? 3.8 : 2.6, 2.6);
  ridgePair(ctx, 498 + lift, 12, phase * 1.25 + 0.3, "rgba(170,236,255,0.4)", "rgba(4,24,40,0.4)", hunt ? 3.4 : 2.4, 3);
  if (hunt) {
    ridgePair(ctx, 560 + lift, 9, phase * 0.7 + 1.8, "rgba(255,248,230,0.28)", "rgba(4,20,36,0.36)", 3, 2.8);
  }
  const drift = Math.sin(phase) * 22;
  const caustics = hunt
    ? [
        [160 + drift, 372, 150, 20],
        [400 - drift * 0.6, 418, 180, 24],
        [700 + drift * 0.4, 386, 140, 18],
        [960 - drift, 446, 160, 20],
        [540 + drift * 0.3, 508, 110, 14],
        [280 - drift * 0.4, 548, 96, 12],
        [840 + drift * 0.2, 534, 120, 15],
        [80 + drift * 0.15, 460, 90, 12],
        [1120 - drift * 0.25, 400, 100, 13],
        [620 + drift * 0.5, 360, 80, 11],
        [200 - drift * 0.2, 500, 70, 10],
        [760 + drift * 0.1, 580, 88, 11],
      ]
    : [
        [220 + drift, 400, 110, 16],
        [520 - drift * 0.6, 440, 140, 18],
        [860 + drift * 0.4, 480, 100, 14],
        [380 - drift, 520, 80, 11],
        [1040 - drift * 0.2, 500, 96, 12],
      ];
  for (const [x, y, rx, ry] of caustics) {
    ellipse(ctx, x, y + lift, rx, ry, hunt ? "rgba(170,240,255,0.34)" : "rgba(170,240,255,0.22)");
  }
  if (hunt) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [x, y, rx, ry] of caustics.slice(0, 6)) {
      ellipse(ctx, x + 18, y + lift + 6, rx * 0.45, ry * 0.55, "rgba(210,250,255,0.16)");
    }
    ctx.restore();
  }
  const shadows = hunt
    ? [
        [760, 400, 52, 15],
        [900, 450, 34, 10],
        [820, 520, 26, 8],
        [640, 480, 24, 7],
        [1080, 430, 40, 12],
        [480, 500, 20, 6],
        [300, 430, 22, 7],
        [1020, 540, 18, 6],
      ]
    : [
        [700, 430, 34, 10],
        [880, 500, 24, 8],
        [980, 390, 20, 7],
        [560, 470, 16, 6],
      ];
  for (const [x, y, rx, ry] of shadows) {
    ellipse(ctx, x + drift * 0.4, y + lift, rx, ry, "rgba(6,28,40,0.46)");
  }
  if (hunt) {
    ctx.fillStyle = "rgba(8, 64, 58, 0.42)";
    for (let i = 0; i < 9; i += 1) {
      const x = 150 + i * 42;
      ctx.beginPath();
      ctx.moveTo(x, 640);
      ctx.quadraticCurveTo(x + Math.sin(phase + i) * 12, 572, x + 6, 508 + (i % 3) * 18);
      ctx.lineTo(x + 15, 508 + (i % 3) * 18);
      ctx.quadraticCurveTo(x + 20, 580, x + 12, 640);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(18, 110, 92, 0.22)";
    for (let i = 0; i < 5; i += 1) {
      const x = 980 + i * 36;
      ctx.beginPath();
      ctx.moveTo(x, 640);
      ctx.quadraticCurveTo(x + Math.cos(phase + i) * 8, 590, x + 4, 548);
      ctx.lineTo(x + 11, 548);
      ctx.quadraticCurveTo(x + 14, 600, x + 8, 640);
      ctx.fill();
    }
  }
  const sparkN = hunt ? 42 : 26;
  for (let i = 0; i < sparkN; i += 1) {
    const x = (i * 137 + phase * 48) % 1280;
    const y = 336 + ((i * 53) % 250) + lift + Math.sin(phase + i) * 7;
    ellipse(ctx, x, y, hunt ? 2.6 + (i % 3) : 2.2 + (i % 3), 1.5, `rgba(255,248,220,${0.32 + (i % 4) * 0.1})`);
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
    ellipse(ctx, 210, 568, 90, 10, "rgba(255,248,230,0.2)");
    roundBox(ctx, 40, 548, 210, 28, 8, "#6a3c1c");
    ctx.fillStyle = "rgba(236,184,104,0.55)";
    ctx.fillRect(46, 552, 198, 6);
    ctx.fillStyle = "rgba(72,44,22,0.45)";
    for (let i = 0; i < 6; i += 1) ctx.fillRect(50 + i * 34, 560, 4, 12);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = "#4a2c16";
      ctx.fillRect(58 + i * 40, 528, 12, 28);
      ctx.fillStyle = "rgba(236,184,104,0.35)";
      ctx.fillRect(61 + i * 40, 532, 4, 18);
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
  if (harbor) {
    const dusk = ctx.createLinearGradient(0, 0, 0, 220);
    dusk.addColorStop(0, "rgba(255,140,64,0.28)");
    dusk.addColorStop(1, "rgba(255,140,64,0)");
    ctx.fillStyle = dusk;
    ctx.fillRect(0, 0, 1280, 240);
  } else {
    const cool = ctx.createLinearGradient(0, 0, 0, 250);
    cool.addColorStop(0, "rgba(170, 226, 255, 0.46)");
    cool.addColorStop(0.55, "rgba(120, 200, 230, 0.18)");
    cool.addColorStop(1, "rgba(80, 180, 210, 0)");
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, 1280, 270);
  }
  const sunX = harbor ? 1040 : 980;
  const sunY = harbor ? 108 : 96;
  for (let i = 0; i < 7; i += 1) {
    const a = harbor ? -0.7 + i * 0.22 : -2.4 + i * 0.2;
    ctx.strokeStyle = harbor ? `rgba(255,186,72,0.16)` : `rgba(210,240,255,0.18)`;
    ctx.lineWidth = 10 - i;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(sunX + Math.cos(a) * 420, sunY + Math.sin(a) * 260);
    ctx.stroke();
  }
  ellipse(ctx, sunX, sunY, 160, 52, harbor ? "rgba(255,168,72,0.32)" : "rgba(186,230,255,0.36)");
  ellipse(ctx, sunX, sunY, 62, 62, harbor ? "rgba(255,228,150,0.7)" : "rgba(236,248,255,0.78)");
  ellipse(ctx, sunX + 10, sunY + 8, 18, 18, "rgba(255,252,236,0.92)");
  ellipse(ctx, 260 + Math.sin(phase * 0.3) * 22, 82, 140, 28, harbor ? "rgba(255,236,210,0.32)" : "rgba(210,236,248,0.3)");
  ellipse(ctx, 430 + Math.sin(phase * 0.25) * 16, 64, 100, 20, harbor ? "rgba(255,244,220,0.26)" : "rgba(220,242,255,0.24)");
  ellipse(ctx, 820, 76, 120, 22, harbor ? "rgba(255,232,200,0.2)" : "rgba(200,232,248,0.2)");
  ellipse(ctx, 600, 54, 80, 16, harbor ? "rgba(255,248,230,0.16)" : "rgba(230,246,255,0.18)");
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

export function paintFinish(ctx, grain, w, h, hunt = false) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = hunt ? 0.3 : 0.38;
  ctx.drawImage(grain, 0, 0, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = hunt ? 0.34 : 0.28;
  const warmth = ctx.createLinearGradient(0, 0, 0, h);
  if (hunt) {
    warmth.addColorStop(0, "rgba(150, 214, 246, 0.58)");
    warmth.addColorStop(0.4, "rgba(90, 190, 210, 0.12)");
    warmth.addColorStop(1, "rgba(6, 32, 52, 0.5)");
  } else {
    warmth.addColorStop(0, "rgba(255,176,80,0.62)");
    warmth.addColorStop(0.42, "rgba(255,220,150,0.1)");
    warmth.addColorStop(1, "rgba(8,40,64,0.4)");
  }
  ctx.fillStyle = warmth;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.46, 140, w * 0.5, h * 0.52, 780);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, hunt ? "rgba(6,14,24,0.34)" : "rgba(6,10,18,0.5)");
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
