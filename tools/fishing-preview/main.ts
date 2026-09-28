/**
 * 浏览器灰盒。画面是 Canvas2D，规则直接 import 同一套 assets/scripts/fishing。
 * 非 Cocos 实机。快进只加快预览时钟，不改判定。
 */
import { FishingTrip } from "../../assets/scripts/fishing/FishingTrip";
import { FISH_RGB } from "../../assets/scripts/fishing/present";
import { PERIOD_IDS, PERIODS, WATER_IDS, WATERS, type PeriodId, type WaterId } from "../../assets/scripts/fishing/Waters";

const canvas = document.querySelector("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
function seeded(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    let x = state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    state = x >>> 0;
    return state / 0x1_0000_0000;
  };
}

const params = new URLSearchParams(location.search);
const seed = Number(params.get("seed"));
const trip = new FishingTrip({
  rng: Number.isFinite(seed) && seed > 0 ? seeded(seed) : Math.random,
  money: 0,
});
let speed = 1;
let last = performance.now();
let uiKey = "";

const bar = document.querySelector("#bar") as HTMLElement;
const shop = document.querySelector("#shop") as HTMLElement;
const actions = document.querySelector("#actions") as HTMLElement;
const hold = document.querySelector("#hold") as HTMLButtonElement;
const back = document.querySelector("#back") as HTMLButtonElement;
const speedBtn = document.querySelector("#speed") as HTMLButtonElement;

for (const id of WATER_IDS) {
  const button = document.createElement("button");
  button.dataset.water = id;
  button.textContent = WATERS[id].name;
  button.addEventListener("click", () => trip.setWater(id));
  bar.append(button);
}
for (const id of PERIOD_IDS) {
  const button = document.createElement("button");
  button.dataset.period = id;
  button.textContent = PERIODS[id].name;
  button.addEventListener("click", () => trip.setPeriod(id));
  bar.append(button);
}

hold.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  trip.setHeld(true);
});
hold.addEventListener("pointerup", () => trip.setHeld(false));
hold.addEventListener("pointercancel", () => trip.setHeld(false));
back.addEventListener("click", () => trip.toDock());
speedBtn.addEventListener("click", () => {
  speed = speed === 1 ? 8 : 1;
  speedBtn.textContent = speed === 1 ? "快进" : "原速";
});

const api = {
  trip,
  setSpeed(value: number) {
    speed = value;
    speedBtn.textContent = speed === 1 ? "快进" : `${speed}倍`;
  },
  get speed() { return speed; },
  view() { return trip.view; },
};
(window as unknown as { __fishing: typeof api }).__fishing = api;

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000) * speed;
  last = now;
  if (dt > 0) trip.tick(dt);
  paint();
  sync();
  requestAnimationFrame(frame);
}

function paint(): void {
  const view = trip.view;
  const sky = skyRgb(view.periodId);
  const water = waterRgb(view.waterId);
  ctx.clearRect(0, 0, 1280, 720);
  ctx.fillStyle = rgb(sky);
  ctx.fillRect(0, 0, 1280, 250);
  ctx.fillStyle = rgb(water);
  ctx.fillRect(0, 230, 1280, 490);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, 230, 1280, 16);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 6; i++) ctx.fillRect(0, 300 + i * 62, 1280, 8);

  ctx.fillStyle = "#c47a3a";
  ctx.fillRect(80, 250, 280, 22);
  ctx.fillStyle = "#6b3d22";
  ctx.fillRect(110, 272, 18, 70);
  ctx.fillRect(300, 272, 18, 70);
  ctx.fillStyle = "#e2c48a";
  ctx.beginPath();
  ctx.moveTo(70, 268);
  ctx.lineTo(210, 214);
  ctx.lineTo(360, 268);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#d8b070";
  ctx.beginPath();
  ctx.moveTo(150, 300);
  ctx.lineTo(250, 300);
  ctx.lineTo(270, 340);
  ctx.lineTo(130, 340);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#8a5a32";
  ctx.fillRect(168, 248, 8, 54);

  const bobberX = 430 + Math.min(1, view.reach / 48) * 420;
  const bobberY = 268 + view.dip * 28 + (view.phase === "fighting" ? 8 + view.surge * 18 : 0);
  if (view.phase === "charging" || view.phase === "waiting" || view.phase === "nibbling" || view.phase === "hook" || view.phase === "fighting") {
    ctx.strokeStyle = "#f4f1e4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(176, 248);
    ctx.quadraticCurveTo((176 + bobberX) / 2, 180, bobberX, bobberY);
    ctx.stroke();
    ctx.fillStyle = "#f04330";
    ctx.beginPath();
    ctx.arc(bobberX, bobberY, view.phase === "hook" ? 16 : 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(bobberX, bobberY - 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if ((view.phase === "fighting" || view.phase === "card") && view.species) drawFish(view.species, view.phase === "card" ? 760 : bobberX + 40, view.phase === "card" ? 360 : bobberY + 24, view.kg);

  ctx.fillStyle = view.periodId === "night" ? "#f6f3ea" : "#1c2a30";
  ctx.font = '700 28px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillText("出海钓鱼", 24, 40);
  ctx.font = '18px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillText(`${view.waterName} · ${view.periodName}`, 180, 40);
  ctx.textAlign = "right";
  ctx.fillText(`金币 ${Math.floor(view.coins)}    鱼舱 ${view.holdKg.toFixed(1)}/${view.holdCap}kg`, 1120, 40);
  ctx.textAlign = "left";

  ctx.font = '20px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillStyle = "#fff8e8";
  ctx.fillText(view.hint, 24, 188);
  ctx.font = '16px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillText(`线 ${view.lineKg}kg · 收线 ${view.reelSpeed.toFixed(1)} · 抛投 ${view.castM}m · 舱 ${view.holdCap}kg · 绿区 ${(view.bandHi - view.bandLo).toFixed(2)}`, 24, 214);

  if (view.phase === "charging") {
    ctx.fillStyle = "rgba(10,16,22,0.55)";
    ctx.fillRect(430, 150, 420, 28);
    ctx.fillStyle = "#ffb030";
    ctx.fillRect(430, 150, 420 * view.power, 28);
    ctx.fillStyle = "#1c2a30";
    ctx.font = '16px "WenQuanYi Micro Hei", sans-serif';

    ctx.fillText(`蓄力 ${Math.round(view.power * 100)}%`, 590, 170);
  }

  if (view.phase === "fighting" || view.phase === "hook") drawTension();
  if (view.phase === "card") drawCard();
  if (view.phase === "dock") drawStall();

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = '14px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillText("灰盒预览 · 非 Cocos 实机 · 规则与游戏内同一套", 24, 700);
}

function drawTension(): void {
  const view = trip.view;
  const x = 1088;
  const y = 180;
  const h = 360;
  ctx.fillStyle = "rgba(8,12,18,0.82)";
  ctx.fillRect(x, y, 54, h);
  const scale = 1.35;
  const lo = y + (1 - view.bandHi / scale) * h;
  const hi = y + (1 - view.bandLo / scale) * h;
  ctx.fillStyle = "#2fa86a";
  ctx.fillRect(x + 8, lo, 38, Math.max(10, hi - lo));
  ctx.fillStyle = "#e8fff1";
  ctx.font = '14px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillText("绿区", x + 10, (lo + hi) / 2);
  const marker = y + (1 - Math.max(0, Math.min(scale, view.tension)) / scale) * h;
  ctx.fillStyle = view.tension > 1 ? "#ff5a4a" : "#ffe27a";
  ctx.fillRect(x - 14, marker - 5, 82, 10);
  ctx.fillStyle = "#fff";
  ctx.font = '16px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillText(`拉力 ${view.tension.toFixed(2)}`, x - 20, y + h + 28);
  ctx.fillText(`距离 ${view.distance.toFixed(1)}m`, x - 20, y + h + 52);
  ctx.fillText(`体力 ${Math.round(view.stamina * 100)}%`, x - 20, y + h + 76);
  if (view.surge > 0.55) {
    ctx.fillStyle = "#ffb030";
    ctx.font = '700 28px "WenQuanYi Micro Hei", sans-serif';

    ctx.fillText("松手", x - 10, y - 16);
  }
}

function drawCard(): void {
  const view = trip.view;
  ctx.fillStyle = "rgba(10,18,24,0.78)";
  ctx.fillRect(360, 230, 560, 250);
  ctx.strokeStyle = "#ffd27a";
  ctx.lineWidth = 3;
  ctx.strokeRect(360, 230, 560, 250);
  ctx.fillStyle = "#fff6df";
  ctx.font = '700 36px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillText(view.speciesName || "渔获", 390, 290);
  ctx.font = '22px "WenQuanYi Micro Hei", sans-serif';

  const flag = view.isRecord ? "新纪录" : view.isNew ? "新鱼种" : view.rarity;
  ctx.fillText(`${flag} · ${view.rarity}`, 390, 330);
  ctx.fillText(`长度 ${view.cm} cm`, 390, 372);
  ctx.fillText(`重量 ${view.kg.toFixed(2)} kg`, 390, 408);
  ctx.fillText(`售价 ${view.value} 金`, 620, 372);
  ctx.fillText(view.kept ? "已进冷藏箱" : "鱼舱满了，已放生", 620, 408);
}

function drawStall(): void {
  const view = trip.view;
  ctx.fillStyle = "#efd7a4";
  ctx.fillRect(70, 230, 520, 300);
  ctx.fillStyle = "#d3543c";
  ctx.beginPath();
  ctx.moveTo(60, 240);
  ctx.lineTo(330, 188);
  ctx.lineTo(600, 240);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a2a22";
  ctx.font = '700 26px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillText("鱼贩 · 船具", 90, 280);
  ctx.font = '18px "WenQuanYi Micro Hei", sans-serif';

  ctx.fillText(`线 ${view.lineKg}kg · 收线 ${view.reelSpeed.toFixed(1)} · 抛投 ${view.castM}m · 舱 ${view.holdCap}kg`, 90, 312);
  ctx.font = '16px "WenQuanYi Micro Hei", sans-serif';

  const rows = trip.logRows();
  ctx.fillText(rows.length ? `图鉴 ${rows.map((row) => `${row.name} ${row.bestKg.toFixed(1)}kg`).join("  ")}` : "图鉴还是空的", 90, 500);
}

function drawFish(id: string, x: number, y: number, kg: number): void {
  const rgb = FISH_RGB[id] ?? [180, 200, 190];
  const len = 90 + Math.min(120, kg * 10);
  ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  ctx.beginPath();
  ctx.moveTo(x - len * 0.45, y);
  ctx.lineTo(x + len * 0.2, y - 22);
  ctx.lineTo(x + len * 0.55, y);
  ctx.lineTo(x + len * 0.2, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#142028";
  ctx.beginPath();
  ctx.arc(x + len * 0.22, y - 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

function sync(): void {
  const view = trip.view;
  const key = trip.uiKey();
  hold.classList.toggle("hide", view.phase === "dock" || view.phase === "card" || view.phase === "miss");
  hold.textContent = holdCaption();
  back.classList.toggle("hide", view.phase === "dock");
  bar.classList.toggle("hide", view.phase !== "dock" && view.phase !== "ready");
  for (const button of bar.querySelectorAll("button")) {
    const water = button.dataset.water as WaterId | undefined;
    const period = button.dataset.period as PeriodId | undefined;
    button.classList.toggle("on", water === view.waterId || period === view.periodId);
  }
  if (key === uiKey) return;
  uiKey = key;
  shop.replaceChildren();
  actions.replaceChildren();
  if (view.phase === "dock") {
    for (const row of trip.shopRows()) {
      const button = document.createElement("button");
      button.dataset.buy = row.key;
      button.textContent = row.nextCost == null
        ? `${row.name} 满级 · ${row.currentLabel}`
        : `${row.name}  ${row.currentLabel}  →  ${row.nextLabel}  ${row.nextCost}金`;
      button.disabled = row.nextCost == null;
      button.classList.toggle("on", row.affordable);
      button.addEventListener("click", () => trip.buy(row.key));
      shop.append(button);
    }
    const sell = document.createElement("button");
    sell.dataset.action = "sell";
    sell.textContent = `卖出全部 ${view.holdCount} 条`;
    sell.addEventListener("click", () => trip.sellAll());
    actions.append(sell);
    const go = document.createElement("button");
    go.dataset.action = "sea";
    go.textContent = "去钓";
    go.classList.add("on");
    go.addEventListener("click", () => trip.toReady());
    actions.append(go);
  }
  if (view.phase === "card" || view.phase === "miss") {
    const again = document.createElement("button");
    again.dataset.action = "again";
    again.textContent = "再抛一竿";
    again.classList.add("on");
    again.addEventListener("click", () => trip.toReady());
    actions.append(again);
    const dock = document.createElement("button");
    dock.dataset.action = "dock";
    dock.textContent = "回摊卖鱼";
    dock.addEventListener("click", () => trip.toDock());
    actions.append(dock);
  }
}

function holdCaption(): string {
  const view = trip.view;
  if (view.phase === "charging") return "松手抛出";
  if (view.phase === "waiting") return "等咬钩";
  if (view.phase === "nibbling") return "先别提竿";
  if (view.phase === "hook") return "提竿！";
  if (view.phase === "fighting") return view.surge > 0.55 ? "松开！鱼在冲" : "按住收线";
  return "按住抛竿";
}

function rgb(color: [number, number, number]): string {
  return `rgb(${color[0]},${color[1]},${color[2]})`;
}

function skyRgb(period: PeriodId): [number, number, number] {
  if (period === "dawn") return [244, 196, 138];
  if (period === "dusk") return [214, 122, 86];
  if (period === "night") return [28, 40, 64];
  return [142, 206, 228];
}

function waterRgb(water: WaterId): [number, number, number] {
  if (water === "shallows") return [126, 198, 186];
  if (water === "pier") return [58, 126, 166];
  if (water === "reef") return [32, 140, 128];
  if (water === "deep") return [18, 48, 78];
  return [36, 112, 158];
}

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) return;
  event.preventDefault();
  trip.setHeld(true);
});
window.addEventListener("keyup", (event) => {
  if (event.code === "Space") trip.setHeld(false);
});

requestAnimationFrame(frame);
