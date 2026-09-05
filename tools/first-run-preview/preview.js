/**
 * 第一局灰盒预览。文案、CTA、色板与 juice 从 generated/copy.mjs 抽出。
 * 非 Cocos 实机：2D/辅助 ≠ Creator 3D。无甲板扑腾、无真实瞄准手感。
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
let toastLeft = 0;
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
let yanking = false;
let flopBody = null;
let stunned = false;
let pendingWeak = false;
let carryWalk = 0;
let carryFrom = { x: -400, y: -90 };
let carryTo = { x: -470, y: -118 };
let boatX = -400;
let boatY = -90;
let fishFace = "idle";
let sfxCtx;
let smashLeft = 0;
let smashElapsed = 0;
let castFlashLeft = 0;
let castFlashElapsed = 0;
let splashRings = [];

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
  const star =
    kind === "weak" ||
    kind === "catch" ||
    kind === "gold" ||
    kind === "sell" ||
    kind === "smash";
  const coin = kind === "gold" || kind === "sell";
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + 0.15;
    const speed =
      (kind === "smash" ? 190 : kind === "weak" ? 150 : coin ? 110 : kind === "splash" ? 170 : 95) +
      (i % 3) * 18;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy:
        Math.sin(angle) * speed +
        (coin ? 140 : kind === "smash" || kind === "splash" ? 90 : kind === "cast" || kind === "yank" ? 18 : 8),
      life: 1,
      maxLife: coin || kind === "catch" ? 0.4 : kind === "smash" ? 0.26 : 0.3,
      kind: coin ? "coin" : star && i % 2 === 0 ? "star" : "bubble",
      size:
        coin ? 6 : kind === "catch" ? 8 : kind === "smash" || kind === "splash" ? 9 : kind === "weak" ? 7 : kind === "cast" || kind === "yank" ? 4 : 5,
    });
  }
  if (kind !== "yank" && kind !== "splash") {
    flash = {
      x,
      y,
      life: 1,
      kind,
      maxLife:
        kind === "catch" || kind === "sell" || kind === "smash"
          ? 0.16
          : kind === "weak"
            ? 0.14
            : 0.1,
    };
  }
  if (kind === "weak" || kind === "catch" || kind === "sell" || kind === "smash") {
    shakeLeft = COPY.juiceShakeSeconds ?? 0.08;
  }
  if (kind === "smash" || kind === "splash") {
    splashRings.push({ x, y, life: 1, maxLife: kind === "smash" ? 0.28 : 0.34 });
  }
  if (kind === "smash") {
    smashLeft = COPY.smashSquashSeconds ?? 0.18;
    smashElapsed = 0;
  }
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
  calloutUntil = performance.now() + (COPY.calloutHoldMs ?? 800);
  calloutBorn = performance.now();
}

function setStatus(value) {
  status = value;
  statusFlash = value;
  toastLeft = COPY.harborToastHoldSeconds ?? 1.25;
}

function harborPhase() {
  if (coinJumpLeft > 0) return "justSold";
  if (toastLeft > 0 && statusFlash) return "toast";
  return "idle";
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

function fillOf(arr) {
  return rgb(arr, (arr[3] ?? 255) / 255);
}

function paintOps(ctx, ops, phase = 0, local = false) {
  const px = (x, tag) => {
    const drift =
      tag === "caustic" || tag === "shaft" || tag === "spark" || tag === "gull" || tag === "cloud"
        ? Math.sin(phase + x * 0.01) * (tag === "gull" || tag === "cloud" ? 16 : 10)
        : 0;
    return local ? x + drift : 640 + x + drift;
  };
  const py = (y) => (local ? y : 360 - y);
  const flicker = (tag, x = 0) =>
    tag === "lantern" ? 0.68 + 0.32 * (0.5 + 0.5 * Math.sin(phase * 2.6 + x * 0.03)) : 1;
  for (const op of ops) {
    if (op.t === "ellipse") {
      const k = flicker(op.tag, op.x);
      const fill = op.fill;
      ctx.fillStyle = rgb(fill.slice(0, 3), ((fill[3] ?? 255) / 255) * k);
      ctx.beginPath();
      ctx.ellipse(px(op.x, op.tag), py(op.y), op.rx, op.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (op.t === "circle") {
      const k = flicker(op.tag, op.x);
      const fill = op.fill;
      ctx.fillStyle = rgb(fill.slice(0, 3), ((fill[3] ?? 255) / 255) * k);
      ctx.beginPath();
      ctx.arc(px(op.x, op.tag), py(op.y), op.r, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (op.t === "rect") {
      ctx.fillStyle = fillOf(op.fill);
      const x = local ? op.x : 640 + op.x;
      const y = local ? op.y : 360 - op.y - op.h;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, op.w, op.h, op.r ?? 0);
      else ctx.rect(x, y, op.w, op.h);
      ctx.fill();
      continue;
    }
    if (op.t === "poly") {
      ctx.fillStyle = fillOf(op.fill);
      ctx.beginPath();
      ctx.moveTo(px(op.pts[0]), py(op.pts[1]));
      for (let i = 2; i < op.pts.length; i += 2) ctx.lineTo(px(op.pts[i]), py(op.pts[i + 1]));
      ctx.closePath();
      ctx.fill();
      continue;
    }
    if (op.t === "line") {
      ctx.strokeStyle = fillOf(op.color);
      ctx.lineWidth = op.width;
      ctx.beginPath();
      ctx.moveTo(px(op.x1), py(op.y1));
      ctx.lineTo(px(op.x2), py(op.y2));
      ctx.stroke();
      continue;
    }
    if (op.t === "bezier") {
      ctx.strokeStyle = fillOf(op.color);
      ctx.lineWidth = op.width;
      ctx.beginPath();
      ctx.moveTo(px(op.x1, op.tag), py(op.y1));
      ctx.bezierCurveTo(px(op.c1x), py(op.c1y), px(op.c2x), py(op.c2y), px(op.x2), py(op.y2));
      ctx.stroke();
      continue;
    }
    if (op.t === "ring") {
      ctx.strokeStyle = fillOf(op.color);
      ctx.lineWidth = op.width;
      ctx.beginPath();
      ctx.arc(px(op.x), py(op.y), op.r, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (op.t === "strokeRect") {
      ctx.strokeStyle = fillOf(op.color);
      ctx.lineWidth = op.width;
      const x = local ? op.x : 640 + op.x;
      const y = local ? op.y : 360 - op.y - op.h;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, op.w, op.h, op.r ?? 0);
      else ctx.rect(x, y, op.w, op.h);
      ctx.stroke();
    }
  }
}

function paintLocal(ctx, ops, x, y, angle = 0) {
  ctx.save();
  ctx.translate(sx(x), sy(y));
  ctx.scale(1, -1);
  ctx.rotate(angle);
  paintOps(ctx, ops, 0, true);
  ctx.restore();
}

function flopFeel() {
  return COPY.flopFeel ?? {};
}

function yankStepPreview(x, y, dt) {
  const yank = flopFeel().yank ?? { targetX: -340, targetY: -66, pullRate: 1.85, arcPx: 54, liftRate: 1.55, span: 420 };
  const t = Math.min(1, Math.max(0, (x - yank.targetX) / yank.span));
  const lift = Math.sin(t * Math.PI) * yank.arcPx;
  const nx = x + (yank.targetX - x) * Math.min(1, dt * yank.pullRate);
  const ny = y + (yank.targetY + lift - y) * Math.min(1, dt * yank.liftRate);
  return { x: nx, y: ny, landed: nx <= (flopFeel().dockX ?? -260) };
}

function beginFlopPreview(x, y) {
  const flop = flopFeel().flop ?? { launchVx: -150, launchVy: 780, launchAngle: 1.12, launchSpin: 26 };
  return {
    x,
    y: Math.max(y, (flopFeel().deckY ?? -118) + 12),
    vx: flop.launchVx,
    vy: flop.launchVy,
    angle: flop.launchAngle,
    spin: flop.launchSpin,
  };
}

function stepFlopPreview(body, dt, down) {
  const flop = flopFeel().flop ?? {};
  const deckY = flopFeel().deckY ?? -118;
  const dockX = flopFeel().dockX ?? -260;
  const gravity = down ? flop.gravityStun ?? -1180 : flop.gravityLive ?? -2040;
  let vx = body.vx;
  let vy = body.vy + gravity * dt;
  let x = body.x + vx * dt;
  let y = body.y + vy * dt;
  let spin = body.spin * (down ? 0.88 : 0.996);
  let angle = body.angle + spin * dt;
  if (x < -620) {
    x = -620;
    vx = Math.abs(vx) * 0.4;
  }
  if (x <= dockX + 90 && y <= deckY) {
    y = deckY;
    if (vy < 0) vy = -vy * (down ? flop.stunRestitution ?? 0.28 : flop.liveRestitution ?? 0.86);
    vx *= down ? flop.stunFriction ?? 0.68 : flop.liveFriction ?? 0.8;
    spin += -vx * 0.018;
    if (Math.abs(vy) < 48) vy = 0;
  }
  return { x, y, vx, vy, angle, spin };
}

function knockPreview(body, fromX, fromY, power) {
  const knock = flopFeel().knock ?? { base: 420, perPower: 28, popVy: 260, spin: 16 };
  const dx = body.x - fromX;
  const dy = body.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  const punch = knock.base + power * knock.perPower;
  return {
    ...body,
    vx: body.vx + (dx / len) * punch,
    vy: body.vy + (dy / len) * punch + knock.popVy,
    spin: body.spin + (dx >= 0 ? -knock.spin : knock.spin),
  };
}

function carryBob(elapsed) {
  const carry = flopFeel().carry ?? { freqX: 9, freqY: 11, ampX: 3, ampY: 7 };
  return {
    x: Math.sin(elapsed * carry.freqX) * carry.ampX,
    y: Math.abs(Math.sin(elapsed * carry.freqY)) * carry.ampY,
  };
}

function paintSea(ctx, _look, harbor = false) {
  const ops = harbor ? COPY.art?.harbor : COPY.art?.tutorial;
  if (ops) {
    paintOps(ctx, ops, performance.now() / 700);
    if (!harbor && COPY.art?.dock) paintOps(ctx, COPY.art.dock, performance.now() / 700);
    return;
  }
  ctx.fillStyle = "#0a5c7e";
  ctx.fillRect(0, 0, W, H);
}

function paintBoat(ctx, x, y) {
  paintLocal(ctx, COPY.art?.boat ?? [], x, y);
}

function bayfinOps() {
  if (fishFace === "carry") return COPY.art?.bayfinCarry ?? [];
  if (fishFace === "stunned") return COPY.art?.bayfinStunned ?? [];
  if (fishFace === "hooked") return COPY.art?.bayfinHooked ?? [];
  return COPY.art?.bayfinIdle ?? [];
}

function smashScale() {
  const mid = COPY.smashSquashMid;
  const dur = COPY.smashSquashSeconds ?? 0.18;
  if (!mid || smashLeft <= 0 || dur <= 0) return { sx: 1, sy: 1 };
  const t = smashLeft / dur;
  return { sx: 1 + (mid.sx - 1) * t, sy: 1 + (mid.sy - 1) * t };
}

function paintFish(ctx, x, y) {
  const squash = smashScale();
  ctx.save();
  ctx.translate(sx(x), sy(y));
  ctx.scale(squash.sx, -squash.sy);
  ctx.rotate(fishAngle);
  paintOps(ctx, bayfinOps(), 0, true);
  ctx.restore();
}

function paintLine(ctx) {
  if (!hooked && !yanking && !flopBody && castFlashLeft <= 0) return;
  const duration = COPY.castFlashSeconds ?? 0.26;
  const wide = COPY.castLineWide ?? 16;
  const flashT = duration > 0 ? Math.max(0, castFlashLeft / duration) : 0;
  const width = yanking ? 10 + 6 * flashT : 6 + (wide - 6) * flashT;
  ctx.save();
  ctx.strokeStyle = yanking || flashT > 0 ? "rgba(255,226,96,1)" : "rgba(255,214,70,0.88)";
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  const tip = COPY.castTipNudge ?? 10;
  ctx.moveTo(sx(boatX + 28 + tip * flashT), sy(boatY + 18));
  ctx.lineTo(sx(fishX), sy(fishY));
  ctx.stroke();
  ctx.restore();
}

function paintCrate(ctx) {
  ctx.save();
  ctx.translate(sx(COPY.crate.x), sy(COPY.crate.y));
  ctx.scale(crateScale, -crateScale);
  paintOps(ctx, COPY.art?.crate ?? [], 0, true);
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
    return: COPY.guideAnchors.return ?? { x: 530, y: 268, r: 78 },
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
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(cx, cy, hole, 0, Math.PI * 2, true);
  ctx.fill("evenodd");
  ctx.beginPath();
  ctx.arc(cx, cy, hole, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${ring.stroke[0]},${ring.stroke[1]},${ring.stroke[2]},${ring.fillAlpha / 255})`;
  ctx.fill();
  ctx.lineWidth = ring.lineWidth;
  ctx.strokeStyle = `rgba(${ring.stroke[0]},${ring.stroke[1]},${ring.stroke[2]},${ring.stroke[3] / 255})`;
  ctx.stroke();
  ctx.lineWidth = ring.haloWidth ?? 4;
  ctx.strokeStyle = `rgba(${ring.stroke[0]},${ring.stroke[1]},${ring.stroke[2]},0.4)`;
  ctx.beginPath();
  ctx.arc(cx, cy, hole + 10, 0, Math.PI * 2);
  ctx.stroke();
  if (ring.chevron !== false) {
    ctx.fillStyle = `rgba(${ring.stroke[0]},${ring.stroke[1]},${ring.stroke[2]},0.95)`;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hole - 18);
    ctx.lineTo(cx - 10, cy - hole - 4);
    ctx.lineTo(cx + 10, cy - hole - 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintJuice(ctx) {
  ctx.clearRect(0, 0, W, H);
  if (shakeLeft > 0) {
    const dur = COPY.juiceShakeSeconds ?? 0.08;
    const mag = (COPY.juiceShakePx ?? 3) * (shakeLeft / dur);
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
      ctx.fillStyle = "rgba(255,248,200,0.7)";
      ctx.beginPath();
      ctx.ellipse(px - p.size * 0.2, py - p.size * 0.15, p.size * 0.35, p.size * 0.22, 0, 0, Math.PI * 2);
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
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(px - p.size * 0.25, py - p.size * 0.2, p.size * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (flash) {
    ctx.globalAlpha = flash.life;
    ctx.strokeStyle =
      flash.kind === "weak" || flash.kind === "perfect" || flash.kind === "sell"
        ? "#ffe24a"
        : "#fff6c8";
    ctx.lineWidth = flash.kind === "weak" || flash.kind === "smash" ? 9 : 6;
    ctx.beginPath();
    const grow = flash.kind === "catch" || flash.kind === "sell" ? 42 : flash.kind === "weak" ? 28 : 30;
    ctx.arc(sx(flash.x), sy(flash.y), 18 + grow * (1 - flash.life), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const ring of splashRings) {
    ctx.globalAlpha = Math.max(0, ring.life);
    ctx.strokeStyle = "rgba(210,246,255,0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(sx(ring.x), sy(ring.y), 16 + 36 * (1 - ring.life), 7 + 10 * (1 - ring.life), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (hooked && tutorialStep === "weakPoint") {
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 140);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#ffe24a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sx(fishX + COPY.looks.bayfin.weakX), sy(fishY + COPY.looks.bayfin.weakY), 16 + pulse * 6, 0, Math.PI * 2);
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
  const phase = harborPhase();
  const showMeta = COPY.hudShowMeta?.[phase] ?? phase === "idle";
  if (showMeta) {
    label(COPY.cloudLine, 18, 0, 278);
    label(COPY.healthLine, 16, 0, 262, 1100);
  }
  const line =
    next !== "sail"
      ? COPY.harborPrompts[next === "upgrade" ? "upgrade" : "sell"]
      : complete
        ? COPY.harborGoalAfter ?? COPY.harborPrompts.freeSail
        : COPY.harborPrompts.newSail;
  const discoveryText =
    complete && statusFlash === COPY.firstRun.discovery
      ? COPY.firstRun.discovery
      : "";
  const toastText =
    discoveryText && phase === "justSold"
      ? ""
      : phase === "justSold" && statusFlash && statusFlash !== discoveryText
        ? statusFlash
        : discoveryText && phase !== "justSold"
          ? discoveryText
          : phase === "toast"
            ? statusFlash
            : "";
  plate(0, 248, 820, 48, !complete);
  label(line, 20, 0, 248, 1100, rgb(COPY.colors.cream));
  if (toastText) {
    label(
      toastText,
      22,
      0,
      206,
      720,
      toastText === discoveryText ? rgb(COPY.colors.gold) : rgb(COPY.colors.cream),
    );
  }
  for (const island of COPY.islands) {
    const selected = complete && island.id === displayIsland;
    const unlocked = island.unlockCost === 0;
    const caption = complete
      ? island.chipAfter ??
        (unlocked ? `${selected ? "● " : ""}${island.name}` : `${island.name} ${island.unlockCost}`)
      : island.chipNew ?? `${island.name} · 教学后`;
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
  paintBoat(ctx, boatX, boatY);
  paintLine(ctx);
  if (tutorialStep !== "settle") {
    paintFish(ctx, fishX, fishY);
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
  if (!carrying) {
    cta(COPY.castButton, -390, -292, bar.width, bar.height, bar.fontSize, barTone("cast"), onCast);
    cta(COPY.pickButton, 390, -292, bar.width, bar.height, bar.fontSize, barTone("pickUp"), onPick);
  } else {
    cta(
      COPY.inboxButton ?? "丢掉入箱",
      0,
      -292,
      220,
      bar.height,
      bar.fontSize,
      "primary",
      onCrate,
    );
  }
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

function paintBackdrop() {
  const ctx = bg.getContext("2d");
  if (surface === "harbor" || surface === "settle") {
    paintSea(ctx, COPY.looks.harbor, true);
    if (surface === "settle" && settleGuide) paintGuide(ctx, "sell");
    return;
  }
  paintSea(ctx, COPY.looks.tutorial, false);
  paintCrate(ctx);
  paintBoat(ctx, boatX, boatY);
  paintLine(ctx);
  if (tutorialStep !== "settle") paintFish(ctx, fishX, fishY);
  const focus =
    carrying
      ? COPY.guideTargets.carrying
      : COPY.guideTargets[tutorialStep];
  if (focus && focus !== "none") paintGuide(ctx, focus);
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
  yanking = false;
  flopBody = null;
  stunned = false;
  pendingWeak = false;
  carryWalk = 0;
  boatX = -400;
  boatY = -90;
  fishFace = "idle";
  smashLeft = 0;
  smashElapsed = 0;
  castFlashLeft = 0;
  splashRings = [];
  render();
}

function onCast() {
  if (surface !== "sea" || tutorialStep !== "cast") return;
  hooked = true;
  yanking = true;
  flopBody = null;
  stunned = false;
  fishFace = "hooked";
  tutorialStep = "weakPoint";
  status = COPY.tutorialPrompts.weakPoint;
  fishName = `${COPY.firstRun.liveQuoteHooked} · 韧性 24 · 弱点亮`;
  showCallout(COPY.firstRun.castSnap);
  burst("cast", boatX + 28, boatY + 18);
  burst("yank", fishX, fishY);
  castFlashLeft = COPY.castFlashSeconds ?? 0.26;
  castFlashElapsed = 0;
  playSfx("cast");
  render();
}

function applyWeak(knockNow = true) {
  tutorialStep = "reel";
  hooked = true;
  pickable = true;
  stunned = true;
  fishFace = "stunned";
  multiplier = COPY.firstRun.comboHudAfter;
  showCallout(COPY.firstRun.calloutWeak);
  burst("weak", fishX, fishY);
  if (knockNow) {
    if (!flopBody) flopBody = beginFlopPreview(fishX, fishY);
    flopBody = knockPreview(flopBody, boatX, boatY, 20);
    burst("smash", fishX, fishY);
  }
  playSfx("weak");
  status = COPY.tutorialPrompts.reel;
  fishName = `${COPY.firstRun.liveQuoteHooked} · 韧性 0 · 弱点亮`;
}

function onWeak() {
  if (tutorialStep !== "weakPoint") return;
  if (yanking) pendingWeak = true;
  applyWeak(!yanking);
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
  yanking = false;
  flopBody = null;
  fishFace = "carry";
  carryFrom = { x: boatX, y: boatY };
  carryTo = { x: -470, y: -118 };
  carryWalk = flopFeel().carryWalkSeconds ?? 0.36;
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
  status = COPY.tutorialPrompts.settle;
  autoSettleAt = performance.now() + (COPY.settleLeaveAutoMs ?? 4500);
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
  toastLeft = 0;
  render();
}

stage.addEventListener("click", (event) => {
  if (surface !== "sea" || tutorialStep !== "weakPoint") return;
  const rect = stage.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * W;
  if (x > 640) onWeak();
});

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickParticles(dt);
  if (smashLeft > 0) {
    smashElapsed += dt;
    smashLeft = Math.max(0, smashLeft - dt);
  }
  if (castFlashLeft > 0) {
    castFlashElapsed += dt;
    castFlashLeft = Math.max(0, castFlashLeft - dt);
  }
  splashRings = splashRings
    .map((ring) => ({ ...ring, life: ring.life - dt / ring.maxLife }))
    .filter((ring) => ring.life > 0);
  if (surface === "sea" && tutorialStep === "cast" && !yanking && !flopBody && !carrying) {
    fishX = 210 + Math.sin(now / 420) * 10;
    fishY = 20 + Math.sin(now / 310) * 7;
    fishAngle = Math.sin(now / 360) * 0.14;
  }
  if (yanking) {
    const next = yankStepPreview(fishX, fishY, dt);
    fishX = next.x;
    fishY = next.y;
    fishAngle = 0.35 + (fishX + 340) * 0.002;
    if (next.landed) {
      yanking = false;
      flopBody = beginFlopPreview(next.x, next.y);
      burst("splash", next.x, next.y + 24);
      if (pendingWeak) {
        pendingWeak = false;
        flopBody = knockPreview(flopBody, boatX, boatY, 20);
        burst("smash", next.x, next.y);
      }
    }
  } else if (flopBody && !carrying) {
    const prevY = flopBody.y;
    const prevVy = flopBody.vy;
    flopBody = stepFlopPreview(flopBody, dt, stunned);
    if (prevVy < -90 && flopBody.y <= (flopFeel().deckY ?? -118) + 2 && prevY > flopBody.y - 2) {
      burst("smash", flopBody.x, flopBody.y);
    }
    fishX = flopBody.x;
    fishY = flopBody.y;
    fishAngle = flopBody.angle;
  }
  if (carrying) {
    const walkDur = flopFeel().carryWalkSeconds ?? 0.36;
    if (carryWalk > 0) {
      carryWalk = Math.max(0, carryWalk - dt);
      const t = 1 - carryWalk / walkDur;
      const ease = 1 - (1 - t) * (1 - t);
      boatX = carryFrom.x + (carryTo.x - carryFrom.x) * ease;
      boatY = carryFrom.y + (carryTo.y - carryFrom.y) * ease;
    }
    const bob = carryBob(performance.now() / 1000);
    fishX = boatX + 40 + bob.x;
    fishY = boatY + 30 + bob.y;
    fishAngle = 0.35;
  }
  if (coinJumpLeft > 0) {
    coinJumpLeft = Math.max(0, coinJumpLeft - dt);
    if (coinJumpLeft === 0) {
      coinJump = "";
      sellPopup = "";
      if (statusFlash && toastLeft <= 0) toastLeft = COPY.harborToastHoldSeconds ?? 1.25;
      if (surface === "harbor") renderHarbor();
    }
  }
  if (coinJumpLeft <= 0 && toastLeft > 0) {
    toastLeft = Math.max(0, toastLeft - dt);
    if (toastLeft === 0) {
      statusFlash = "";
      if (surface === "harbor") renderHarbor();
    }
  }
  if (autoSettleAt && now >= autoSettleAt && surface === "sea") {
    autoSettleAt = 0;
    goSettle();
  }
  paintBackdrop();
  paintJuice(juiceCanvas.getContext("2d"));
  if (surface === "harbor" && coinJumpLeft > 0) renderHarbor();
  requestAnimationFrame(tick);
}

render();
requestAnimationFrame(tick);

Object.assign(window, {
  PROXY_COPY: COPY,
  proxyState: () => ({ surface, tutorialStep, carrying, status, coins: save.coins }),
});
