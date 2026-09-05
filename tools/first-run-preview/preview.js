/**
 * 第一局灰盒预览。文案、CTA、色板与 juice 从 generated/copy.mjs 抽出。
 * 非 Cocos 实机：无甲板扑腾、无真实瞄准手感。
 */
import { COPY } from "./generated/copy.mjs";

const stage = document.getElementById("stage");
const bg = document.getElementById("bg");
const juiceCanvas = document.getElementById("juice");
const hud = document.getElementById("hud");
const buttons = document.getElementById("buttons");
const disclaimer = document.getElementById("disclaimer");

disclaimer.textContent = `${COPY.disclaimer} · 文案镜像 TutorialFlow / RuntimeHome / RuntimePrototype · ${COPY.sourceStamp}`;

const W = 1280;
const H = 720;
const sx = (x) => 640 + x;
const sy = (y) => 360 - y;

const save = {
  coins: 0,
  tutorialComplete: false,
  completedRuns: 0,
  discovered: 0,
  selectedIslandId: COPY.tutorialIsland.id,
};

let surface = "harbor";
let tutorialStep = "cast";
let carrying = false;
let hooked = false;
let pickable = false;
let status = COPY.harborPrompts.newSail;
let statusFlash = "";
let fishName = COPY.waitingCast;
let multiplier = COPY.firstRun.comboHud;
let runCoins = 0;
let callout = "";
let calloutUntil = 0;
let calloutBorn = 0;
let coinJump = "";
let coinJumpLeft = 0;
let sellPopup = "";
let crateScale = 1;
let cratePunchLeft = 0;
let particles = [];
let flash;
let last = performance.now();
let settleGuide = false;
let autoSettleAt = 0;
let shakeLeft = 0;
let fishX = 210;
let fishY = 20;
let fishAngle = 0;
let flopLeft = 0;
let flopFrom = { x: 210, y: 20 };
let flopTo = { x: 40, y: -40 };
let sfxCtx;

function rgb(arr, a = 1) {
  return `rgba(${arr[0]},${arr[1]},${arr[2]},${a})`;
}

function cssBtn(tone) {
  const fill = tone === "primary" ? COPY.colors.primaryFill : COPY.colors.secondaryFill;
  const ink = tone === "primary" ? COPY.colors.primaryInk : COPY.colors.secondaryInk;
  const stroke = tone === "primary" ? COPY.colors.strokePrimary : COPY.colors.strokeSecondary;
  const width = tone === "primary" ? COPY.button.strokePrimary : COPY.button.strokeSecondary;
  return { fill: rgb(fill), ink: rgb(ink), stroke: rgb(stroke), width };
}

function label(text, size, x, y, width = 900, color = rgb(COPY.colors.palette.hud)) {
  const el = document.createElement("div");
  el.className = "label";
  el.textContent = text;
  el.style.left = `${sx(x)}px`;
  el.style.top = `${sy(y)}px`;
  el.style.width = `${width}px`;
  el.style.fontSize = `${size}px`;
  el.style.color = color;
  if (width < 900) el.style.whiteSpace = "normal";
  hud.appendChild(el);
  return el;
}

function plate(x, y, width, height, tutorial) {
  const el = document.createElement("div");
  el.className = "plate";
  el.style.left = `${sx(x)}px`;
  el.style.top = `${sy(y)}px`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  const fill = tutorial ? COPY.plate.fill : COPY.plate.fillIdle;
  const stroke = COPY.plate.stroke;
  el.style.background = rgb(fill.slice(0, 3), fill[3] / 255);
  el.style.border = tutorial
    ? `2px solid ${rgb(stroke.slice(0, 3), stroke[3] / 255)}`
    : `1px solid ${rgb(COPY.colors.strokeSecondary, 0.35)}`;
  el.style.borderRadius = `${COPY.plate.size.radius}px`;
  hud.appendChild(el);
  return el;
}

function cta(text, x, y, w, h, size, tone, onClick, name = text) {
  const el = document.createElement("button");
  el.className = `cta ${tone}`;
  el.textContent = text;
  el.dataset.name = name;
  el.style.left = `${sx(x)}px`;
  el.style.top = `${sy(y)}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.fontSize = `${size}px`;
  el.style.borderRadius = `${COPY.button.radius}px`;
  const skin = cssBtn(tone);
  el.style.background = skin.fill;
  el.style.color = skin.ink;
  el.style.boxShadow =
    tone === "primary"
      ? `0 0 0 ${skin.width}px ${skin.stroke}, 0 5px 0 rgba(0,0,0,0.2)`
      : `0 0 0 ${skin.width}px ${skin.stroke}, 0 4px 0 rgba(0,0,0,0.16)`;
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  buttons.appendChild(el);
  return el;
}

function barTone(button) {
  const key = carrying && tutorialStep === "reel" ? "carrying" : tutorialStep;
  const tones = COPY.tutorialTones[key];
  return tones?.[button] ?? "secondary";
}

function guideRing(nowMs) {
  const spec = COPY.guideRing;
  return {
    ...spec,
    pulse: 14 + Math.sin(nowMs / 180) * 8,
  };
}

function burst(kind, x, y) {
  const count = COPY.juiceCount[kind] ?? COPY.juiceCount.hit;
  const star = kind === "weak" || kind === "catch" || kind === "gold" || kind === "sell";
  const coin = kind === "gold" || kind === "sell";
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + 0.15;
    const speed = (kind === "weak" ? 140 : coin ? 110 : 95) + (i % 3) * 18;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + (coin ? 140 : kind === "cast" ? 18 : 8),
      life: 1,
      maxLife: coin || kind === "catch" ? 0.55 : 0.4,
      kind: coin ? "coin" : star && i % 2 === 0 ? "star" : "bubble",
      size: coin ? 6 : kind === "catch" ? 8 : kind === "weak" ? 7 : kind === "cast" ? 4 : 5,
    });
  }
  flash = {
    x,
    y,
    life: 1,
    kind,
    maxLife: kind === "catch" || kind === "sell" ? 0.22 : kind === "weak" ? 0.2 : 0.12,
  };
  if (kind === "weak" || kind === "catch" || kind === "sell") shakeLeft = 0.12;
}

function tickParticles(dt) {
  const next = [];
  for (const particle of particles) {
    const life = particle.life - dt / particle.maxLife;
    if (life <= 0) continue;
    next.push({
      ...particle,
      x: particle.x + particle.vx * dt,
      y: particle.y + particle.vy * dt,
      vy:
        particle.vy +
        (particle.kind === "coin" ? -220 : particle.kind === "bubble" ? 40 : 12) * dt,
      vx: particle.vx * Math.max(0, 1 - 0.8 * dt),
      life,
    });
  }
  particles = next;
  if (flash) {
    flash.life -= dt / flash.maxLife;
    if (flash.life <= 0) flash = undefined;
  }
  if (cratePunchLeft > 0) {
    cratePunchLeft = Math.max(0, cratePunchLeft - dt);
    const t = 1 - cratePunchLeft / 0.16;
    const env = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
    crateScale = 1 + 0.18 * Math.max(0, env);
  } else {
    crateScale = 1;
  }
  if (shakeLeft > 0) shakeLeft = Math.max(0, shakeLeft - dt);
}

function showCallout(text) {
  callout = text;
  calloutUntil = performance.now() + 1400;
  calloutBorn = performance.now();
}

function setStatus(value) {
  status = value;
  statusFlash = value;
}

function playSfx(id) {
  const tone = COPY.sfx?.[id];
  if (!tone) return;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    if (!sfxCtx) sfxCtx = new Ctor();
    if (sfxCtx.state === "suspended") void sfxCtx.resume();
    const osc = sfxCtx.createOscillator();
    const gain = sfxCtx.createGain();
    osc.type = id === "weak" ? "triangle" : "sine";
    osc.frequency.value = tone.freq;
    const now = sfxCtx.currentTime;
    gain.gain.setValueAtTime(tone.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + tone.ms / 1000);
    osc.connect(gain);
    gain.connect(sfxCtx.destination);
    osc.start();
    osc.stop(now + tone.ms / 1000 + 0.02);
  } catch {
    // mute stub：无 AudioContext 时静音，不挡流程
  }
}

function paintPalm(ctx, x, y, s, look) {
  ctx.fillStyle = rgb(look.accent);
  ctx.fillRect(x - 3 * s, y, 6 * s, 28 * s);
  ctx.fillStyle = rgb(look.landDark);
  ctx.beginPath();
  ctx.moveTo(x, y + 30 * s);
  ctx.lineTo(x - 22 * s, y + 18 * s);
  ctx.lineTo(x - 8 * s, y + 24 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y + 30 * s);
  ctx.lineTo(x + 22 * s, y + 16 * s);
  ctx.lineTo(x + 6 * s, y + 24 * s);
  ctx.closePath();
  ctx.fill();
}

function paintFoamIsle(ctx, x, y, s, look) {
  ctx.fillStyle = rgb(look.landDark, 0.7);
  ctx.beginPath();
  ctx.ellipse(x, y, 78 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(look.land);
  ctx.beginPath();
  ctx.ellipse(x, y - 8 * s, 70 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  paintPalm(ctx, x - 18 * s, y - 10 * s, s, look);
  paintPalm(ctx, x + 16 * s, y - 8 * s, 0.75 * s, look);
}

function paintPrismIsle(ctx, x, y, s, look) {
  ctx.fillStyle = rgb(look.landDark, 0.63);
  ctx.beginPath();
  ctx.ellipse(x, y, 70 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(look.land);
  ctx.beginPath();
  ctx.moveTo(x - 40 * s, y - 6 * s);
  ctx.lineTo(x - 8 * s, y - 54 * s);
  ctx.lineTo(x + 18 * s, y - 6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(look.accent);
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y - 6 * s);
  ctx.lineTo(x + 16 * s, y - 62 * s);
  ctx.lineTo(x + 34 * s, y - 6 * s);
  ctx.closePath();
  ctx.fill();
}

function paintStormIsle(ctx, x, y, s, look) {
  ctx.fillStyle = rgb(look.landDark, 0.78);
  ctx.beginPath();
  ctx.ellipse(x, y, 88 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(look.land);
  ctx.beginPath();
  ctx.moveTo(x - 48 * s, y - 4 * s);
  ctx.lineTo(x, y - 58 * s);
  ctx.lineTo(x + 48 * s, y - 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(look.accent);
  ctx.beginPath();
  ctx.ellipse(x, y - 58 * s, 12 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function paintSun(ctx, x, y, look) {
  ctx.fillStyle = rgb(look.accent, 0.31);
  ctx.beginPath();
  ctx.arc(x, y, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(look.accent);
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();
}

function paintPier(ctx) {
  ctx.fillStyle = "rgba(16,42,58,0.78)";
  ctx.beginPath();
  ctx.roundRect(120, 568, 260, 18, 4);
  ctx.fill();
  ctx.fillStyle = "#8a6c40";
  for (let i = 0; i < 5; i += 1) ctx.fillRect(140 + i * 48, 548, 10, 28);
  ctx.fillStyle = "#b0844e";
  ctx.beginPath();
  ctx.roundRect(120, 576, 260, 10, 3);
  ctx.fill();
}

function paintSea(ctx, look, harbor = false) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, rgb(look.skyTop));
  sky.addColorStop(0.22, rgb(look.sky));
  sky.addColorStop(0.38, rgb(look.haze));
  sky.addColorStop(0.48, rgb(look.far));
  sky.addColorStop(0.66, rgb(look.mid));
  sky.addColorStop(0.82, rgb(look.near));
  sky.addColorStop(1, rgb(look.deep));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rgb([255, 236, 210], 0.16);
  ctx.beginPath();
  ctx.ellipse(1060, 168, 220, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgb(look.haze, 0.43);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 316);
  ctx.lineTo(W, 316);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,252,236,0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 322);
  ctx.lineTo(W, 322);
  ctx.stroke();
  if (harbor) {
    paintSun(ctx, 1060, 110, look);
    paintFoamIsle(ctx, sx(-160), 282, 1, COPY.looks.foam);
    paintPrismIsle(ctx, sx(170), 278, 1, COPY.looks.prism);
    paintStormIsle(ctx, sx(470), 284, 0.85, COPY.looks.storm);
    paintPier(ctx);
  } else {
    paintSun(ctx, 1100, 112, look);
    paintFoamIsle(ctx, 1020, 280, 1.05, look);
    paintFoamIsle(ctx, 220, 286, 0.7, look);
    ctx.fillStyle = "rgba(176,124,70,0.92)";
    ctx.beginPath();
    ctx.roundRect(0, 478, 430, 98, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(214,168,104,0.95)";
    ctx.beginPath();
    ctx.roundRect(0, 478, 430, 16, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(142,96,52,0.9)";
    for (let i = 0; i < 8; i += 1) ctx.fillRect(8 + i * 52, 498, 5, 70);
  }
  ctx.strokeStyle = rgb(look.haze, 0.22);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 420);
  ctx.bezierCurveTo(200, 408, 320, 432, 460, 418);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(640, 500);
  ctx.bezierCurveTo(780, 488, 920, 512, 1100, 498);
  ctx.stroke();
}

function paintBoat(ctx, x, y) {
  ctx.save();
  ctx.translate(sx(x), sy(y));
  ctx.fillStyle = "rgba(12,36,48,0.58)";
  ctx.beginPath();
  ctx.ellipse(2, 16, 62, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d0a056";
  ctx.beginPath();
  ctx.roundRect(-54, -12, 108, 30, 12);
  ctx.fill();
  ctx.fillStyle = "#ecc47a";
  ctx.fillRect(-50, 2, 100, 8);
  ctx.fillStyle = "#f2d7a8";
  ctx.beginPath();
  ctx.roundRect(-12, 8, 48, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#78c4d6";
  ctx.beginPath();
  ctx.arc(10, 20, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5c4a30";
  ctx.fillRect(-6, 10, 5, 40);
  ctx.fillStyle = "#ffa848";
  ctx.beginPath();
  ctx.moveTo(-4, 48);
  ctx.lineTo(26, 38);
  ctx.lineTo(-4, 30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function paintFish(ctx, x, y, glow) {
  const look = COPY.looks.bayfin;
  ctx.save();
  ctx.translate(sx(x), sy(y));
  ctx.rotate(fishAngle);
  if (glow) {
    ctx.fillStyle = "rgba(255,214,32,0.28)";
    ctx.beginPath();
    ctx.ellipse(look.weakX, -look.weakY, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgb(look.accent);
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.lineTo(-68, -20);
  ctx.lineTo(-54, 0);
  ctx.lineTo(-68, 20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.lineTo(28, 34);
  ctx.lineTo(32, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgb(look.body);
  ctx.beginPath();
  ctx.moveTo(6, -6);
  ctx.lineTo(2, -28);
  ctx.lineTo(18, -8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, 2, 36, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(look.belly);
  ctx.beginPath();
  ctx.ellipse(16, 8, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgb(look.accent);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.quadraticCurveTo(8, 10, 22, 4);
  ctx.stroke();
  ctx.fillStyle = "#f7fff4";
  ctx.beginPath();
  ctx.arc(30, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#142018";
  ctx.beginPath();
  ctx.arc(32, -1, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(33, -2, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = glow ? "#ffe24a" : rgb(look.accent);
  ctx.beginPath();
  ctx.ellipse(look.weakX, -look.weakY, glow ? 9 : 7, glow ? 9 : 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (glow) {
    ctx.strokeStyle = "#fff8c8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(look.weakX, -look.weakY, 16, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function paintLine(ctx) {
  if (!hooked && flopLeft <= 0) return;
  ctx.save();
  ctx.strokeStyle = flopLeft > 0 ? "rgba(255,214,70,1)" : "rgba(255,214,70,0.92)";
  ctx.lineWidth = flopLeft > 0 ? 10 : 6;
  ctx.beginPath();
  ctx.moveTo(sx(-372), sy(-72));
  ctx.lineTo(sx(fishX), sy(fishY));
  ctx.stroke();
  ctx.restore();
}

function paintCrate(ctx) {
  const x = sx(COPY.crate.x);
  const y = sy(COPY.crate.y);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(crateScale, crateScale);
  ctx.fillStyle = "rgba(12,32,44,0.55)";
  ctx.beginPath();
  ctx.ellipse(0, 28, 46, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a582a";
  ctx.beginPath();
  ctx.roundRect(-42, -26, 84, 52, 6);
  ctx.fill();
  ctx.fillStyle = "#b07c40";
  ctx.beginPath();
  ctx.roundRect(-42, 10, 84, 16, 5);
  ctx.fill();
  ctx.fillStyle = "#6e4622";
  for (let i = 0; i < 4; i += 1) ctx.fillRect(-34 + i * 20, -20, 4, 30);
  ctx.strokeStyle = "#ffdc78";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-42, -26, 84, 52, 6);
  ctx.stroke();
  ctx.fillStyle = "#ffd25a";
  ctx.beginPath();
  ctx.arc(0, 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintGuide(ctx, focus) {
  const live = {
    cast: { x: -390, y: -292, r: 78 },
    pickUp: { x: 390, y: -292, r: 78 },
    crate: COPY.guideAnchors.crate,
    weakPoint: hooked
      ? { x: 210, y: 20, radius: 96 }
      : COPY.guideAnchors.weakPoint,
    sell: { x: 0, y: -230, r: 92 },
  }[focus];
  if (!live) return;
  const x = live.x;
  const y = live.y;
  const base = live.r ?? live.radius ?? 78;
  const ring = guideRing(performance.now());
  const hole = base + ring.pulse * 0.35;
  const cx = sx(x);
  const cy = sy(y);
  ctx.save();
  ctx.fillStyle = `rgba(4,10,18,${ring.maskAlpha / 255})`;
  ctx.fillRect(0, 0, W, Math.max(0, cy - hole));
  ctx.fillRect(0, Math.min(H, cy + hole), W, H);
  ctx.fillRect(0, cy - hole, Math.max(0, cx - hole), hole * 2);
  ctx.fillRect(cx + hole, cy - hole, W, hole * 2);
  ctx.beginPath();
  ctx.arc(cx, cy, hole, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${ring.stroke[0]},${ring.stroke[1]},${ring.stroke[2]},${ring.fillAlpha / 255})`;
  ctx.fill();
  ctx.lineWidth = ring.lineWidth;
  ctx.strokeStyle = `rgba(${ring.stroke[0]},${ring.stroke[1]},${ring.stroke[2]},${ring.stroke[3] / 255})`;
  ctx.stroke();
  ctx.restore();
}

function paintJuice(ctx) {
  ctx.clearRect(0, 0, W, H);
  if (shakeLeft > 0) {
    const mag = 5 * (shakeLeft / 0.12);
    ctx.save();
    ctx.translate((Math.random() - 0.5) * 2 * mag, (Math.random() - 0.5) * 2 * mag);
  }
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    const px = sx(p.x);
    const py = sy(p.y);
    if (p.kind === "coin") {
      ctx.fillStyle = "#ffd648";
      ctx.beginPath();
      ctx.ellipse(px, py, p.size * 1.15, p.size * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "star") {
      ctx.fillStyle = "#ffe24a";
      ctx.beginPath();
      ctx.moveTo(px, py - p.size);
      ctx.lineTo(px + p.size * 0.6, py + p.size * 0.5);
      ctx.lineTo(px - p.size * 0.6, py + p.size * 0.5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#b8ecff";
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (flash) {
    ctx.globalAlpha = flash.life;
    ctx.strokeStyle =
      flash.kind === "weak" || flash.kind === "perfect" || flash.kind === "sell"
        ? "#ffe24a"
        : "#fff6c8";
    ctx.lineWidth = flash.kind === "weak" ? 9 : 6;
    ctx.beginPath();
    const grow = flash.kind === "catch" || flash.kind === "sell" ? 64 : flash.kind === "weak" ? 52 : 42;
    ctx.arc(sx(flash.x), sy(flash.y), 18 + grow * (1 - flash.life), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (shakeLeft > 0) ctx.restore();
}

function nextCtaHarbor() {
  if (!save.tutorialComplete) return "sail";
  return COPY.harborCtaAfter;
}

function renderHarbor() {
  const look = COPY.looks.harbor;
  const ctx = bg.getContext("2d");
  paintSea(ctx, look, true);
  const next = nextCtaHarbor();
  const complete = save.tutorialComplete;
  const displayIsland = complete ? COPY.islands[0].id : COPY.tutorialIsland.id;
  hud.innerHTML = "";
  buttons.innerHTML = "";
  label(COPY.harborTitle, 34, 0, 310);
  label(`金币 ${save.coins}`, 26, 470, 310, 280, rgb(COPY.colors.gold));
  if (coinJump && coinJumpLeft > 0) {
    const t = 1 - coinJumpLeft / COPY.coinJumpSeconds;
    label(coinJump, 28, 470, 274 + t * 46, 280, `rgba(255,220,72,${1 - t * 0.15})`);
  }
  if (sellPopup && coinJumpLeft > 0) {
    const t = 1 - coinJumpLeft / COPY.coinJumpSeconds;
    label(sellPopup, 30, 0, 120 + t * 16, 520, rgb(COPY.colors.gold));
  }
  label(COPY.cloudLine, 18, 0, 278);
  label(COPY.healthLine, 16, 0, 262, 1100);
  const line =
    next !== "sail"
      ? COPY.harborPrompts[next === "upgrade" ? "upgrade" : "sell"]
      : complete
        ? `${COPY.firstRun.headline}。${COPY.firstRun.slogan}`
        : COPY.harborPrompts.newSail;
  plate(0, 248, 820, 48, !complete);
  label(statusFlash || line, 20, 0, 248, 1100, rgb(COPY.colors.cream));
  if (complete && COPY.firstRun.discovery && statusFlash !== COPY.firstRun.discovery) {
    label(COPY.firstRun.discovery, 24, 0, 206, 720, rgb(COPY.colors.gold));
  }
  for (const island of COPY.islands) {
    const selected = complete && island.id === displayIsland;
    const unlocked = island.unlockCost === 0;
    const caption = unlocked
      ? `${selected ? "● " : ""}${island.name}`
      : `${island.name} ${island.unlockCost}`;
    cta(caption, island.x, 188, COPY.button.chip.width, COPY.button.chip.height, COPY.button.chip.fontSize, "secondary", () => onIsland(island));
  }
  COPY.tools.forEach((tool, index) => {
    const owned = tool.id === "tool_rod";
    const selected = owned;
    const caption = owned
      ? `${selected ? "● " : ""}${tool.name} Lv1`
      : `买${tool.name}`;
    cta(caption, -340 + index * 340, 40, 300, 72, 22, "secondary", () => {
      if (!owned) setStatus(COPY.coinFail);
      render();
    });
  });
  label(complete ? COPY.sailLineAfter : COPY.sailLineNew, 22, 0, -40, 1100);
  label(complete ? COPY.fishCountAfter : COPY.fishCountNew, 20, 0, -90, 1100);
  const labels = complete ? COPY.featureLabelsAfter : COPY.featureLabelsNew;
  cta(
    complete ? COPY.sailCaptionAfter : COPY.sailCaptionNew,
    -80,
    -230,
    230,
    90,
    30,
    next === "sail" ? "primary" : "secondary",
    sail,
  );
  cta(
    labels.upgrade,
    -470,
    -230,
    next === "upgrade" ? 220 : 200,
    next === "upgrade" ? 84 : 72,
    next === "upgrade" ? 26 : 20,
    next === "upgrade" ? "primary" : "secondary",
    () => {
      if (!complete) setStatus(COPY.upgradeLockNew);
      else if (save.coins < COPY.nextUpgradeCost) setStatus(COPY.coinFail);
      render();
    },
  );
  cta(labels.book, 220, -230, 180, 72, 22, "secondary", () => {
    setStatus(complete ? COPY.bookLockAfter : COPY.bookLockNew);
    render();
  });
  cta(labels.board, 470, -230, 160, 72, 22, "secondary", () => {
    setStatus(complete ? COPY.boardLockAfter : COPY.boardLockNew);
    render();
  });
  cta(COPY.settingsButton, -530, 310, COPY.button.mini.width, COPY.button.mini.height, COPY.button.mini.fontSize, "secondary", () => {
    setStatus("代理预览不包含设置页。");
    render();
  });
}

function renderSea() {
  const ctx = bg.getContext("2d");
  paintSea(ctx, COPY.looks.tutorial, false);
  paintCrate(ctx);
  paintBoat(ctx, carrying ? -430 : -400, -90);
  paintLine(ctx);
  if (tutorialStep !== "settle") {
    paintFish(ctx, fishX, fishY, tutorialStep === "weakPoint");
  }
  const focus =
    surface === "settle"
      ? "none"
      : carrying
        ? COPY.guideTargets.carrying
        : COPY.guideTargets[tutorialStep];
  if (focus && focus !== "none") paintGuide(ctx, focus);
  hud.innerHTML = "";
  buttons.innerHTML = "";
  plate(0, 268, COPY.plate.size.width, COPY.plate.size.height, true);
  label(`${COPY.tutorialIsland.name} · ${COPY.huntSuffix}`, 32, 0, 318);
  label(multiplier, 22, -470, 318, 280);
  label(`本局 ${runCoins}`, 24, 470, 318, 280, rgb(COPY.colors.gold));
  label(status, 22, 0, 268, 760, rgb(COPY.colors.cream));
  label(fishName, 24, 0, 228);
  if (callout && performance.now() < calloutUntil) {
    const lift = Math.min(36, ((performance.now() - calloutBorn) / 450) * 36);
    label(callout, 28, 0, 188 + lift, 900, "#ffec78");
  }
  label(COPY.tutorialIsland.clock, 20, -470, 268, 280);
  label(COPY.crateLabel, 20, COPY.crate.x, -96, 120, "#ffecb4");
  const bar = COPY.button.bar;
  cta(COPY.castButton, -390, -292, bar.width, bar.height, bar.fontSize, barTone("cast"), onCast);
  cta(COPY.pickButton, 390, -292, bar.width, bar.height, bar.fontSize, barTone("pickUp"), onPick);
  cta(COPY.pauseButton, -530, 268, COPY.button.mini.width, COPY.button.mini.height, COPY.button.mini.fontSize, "secondary", () => {
    setStatus("已暂停。再点暂停，3秒后继续。");
    render();
  });
  cta(COPY.returnButton, 530, 268, COPY.button.mini.width, COPY.button.mini.height, COPY.button.mini.fontSize, "secondary", onLeave);
  if (tutorialStep === "weakPoint") {
    const weak = document.createElement("button");
    weak.className = "cta secondary";
    weak.dataset.name = "弱点";
    weak.textContent = "";
    weak.style.left = `${sx(210 + COPY.looks.bayfin.weakX)}px`;
    weak.style.top = `${sy(20 + COPY.looks.bayfin.weakY)}px`;
    weak.style.width = "96px";
    weak.style.height = "72px";
    weak.style.background = "transparent";
    weak.style.boxShadow = "none";
    weak.addEventListener("click", onWeak);
    buttons.appendChild(weak);
  }
  if (carrying) {
    const crate = document.createElement("button");
    crate.className = "cta secondary";
    crate.dataset.name = "鱼箱";
    crate.textContent = "";
    crate.style.left = `${sx(COPY.crate.x)}px`;
    crate.style.top = `${sy(COPY.crate.y)}px`;
    crate.style.width = "120px";
    crate.style.height = "90px";
    crate.style.background = "transparent";
    crate.style.boxShadow = "none";
    crate.addEventListener("click", onCrate);
    buttons.appendChild(crate);
  }
}

function renderSettle() {
  const ctx = bg.getContext("2d");
  paintSea(ctx, COPY.looks.harbor, true);
  paintGuide(ctx, "sell");
  hud.innerHTML = "";
  buttons.innerHTML = "";
  label(COPY.settleTitle, 34, 0, 300);
  label(COPY.firstRun.headline, 26, 0, 236);
  if (COPY.firstRun.discovery) {
    plate(0, 204, 640, 40, true);
    label(COPY.firstRun.discovery, 24, 0, 204, 720, rgb(COPY.colors.gold));
  }
  COPY.firstRun.rows.forEach((row, index) => {
    label(row, 22, 0, 170 - index * 36);
  });
  label(COPY.harborPrompts.sell, 22, 0, -80);
  const hero = COPY.button.hero;
  cta(COPY.sellCaption, 0, -230, hero.width, hero.height, hero.fontSize, "primary", confirmSettle);
}

function render() {
  stage.dataset.surface = surface;
  stage.dataset.step = tutorialStep;
  if (surface === "harbor") renderHarbor();
  else if (surface === "settle") renderSettle();
  else renderSea();
}

function onIsland(island) {
  if (!save.tutorialComplete) {
    setStatus(COPY.islandLock);
    render();
    return;
  }
  if (island.unlockCost > save.coins) {
    setStatus(COPY.coinFail);
    render();
  }
}

function sail() {
  surface = "sea";
  tutorialStep = "cast";
  carrying = false;
  hooked = false;
  pickable = false;
  runCoins = 0;
  multiplier = COPY.firstRun.comboHud;
  fishName = COPY.waitingCast;
  status = COPY.waveOnCast;
  autoSettleAt = 0;
  fishX = 210;
  fishY = 20;
  fishAngle = 0;
  flopLeft = 0;
  render();
}

function onCast() {
  if (surface !== "sea" || tutorialStep !== "cast") return;
  hooked = true;
  tutorialStep = "weakPoint";
  status = COPY.tutorialPrompts.weakPoint;
  fishName = `${COPY.firstRun.liveQuoteHooked} · 韧性 24 · 弱点亮`;
  showCallout(COPY.firstRun.castSnap);
  burst("cast", -372, -72);
  playSfx("cast");
  render();
}

function onWeak() {
  if (tutorialStep !== "weakPoint") return;
  tutorialStep = "reel";
  hooked = true;
  pickable = true;
  multiplier = COPY.firstRun.comboHudAfter;
  showCallout(COPY.firstRun.calloutWeak);
  burst("weak", 210, 20);
  burst("splash", 40, -40);
  playSfx("weak");
  flopFrom = { x: 210, y: 20 };
  flopTo = { x: 40, y: -40 };
  flopLeft = 0.42;
  status = COPY.tutorialPrompts.reel;
  fishName = `${COPY.firstRun.liveQuoteHooked} · 韧性 0 · 弱点亮`;
  render();
}

function onPick() {
  if (tutorialStep !== "reel" || carrying) {
    if (!pickable) setStatus("先砸晕甲板上的鱼，再捡起来。");
    render();
    return;
  }
  carrying = true;
  pickable = false;
  hooked = false;
  fishX = -390;
  fishY = -60;
  fishAngle = 0.4;
  playSfx("ui");
  status = COPY.tutorialPrompts.carrying;
  render();
}

function onCrate() {
  if (!carrying) return;
  carrying = false;
  tutorialStep = "settle";
  runCoins = COPY.firstRun.sold.price;
  showCallout(COPY.firstRun.inbox);
  burst("catch", COPY.crate.x, COPY.crate.y);
  cratePunchLeft = 0.16;
  playSfx("catch");
  status = COPY.firstRun.inboxStatus;
  autoSettleAt = performance.now() + 1800;
  render();
}

function onLeave() {
  if (tutorialStep !== "settle" && tutorialStep !== "complete") {
    setStatus(COPY.leaveBlocked);
    render();
    return;
  }
  goSettle();
}

function goSettle() {
  surface = "settle";
  settleGuide = true;
  status = COPY.harborPrompts.sell;
  render();
}

function confirmSettle() {
  save.coins = COPY.firstRun.afterCoins;
  save.tutorialComplete = COPY.firstRun.afterTutorial;
  save.completedRuns = COPY.firstRun.afterRuns;
  save.discovered = 1;
  save.selectedIslandId = COPY.islands[0].id;
  coinJump = COPY.firstRun.coinJump;
  sellPopup = COPY.firstRun.sellPopup;
  coinJumpLeft = COPY.coinJumpSeconds;
  burst("gold", 470, 300);
  burst("sell", 0, 120);
  playSfx("sell");
  surface = "harbor";
  statusFlash = COPY.firstRun.discovery;
  render();
}

juiceCanvas.addEventListener("click", (event) => {
  if (surface !== "sea" || tutorialStep !== "weakPoint") return;
  const rect = juiceCanvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * W;
  if (x > 640) onWeak();
});

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickParticles(dt);
  if (flopLeft > 0) {
    flopLeft = Math.max(0, flopLeft - dt);
    const t = 1 - flopLeft / 0.42;
    const bounce = Math.sin(t * Math.PI) * 36;
    fishX = flopFrom.x + (flopTo.x - flopFrom.x) * t;
    fishY = flopFrom.y + (flopTo.y - flopFrom.y) * t + bounce;
    fishAngle = t * 1.2;
    if (flopLeft === 0) {
      fishX = flopTo.x;
      fishY = flopTo.y;
      fishAngle = 0.35;
    }
  }
  if (coinJumpLeft > 0) {
    coinJumpLeft = Math.max(0, coinJumpLeft - dt);
    if (coinJumpLeft === 0) {
      coinJump = "";
      sellPopup = "";
    }
  }
  if (autoSettleAt && now >= autoSettleAt && surface === "sea") {
    autoSettleAt = 0;
    goSettle();
  }
  paintJuice(juiceCanvas.getContext("2d"));
  if (surface === "harbor" && coinJumpLeft > 0) renderHarbor();
  if (surface === "sea" && (particles.length || flash || flopLeft > 0 || (callout && now < calloutUntil + 30) || cratePunchLeft > 0)) {
    void renderSea();
  }
  if (surface === "settle" && settleGuide) {
    const ctx = bg.getContext("2d");
    paintSea(ctx, COPY.looks.harbor, true);
    paintGuide(ctx, "sell");
  }
  requestAnimationFrame(tick);
}

render();
requestAnimationFrame(tick);

Object.assign(window, {
  PROXY_COPY: COPY,
  proxyState: () => ({ surface, tutorialStep, carrying, status, coins: save.coins }),
});
