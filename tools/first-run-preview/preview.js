/**
 * 第一局灰盒预览。文案与 CTA 层级来自 generated/copy.mjs（由领域层抽出）。
 * 非 Cocos 实机：无甲板扑腾、无真实瞄准手感。
 */
import { COPY } from "./generated/copy.mjs";

const stage = document.getElementById("stage");
const bg = document.getElementById("bg");
const juiceCanvas = document.getElementById("juice");
const hud = document.getElementById("hud");
const buttons = document.getElementById("buttons");
const fx = document.getElementById("fx");
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
let coinJump = "";
let coinJumpLeft = 0;
let particles = [];
let flash;
let last = performance.now();
let waveOverwrote = false;
let settleGuide = false;
let autoSettleAt = 0;

function rgb(arr, a = 1) {
  return `rgba(${arr[0]},${arr[1]},${arr[2]},${a})`;
}

function cssBtn(tone) {
  const fill = tone === "primary" ? COPY.colors.primaryFill : COPY.colors.secondaryFill;
  const ink = tone === "primary" ? COPY.colors.primaryInk : COPY.colors.secondaryInk;
  return { fill: rgb(fill), ink: rgb(ink) };
}

function label(text, size, x, y, width = 900, color = "#f0faff") {
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
  const skin = cssBtn(tone);
  el.style.background = skin.fill;
  el.style.color = skin.ink;
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  buttons.appendChild(el);
  return el;
}

function guideRing(nowMs) {
  const spec = COPY.guideRing;
  return {
    ...spec,
    pulse: 24 + Math.sin(nowMs / 150) * 14,
  };
}

function burst(kind, x, y) {
  const count = COPY.juiceCount[kind] ?? COPY.juiceCount.hit;
  const star = kind === "weak" || kind === "catch";
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + 0.15;
    const speed = (kind === "weak" ? 140 : 95) + (i % 3) * 18;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + 8,
      life: 1,
      maxLife: kind === "catch" ? 0.55 : 0.4,
      kind: star && i % 2 === 0 ? "star" : "bubble",
      size: kind === "catch" ? 8 : kind === "weak" ? 7 : 5,
    });
  }
  flash = {
    x,
    y,
    life: 1,
    kind,
    maxLife: kind === "catch" ? 0.22 : kind === "weak" ? 0.18 : 0.12,
  };
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
      vy: particle.vy + (particle.kind === "bubble" ? 40 : 12) * dt,
      vx: particle.vx * Math.max(0, 1 - 0.8 * dt),
      life,
    });
  }
  particles = next;
  if (flash) {
    flash.life -= dt / flash.maxLife;
    if (flash.life <= 0) flash = undefined;
  }
}

function showCallout(text) {
  callout = text;
  calloutUntil = performance.now() + 1400;
}

function setStatus(value) {
  status = value;
  statusFlash = value;
}

function paintSea(ctx, look) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, rgb(look.skyTop));
  sky.addColorStop(0.35, rgb(look.sky));
  sky.addColorStop(0.55, rgb(look.haze));
  sky.addColorStop(0.72, rgb(look.far));
  sky.addColorStop(0.86, rgb(look.mid));
  sky.addColorStop(1, rgb(look.deep));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rgb(look.landDark, 0.9);
  ctx.beginPath();
  ctx.ellipse(180, 430, 220, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(look.land);
  ctx.beginPath();
  ctx.ellipse(190, 418, 190, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(look.accent);
  ctx.fillRect(168, 360, 10, 62);
  ctx.beginPath();
  ctx.moveTo(173, 352);
  ctx.lineTo(148, 378);
  ctx.lineTo(173, 368);
  ctx.lineTo(198, 376);
  ctx.closePath();
  ctx.fill();
}

function paintBoat(ctx, x, y) {
  ctx.save();
  ctx.translate(sx(x), sy(y));
  ctx.fillStyle = "#c48a48";
  ctx.beginPath();
  ctx.ellipse(0, 10, 48, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2d7a0";
  ctx.fillRect(-18, -18, 36, 22);
  ctx.fillStyle = "#8ec8e6";
  ctx.fillRect(-8, -36, 6, 20);
  ctx.restore();
}

function paintFish(ctx, x, y, glow) {
  const look = COPY.looks.bayfin;
  ctx.save();
  ctx.translate(sx(x), sy(y));
  if (glow) {
    ctx.fillStyle = "rgba(255,214,32,0.28)";
    ctx.beginPath();
    ctx.ellipse(look.weakX, -look.weakY, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = rgb(look.body);
  ctx.beginPath();
  ctx.ellipse(0, 0, 52, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(look.belly);
  ctx.beginPath();
  ctx.ellipse(4, 8, 28, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(look.accent);
  ctx.beginPath();
  ctx.moveTo(-48, 0);
  ctx.lineTo(-72, -16);
  ctx.lineTo(-72, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = glow ? "#ffe24a" : rgb(look.accent);
  ctx.beginPath();
  ctx.ellipse(look.weakX, -look.weakY, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintCrate(ctx) {
  const x = sx(COPY.crate.x);
  const y = sy(COPY.crate.y);
  ctx.fillStyle = "#8a5a2a";
  ctx.fillRect(x - 46, y - 28, 92, 56);
  ctx.strokeStyle = "#f0d48a";
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 46, y - 28, 92, 56);
  ctx.strokeRect(x - 46, y - 2, 92, 0);
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
  ctx.fillStyle = `rgba(6,14,22,${ring.maskAlpha / 255})`;
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
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.kind === "star" ? "#ffe24a" : "#b8ecff";
    const px = sx(p.x);
    const py = sy(p.y);
    if (p.kind === "star") {
      ctx.beginPath();
      ctx.moveTo(px, py - p.size);
      ctx.lineTo(px + p.size * 0.6, py + p.size * 0.5);
      ctx.lineTo(px - p.size * 0.6, py + p.size * 0.5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (flash) {
    ctx.globalAlpha = flash.life;
    ctx.strokeStyle = flash.kind === "weak" || flash.kind === "perfect" ? "#ffe24a" : "#fff6c8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    const grow = flash.kind === "catch" ? 56 : 42;
    ctx.arc(sx(flash.x), sy(flash.y), 18 + grow * (1 - flash.life), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function nextCtaHarbor() {
  const unlocks = {
    upgrade: save.tutorialComplete && save.completedRuns >= 1,
    book: save.tutorialComplete && save.completedRuns >= 2,
    board: save.tutorialComplete && save.completedRuns >= 2,
  };
  if (!save.tutorialComplete) return "sail";
  if (save.completedRuns === 1 && unlocks.upgrade) return "upgrade";
  return "sail";
}

function renderHarbor() {
  const look = COPY.looks.harbor;
  const ctx = bg.getContext("2d");
  paintSea(ctx, look);
  const next = nextCtaHarbor();
  const complete = save.tutorialComplete;
  const displayIsland = complete ? COPY.islands[0].id : COPY.tutorialIsland.id;
  const islandName = complete ? COPY.foamName : COPY.tutorialIsland.name;
  hud.innerHTML = "";
  buttons.innerHTML = "";
  fx.innerHTML = "";
  label(COPY.harborTitle, 34, 0, 310);
  label(`金币 ${save.coins}`, 26, 470, 310, 280, rgb(COPY.colors.gold));
  if (coinJump && coinJumpLeft > 0) {
    const t = 1 - coinJumpLeft / 1.1;
    label(coinJump, 26, 470, 274 + t * 40, 280, `rgba(255,220,72,${1 - t})`);
  }
  label(COPY.cloudLine, 18, 0, 278);
  label(COPY.healthLine, 16, 0, 262, 1100);
  const line =
    next !== "sail"
      ? COPY.harborPrompts[next === "upgrade" ? "upgrade" : "sell"]
      : complete
        ? `${COPY.firstRun.headline}。${COPY.firstRun.slogan}`
        : COPY.harborPrompts.newSail;
  label(statusFlash || line, 20, 0, 248, 1100);
  for (const island of COPY.islands) {
    const selected = complete && island.id === displayIsland;
    const unlocked = island.unlockCost === 0;
    const caption = unlocked
      ? `${selected ? "● " : ""}${island.name}`
      : `${island.name} ${island.unlockCost}`;
    cta(caption, island.x, 188, 240, 56, 22, "secondary", () => onIsland(island));
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
  label(COPY.sailLine(islandName, complete), 22, 0, -40, 1100);
  label(COPY.fishCountLabel(save.discovered), 20, 0, -90, 1100);
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
  cta(COPY.settingsButton, -530, 310, 140, 52, 22, "secondary", () => {
    setStatus("代理预览不包含设置页。");
    render();
  });
}

function renderSea() {
  const ctx = bg.getContext("2d");
  paintSea(ctx, COPY.looks.tutorial);
  paintCrate(ctx);
  paintBoat(ctx, carrying ? -430 : -400, carrying ? -90 : -90);
  if (tutorialStep !== "settle") {
    paintFish(ctx, hooked || pickable ? (carrying ? -390 : 40) : 210, carrying ? -60 : 20, tutorialStep === "weakPoint");
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
  const plate = document.createElement("div");
  plate.className = "plate";
  plate.style.left = `${sx(0)}px`;
  plate.style.top = `${sy(268)}px`;
  plate.style.width = "760px";
  plate.style.height = "44px";
  plate.style.background = "rgba(8,22,32,0.69)";
  plate.style.border = "2px solid rgba(255,214,32,0.63)";
  hud.appendChild(plate);
  label(`${COPY.tutorialIsland.name} · ${COPY.huntSuffix}`, 32, 0, 318);
  label(multiplier, 22, -470, 318, 280);
  label(`本局 ${runCoins}`, 24, 470, 318, 280, rgb(COPY.colors.gold));
  label(status, 22, 0, 268, 760, "#fffcf0");
  label(fishName, 24, 0, 228);
  if (callout && performance.now() < calloutUntil) {
    label(callout, 28, 0, 188, 900, "#ffec78");
  }
  label(COPY.tutorialIsland.clock, 20, -470, 268, 280);
  label(COPY.crateLabel, 20, COPY.crate.x, -118, 120, "#ffecb4");
  cta(COPY.castButton, -390, -292, 200, 86, 28, "primary", onCast);
  cta(COPY.pickButton, 390, -292, 200, 86, 28, "primary", onPick);
  cta(COPY.pauseButton, -530, 268, 150, 56, 22, "secondary", () => {
    setStatus("已暂停。再点暂停，3秒后继续。");
    render();
  });
  cta(COPY.returnButton, 530, 268, 150, 56, 22, "secondary", onLeave);
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
  paintSea(ctx, COPY.looks.harbor);
  paintGuide(ctx, "sell");
  hud.innerHTML = "";
  buttons.innerHTML = "";
  label(COPY.settleTitle, 34, 0, 300);
  label(COPY.firstRun.headline, 26, 0, 236);
  COPY.firstRun.rows.forEach((row, index) => {
    label(row, 22, 0, 170 - index * 36);
  });
  label(COPY.harborPrompts.sell, 22, 0, -80);
  cta(COPY.sellCaption, 0, -230, 300, 92, 30, "primary", confirmSettle);
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
  status = COPY.tutorialPrompts.cast;
  waveOverwrote = false;
  autoSettleAt = 0;
  render();
  // 与 RuntimePrototype.buildView + tickWave(0) 一致：潮汐旁白盖住教学抛竿句。
  requestAnimationFrame(() => {
    if (surface === "sea" && tutorialStep === "cast" && !waveOverwrote) {
      waveOverwrote = true;
      status = COPY.waveStart;
      render();
    }
  });
}

function onCast() {
  if (surface !== "sea" || tutorialStep !== "cast") return;
  hooked = true;
  tutorialStep = "weakPoint";
  status = COPY.tutorialPrompts.weakPoint;
  fishName = `${COPY.firstRun.liveQuoteHooked} · 韧性 24 · 弱点亮`;
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
  coinJumpLeft = 1.1;
  surface = "harbor";
  statusFlash = "";
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
  if (coinJumpLeft > 0) {
    coinJumpLeft = Math.max(0, coinJumpLeft - dt);
    if (coinJumpLeft === 0) coinJump = "";
  }
  if (autoSettleAt && now >= autoSettleAt && surface === "sea") {
    autoSettleAt = 0;
    goSettle();
  }
  paintJuice(juiceCanvas.getContext("2d"));
  if (surface === "harbor" && coinJumpLeft > 0) renderHarbor();
  if (surface === "sea" && (particles.length || flash || (callout && now < calloutUntil + 30))) {
    const keep = status;
    renderSea();
    status = keep;
  }
  if (surface === "settle" && settleGuide) {
    const ctx = bg.getContext("2d");
    paintSea(ctx, COPY.looks.harbor);
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
