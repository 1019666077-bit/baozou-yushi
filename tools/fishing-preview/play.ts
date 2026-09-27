/**
 * 第一人称钓鱼预览。规则来自 assets/scripts/fishing，画面是卡通低多边形。
 * 构建成 docs/fishing-play/，用相对路径，不需要服务器。
 */
import * as THREE from "three";
import { AUDIO_CLIPS } from "../../assets/scripts/fishing/audio/bank";
import { FishingTrip } from "../../assets/scripts/fishing/FishingTrip";
import { FISH } from "../../assets/scripts/fishing/FishTable";
import {
  FISH_LOOK,
  GUIDE_CARDS,
  JOE_GREETING,
  JOE_IDLE,
  MARTA_GREETING,
} from "../../assets/scripts/fishing/present";
import {
  blankCameraPoints,
  LINE_SEGS,
  RodRig,
  type RodFrame,
} from "../../assets/scripts/fishing/RodRig";

function seeded(seed: number): () => number {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1000000) / 1000000;
  };
}

const params = new URLSearchParams(location.search);
const trip = new FishingTrip({ rng: seeded(Number(params.get("seed") || 2)), money: 0 });
const rig = new RodRig();
rig.equip(true);
let speed = Number(params.get("speed") || 1);
let lastPhase = trip.view.phase;
let castArmed = false;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x9ec8e2, 1);
document.getElementById("view")!.append(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb7d4e6, 26, 95);
scene.add(new THREE.AmbientLight(0x9eb8c8, 0.62));
const sun = new THREE.DirectionalLight(0xfff0d2, 1.45);
sun.position.set(-12, 18, 8);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 180);
scene.add(camera);
const rodRoot = new THREE.Group();
camera.add(rodRoot);

const wood = new THREE.MeshLambertMaterial({ color: 0xc4a06a });
const woodDark = new THREE.MeshLambertMaterial({ color: 0x8a6240 });
const railMat = new THREE.MeshLambertMaterial({ color: 0xd7c4a2 });
const sandMat = new THREE.MeshLambertMaterial({ color: 0xe6d3a4 });
const wetMat = new THREE.MeshLambertMaterial({ color: 0xcbb98a });
const boatMat = new THREE.MeshLambertMaterial({ color: 0xf2efe6 });
const hullMat = new THREE.MeshLambertMaterial({ color: 0x2d4a44 });
const shirtMat = new THREE.MeshLambertMaterial({ color: 0x5d7a8c });
const apronMat = new THREE.MeshLambertMaterial({ color: 0xd8b24a });
const martaMat = new THREE.MeshLambertMaterial({ color: 0x8a3b32 });

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function buildPier(): void {
  box(2.8, 0.18, 36, wood, 55, 2.22, 26);
  for (let z = 16; z <= 42; z += 2.2) {
    for (const side of [-1, 1]) {
      box(0.14, 1.45, 0.14, woodDark, 55 + side * 1.25, 2.95, z);
    }
    box(0.1, 0.1, 2.2, railMat, 55 - 1.25, 3.62, z);
    box(0.1, 0.1, 2.2, railMat, 55 + 1.25, 3.62, z);
  }
  box(14, 0.2, 7, wood, 55, 2.24, 36.5);
  for (const side of [-1, 1]) {
    box(7, 0.12, 0.12, railMat, 55, 3.62, 36.5 + side * 3.3);
  }
  box(8, 0.2, 6, sandMat, 52, 1.2, 8);
}

function buildBeach(): void {
  box(90, 0.4, 36, sandMat, 20, -0.15, -58);
  box(90, 0.2, 8, wetMat, 20, -0.05, -42);
}

function buildBoat(): THREE.Group {
  const g = new THREE.Group();
  box(2.4, 0.7, 6.2, hullMat, 0, 0.2, 0, g);
  box(2.1, 0.12, 4.2, boatMat, 0, 0.62, -0.2, g);
  box(0.08, 0.7, 0.08, woodDark, -1, 1.1, 1.6, g);
  box(0.08, 0.7, 0.08, woodDark, 1, 1.1, 1.6, g);
  scene.add(g);
  return g;
}

function figure(parent: THREE.Object3D, shirt: THREE.Material, apron: THREE.Material): void {
  const skin = new THREE.MeshLambertMaterial({ color: 0xc48a62 });
  box(0.36, 0.5, 0.22, shirt, 0, 1.15, 0, parent);
  box(0.32, 0.55, 0.04, apron, 0, 0.95, 0.12, parent);
  box(0.22, 0.22, 0.2, skin, 0, 1.55, 0, parent);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.1, 8), wood);
  hat.position.set(0, 1.72, 0);
  parent.add(hat);
  box(0.12, 0.45, 0.12, new THREE.MeshLambertMaterial({ color: 0x3f4a3c }), -0.1, 0.45, 0, parent);
  box(0.12, 0.45, 0.12, new THREE.MeshLambertMaterial({ color: 0x3f4a3c }), 0.1, 0.45, 0, parent);
}

function buildStall(x: number, z: number, shirt: THREE.Material, apron: THREE.Material, sign: string): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  box(2.4, 0.12, 1.4, wood, 0, 1.05, 0.4, g);
  box(0.1, 1.1, 0.1, woodDark, -1.1, 0.55, 0.9, g);
  box(0.1, 1.1, 0.1, woodDark, 1.1, 0.55, 0.9, g);
  box(2.6, 0.08, 1.6, new THREE.MeshLambertMaterial({ color: 0x8d4a3a }), 0, 2.05, 0.2, g);
  const person = new THREE.Group();
  person.position.set(0, 0, -0.15);
  figure(person, shirt, apron);
  g.add(person);
  scene.add(g);
  g.userData.sign = sign;
  return g;
}

buildPier();
buildBeach();
const boat = buildBoat();
const joe = buildStall(49.2, 14, shirtMat, apronMat, "乔");
const marta = buildStall(62, 18, martaMat, new THREE.MeshLambertMaterial({ color: 0x3d5a4a }), "玛塔");

const waterGeo = new THREE.PlaneGeometry(220, 180, 48, 24);
waterGeo.rotateX(-Math.PI / 2);
const baseY = waterGeo.attributes.position.array.slice();
const colors = new Float32Array(waterGeo.attributes.position.count * 3);
const pos0 = waterGeo.attributes.position;
for (let i = 0; i < pos0.count; i++) {
  const z = pos0.getZ(i);
  const t = Math.min(1, Math.max(0, (z + 40) / 120));
  colors[i * 3] = 0.25 + (0.05 - 0.25) * t;
  colors[i * 3 + 1] = 0.72 + (0.28 - 0.72) * t;
  colors[i * 3 + 2] = 0.78 + (0.42 - 0.78) * t;
}
waterGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
const water = new THREE.Mesh(
  waterGeo,
  new THREE.MeshLambertMaterial({ vertexColors: true }),
);
water.position.set(40, 0, 30);
scene.add(water);

const blankMat = new THREE.MeshLambertMaterial({ color: 0x1c2128 });
const reelMat = new THREE.MeshLambertMaterial({ color: 0x3a3e44 });
const goldMat = new THREE.MeshLambertMaterial({ color: 0xc6a15a });
const segments: THREE.Mesh[] = [];
for (let i = 0; i < 11; i++) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 1, 6), blankMat);
  rodRoot.add(mesh);
  segments.push(mesh);
}
const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), reelMat);
reel.rotation.z = Math.PI / 2;
rodRoot.add(reel);
const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 6, 12), goldMat);
rodRoot.add(rotor);
const crank = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), goldMat);
rodRoot.add(crank);
const bail = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.004, 6, 10, Math.PI), new THREE.MeshLambertMaterial({ color: 0xd5dbdf }));
rodRoot.add(bail);

const lineGeo = new THREE.BufferGeometry();
const linePos = new Float32Array((LINE_SEGS + 1) * 2 * 3);
lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
const lineIdx: number[] = [];
for (let i = 0; i < LINE_SEGS; i++) {
  const a = i * 2;
  lineIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
}
lineGeo.setIndex(lineIdx);
const lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xf4f7ea, side: THREE.DoubleSide }));
camera.add(lineMesh);

const bobber = new THREE.Group();
const bobTop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd24a3a }));
const bobBot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf4efe4 }));
bobTop.scale.y = 0.5;
bobBot.scale.y = 0.5;
bobTop.position.y = 0.02;
bobBot.position.y = -0.02;
bobber.add(bobTop, bobBot);
const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), new THREE.MeshLambertMaterial({ color: 0xf0d24a }));
stick.position.y = 0.12;
bobber.add(stick);
scene.add(bobber);

const splashBits: THREE.Mesh[] = [];
for (let i = 0; i < 10; i++) {
  const bit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: 0xe7f6f8, transparent: true, opacity: 0.8 }));
  bit.visible = false;
  scene.add(bit);
  splashBits.push(bit);
}

const fishRoot = new THREE.Group();
camera.add(fishRoot);
fishRoot.visible = false;

function makeFish(id: string, kg: number): THREE.Group {
  const look = FISH_LOOK[id] ?? FISH_LOOK.mullet;
  const length = Math.max(0.7, Math.min(1.8, 0.9 + Math.cbrt(Math.max(kg, 0.05))));
  const fat = Math.max(look.body, 0.22);
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(look.rgb[0] / 255, look.rgb[1] / 255, look.rgb[2] / 255) });
  const accent = new THREE.MeshLambertMaterial({ color: new THREE.Color(look.accent[0] / 255, look.accent[1] / 255, look.accent[2] / 255) });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), bodyMat);
  body.scale.set(length, length * fat * 1.5, length * fat * 0.55);
  g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(length * 0.28, length * fat * 1.3, 0.04), accent);
  tail.position.x = length * 0.55;
  g.add(tail);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(length * 0.045, 6, 6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  eye.position.set(-length * (0.28 + look.snout * 0.4), length * fat * 0.35, length * fat * 0.4);
  g.add(eye);
  g.rotation.y = Math.PI / 2;
  return g;
}

let shownFish = "";
function syncFish(id: string, kg: number): void {
  if (shownFish === id) return;
  fishRoot.clear();
  fishRoot.add(makeFish(id, kg));
  shownFish = id;
}

const audio: { [id: string]: HTMLAudioElement } = {};
for (const id of Object.keys(AUDIO_CLIPS)) {
  const el = new Audio(`audio/${AUDIO_CLIPS[id].file}`);
  el.preload = "auto";
  if (AUDIO_CLIPS[id].loop) el.loop = true;
  audio[id] = el;
}
function playClip(id: string): void {
  const el = audio[id];
  const clip = AUDIO_CLIPS[id];
  if (!el || !clip) return;
  const slice = clip.slices?.[Math.floor(Math.random() * clip.slices.length)];
  try {
    el.currentTime = slice ? slice[0] : 0;
    void el.play();
  } catch { /* 浏览器还没允许声音 */ }
}

const hud = document.getElementById("hud")!;
hud.innerHTML = `
  <div class="purse"><span class="money" id="money">0 金</span><span class="cooler"><span id="coolerLabel">冷藏箱</span> <b class="bar" id="coolerBar"><i></i></b> <span id="coolerKg">0 / 30 kg</span></span></div>
  <div class="dock" id="dock"></div>
  <div class="fight" id="fight"><div class="fight-head"><span id="fightCall">收线</span><span id="fightDist">0 m</span></div><div class="tension"><span class="band" id="band"></span><span class="danger"></span><span class="needle" id="needle"></span></div><div class="stam"><i id="stam"></i></div></div>
  <div class="bite" id="bite">！</div>
  <div class="cast" id="cast"><i></i></div>
  <div class="hint" id="hint"></div>
  <button id="hold" type="button">按住蓄力 / 提竿 / 收线</button>
  <div class="map" id="map" aria-hidden="true"></div>
  <div class="tip" id="tip"></div>
  <div class="panel" id="panel"></div>
  <div class="catch" id="catch"></div>
  <div class="guide" id="guide"></div>
`;

const dock = document.getElementById("dock")!;
function dockButton(label: string, act: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.dataset.act = act;
  b.addEventListener("click", () => onAct(act));
  dock.append(b);
  return b;
}
for (const [id, label] of [["pier", "码头"], ["beach", "沙滩"], ["boat", "船"]] as const) dockButton(label, id);
for (const [id, label] of [["dawn", "清晨"], ["day", "白天"], ["dusk", "黄昏"], ["night", "夜晚"]] as const) dockButton(label, id);
dockButton("海湾", "bay");
dockButton("礁缘", "reef");
dockButton("深海", "deep");
dockButton("乔", "joe");
dockButton("玛塔", "marta");
dockButton("鱼舱", "cooler");
dockButton("拿出鱼竿", "ready");
dockButton("收回", "retrieve");

let panelKind = "";
function onAct(act: string): void {
  if (act === "pier" || act === "beach" || act === "boat") {
    trip.setSpot(act);
    panelKind = "";
  } else if (act === "dawn" || act === "day" || act === "dusk" || act === "night") trip.setPeriod(act);
  else if (act === "bay" || act === "reef" || act === "deep") trip.setWaypoint(act);
  else if (act === "joe") panelKind = panelKind === "joe" ? "" : "joe";
  else if (act === "marta") panelKind = panelKind === "marta" ? "" : "marta";
  else if (act === "cooler") panelKind = panelKind === "cooler" ? "" : "cooler";
  else if (act === "retrieve") rig.retrieve();
  else if (act === "skip") trip.skipGuide();
  else if (act === "next") trip.nextGuide();
  else if (act === "ready") { trip.toReady(); panelKind = ""; }
  else if (act === "sellall") { trip.sellAll(); playClip("coins"); }
  else if (act.startsWith("sell:")) { trip.sellOne(Number(act.slice(5))); playClip("coins"); }
  else if (act.startsWith("buy:")) trip.buy(act.slice(4) as "line");
  else if (act === "fuel") trip.refuel();
  else if (act === "close") panelKind = "";
  else if (act === "again") trip.toReady();
  paintPanel();
}

const hold = document.getElementById("hold")!;
function setHold(down: boolean): void {
  if (trip.view.phase === "card" && down) {
    trip.toReady();
    return;
  }
  trip.setHeld(down);
}
hold.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  hold.setPointerCapture(event.pointerId);
  setHold(true);
});
hold.addEventListener("pointerup", () => setHold(false));
hold.addEventListener("pointercancel", () => setHold(false));

function paintGuide(): void {
  const root = document.getElementById("guide")!;
  const open = trip.view.guideOpen;
  root.classList.toggle("on", open);
  if (!open) return;
  const card = GUIDE_CARDS[trip.view.guideStep] ?? GUIDE_CARDS[0];
  root.innerHTML = `<div class="card"><div class="badge">${card.eyebrow}</div><h2>${card.title}</h2><p>${card.body}</p><div class="foot"><button type="button" id="skip">跳过</button><button type="button" id="next">${trip.view.guideStep === 2 ? "开始钓鱼" : "下一步"}</button></div></div>`;
  root.querySelector("#skip")!.addEventListener("click", () => onAct("skip"));
  root.querySelector("#next")!.addEventListener("click", () => onAct("next"));
}

function paintPanel(): void {
  const panel = document.getElementById("panel")!;
  panel.classList.toggle("on", panelKind !== "" && !trip.view.guideOpen && trip.view.phase !== "card");
  if (!panel.classList.contains("on")) {
    panel.innerHTML = "";
    return;
  }
  if (panelKind === "marta") {
    const rows = trip.shopRows().map((row) => {
      const btn = row.nextCost === null
        ? `<span>已经是最好的</span>`
        : `<button type="button" data-act="buy:${row.key}" ${row.affordable ? "" : "disabled"}>${row.nextCost} 金</button>`;
      return `<div class="shop-row"><div class="shop-copy"><b>${row.name}</b><small>现在：${row.currentLabel}${row.nextLabel ? ` · 下一级 ${row.nextLabel}` : ""}</small></div>${btn}</div>`;
    }).join("");
    const missing = trip.view.fuelCap - trip.view.fuelL;
    const fuel = `<div class="shop-row"><div class="shop-copy"><b>柴油</b><small>油箱 ${trip.view.fuelL.toFixed(0)} / ${trip.view.fuelCap} 升 · ${trip.fuelPrice()} 金/升</small></div>${missing > 0.5 ? `<button type="button" data-act="fuel">加满</button>` : `<span>满的</span>`}</div>`;
    panel.innerHTML = `<h2>玛塔 · 渔具</h2><p class="sub">${MARTA_GREETING} 你有 ${trip.view.coins} 金。</p>${fuel}${rows}<div class="foot"><button type="button" data-act="close">离开</button></div>`;
  } else if (panelKind === "joe") {
    const rows = trip.holdRows();
    const list = rows.map((row) => `<div class="fish-row"><div class="fish-copy"><b>${row.name}</b><small>${row.cm} cm · ${row.kg.toFixed(2)} kg</small></div><button type="button" data-act="sell:${row.id}">卖掉 ${row.value}</button></div>`).join("");
    panel.innerHTML = `<h2>乔 · 鱼贩</h2><p class="sub">${rows.length ? JOE_GREETING : JOE_IDLE}</p>${list || `<p class="sub">冷藏箱是空的。</p>`}<div class="foot"><button type="button" data-act="close">离开</button><button type="button" data-act="sellall" ${rows.length ? "" : "disabled"}>全部卖掉 · ${trip.view.holdValue}</button></div>`;
  } else {
    const rows = trip.holdRows().map((row) => `<div class="fish-row"><div class="fish-copy"><b>${row.name}</b><small>${row.cm} cm · ${row.kg.toFixed(2)} kg</small></div><span>${row.value} 金</span></div>`).join("");
    const log = trip.logRows().map((row) => `${row.name}：${row.count} 条，最好 ${row.bestKg.toFixed(2)} kg`).join("<br>");
    panel.innerHTML = `<h2>${trip.state.upgrades.hold > 0 ? "鱼舱" : "冷藏箱"}</h2><p class="sub">${trip.view.holdCount} 条 · ${trip.view.holdKg.toFixed(1)} / ${trip.view.holdCap} kg</p>${rows || `<p class="sub">还没有。从沙滩、码头或船上抛。</p>`}${log ? `<p class="sub">${log}</p>` : ""}<div class="foot"><button type="button" data-act="close">离开</button><button type="button" data-act="ready">拿出鱼竿</button></div>`;
  }
  panel.querySelectorAll("button[data-act]").forEach((button) => {
    button.addEventListener("click", () => onAct((button as HTMLButtonElement).dataset.act || ""));
  });
}

function paintCatch(): void {
  const root = document.getElementById("catch")!;
  const on = trip.view.phase === "card";
  root.classList.toggle("on", on);
  if (!on) return;
  const fish = FISH[trip.view.species];
  const badge = trip.view.isRecord ? `<span class="badge record">新纪录</span>` : trip.view.isNew ? `<span class="badge new">新鱼种</span>` : `<span class="badge">渔获</span>`;
  const note = !trip.view.kept
    ? "冷藏箱没有空了，这条放了。"
    : trip.view.isRecord
      ? `上一杆 ${trip.view.prevBestKg.toFixed(2)} kg · ${trip.view.prevBestCm} cm。`
      : trip.view.isNew
        ? "第一次写进鱼录。"
        : `你的最好成绩：${trip.view.prevBestKg.toFixed(2)} kg · ${trip.view.prevBestCm} cm`;
  root.innerHTML = `<div>${badge}<h2>${trip.view.speciesName}</h2><div class="sci">${fish?.sci ?? ""}</div></div><div class="stage"></div><div><div class="stats"><div class="stat"><span>体长</span><b>${trip.view.cm}</b></div><div class="stat"><span>体重</span><b>${trip.view.kg.toFixed(trip.view.kg < 1 ? 2 : 1)}</b></div><div class="stat"><span>价值</span><b>${trip.view.value}</b></div></div><p>${note}</p><p>点按住键继续</p></div>`;
}

let panelStamp = "";
function syncHud(): void {
  const v = trip.view;
  document.getElementById("money")!.textContent = `${v.coins} 金`;
  document.getElementById("coolerLabel")!.textContent = trip.state.upgrades.hold > 0 ? "鱼舱" : "冷藏箱";
  document.getElementById("coolerKg")!.textContent = `${v.holdKg.toFixed(1)} / ${v.holdCap} kg`;
  const fill = document.querySelector("#coolerBar > i") as HTMLElement;
  fill.style.width = `${Math.min(100, v.holdKg / v.holdCap * 100)}%`;
  document.getElementById("coolerBar")!.classList.toggle("hot", v.holdKg > v.holdCap * 0.9);
  document.getElementById("hint")!.textContent = v.hint;
  document.getElementById("fight")!.classList.toggle("on", v.phase === "fighting");
  if (v.phase === "fighting") {
    const call = document.getElementById("fightCall")!;
    call.textContent = v.fightCall;
    call.className = v.tension > 0.88 || v.surge > 0.55 || v.tension < 0.15 ? "warn" : v.fightCall === "力度正好" ? "good" : "";
    document.getElementById("fightDist")!.textContent = `${v.distance.toFixed(1)} m`;
    const needle = document.getElementById("needle")!;
    needle.style.left = `${Math.min(v.tension, 1.05) / 1.05 * 100}%`;
    const band = document.getElementById("band")!;
    band.style.left = `${v.bandLo / 1.05 * 100}%`;
    band.style.width = `${(v.bandHi - v.bandLo) / 1.05 * 100}%`;
    (document.getElementById("stam") as HTMLElement).style.width = `${v.stamina * 100}%`;
  }
  document.getElementById("bite")!.classList.toggle("on", v.phase === "hook");
  const cast = document.getElementById("cast")!;
  cast.classList.toggle("on", v.phase === "charging");
  (cast.firstElementChild as HTMLElement).style.width = `${v.power * 100}%`;
  document.getElementById("tip")!.classList.toggle("on", !!v.tip);
  document.getElementById("tip")!.textContent = v.tip;
  const stamp = `${panelKind}|${v.coins}|${v.holdCount}|${v.phase}|${v.guideOpen}|${v.guideStep}|${trip.uiKey()}`;
  if (stamp !== panelStamp) {
    panelStamp = stamp;
    paintGuide();
    paintPanel();
    paintCatch();
    dock.querySelectorAll("button").forEach((button) => {
      const act = (button as HTMLButtonElement).dataset.act;
      const on = act === v.spot || act === v.periodId || (v.spot === "boat" && act === v.waypoint);
      button.classList.toggle("on", on);
    });
  }
  const map = document.getElementById("map")!;
  map.innerHTML = `<i style="left:50%;top:62%;background:#fff"></i><i style="left:42%;top:78%;background:#f0c46a" title="乔"></i><i style="left:70%;top:55%;background:#6fd6c6" title="玛塔"></i><i style="left:58%;top:30%;background:#f2efe6" title="船"></i>`;
  const browsing = v.phase === "dock" || v.phase === "ready" || v.phase === "miss";
  dock.style.visibility = browsing && !v.guideOpen ? "visible" : "hidden";
}

function syncRig(dt: number): void {
  const v = trip.view;
  rig.setGear(v.castM, v.reelSpeed);
  const frame: RodFrame = {
    camX: v.eyeX,
    camY: v.eyeY,
    camZ: v.eyeZ,
    yaw: 0,
    waterY: v.spot === "beach" ? 0 : 0,
    fight: v.phase === "fighting" ? { distance: v.distance, tension: v.tension, surge: v.surge } : null,
    dip: v.dip,
  };
  if (v.phase === "ready" && lastPhase !== "ready" && rig.state !== "idle") rig.equip(true);
  if (v.phase === "charging" && rig.state === "idle") {
    rig.startWindup();
    castArmed = true;
  }
  if (lastPhase === "charging" && v.phase === "waiting" && castArmed) {
    rig.release(v.bobX, v.bobZ);
    playClip("rod_swish");
    playClip("line_out");
    castArmed = false;
  }
  if ((v.phase === "hook" || v.phase === "fighting") && rig.state === "floating") {
    rig.hook();
    if (lastPhase !== "fighting" && lastPhase !== "hook") playClip("fish_splash");
  }
  if (v.phase === "card" && lastPhase !== "card") {
    rig.land();
    playClip("fish_flop");
    syncFish(v.species, v.kg);
  }
  if (v.phase === "miss" && lastPhase !== "miss") {
    if (v.notice.includes("断")) playClip("line_snap");
    rig.retrieve();
  }
  if (rig.state === "flying" && rig.splash > 0.95) playClip("plop");
  rig.update(dt, frame);
  lastPhase = v.phase;

  camera.position.set(v.eyeX, v.eyeY, v.eyeZ);
  camera.up.set(0, 1, 0);
  camera.lookAt(v.eyeX, 2.35, v.eyeZ + 8);
  if (v.spot === "boat") {
    boat.visible = true;
    boat.position.set(v.eyeX, 0.15, v.eyeZ + 1.2);
  } else boat.visible = v.spot === "pier";
  if (v.spot === "pier") boat.position.set(64.5, 0.15, 36.5);

  const pts = blankCameraPoints(rig, 12);
  for (let i = 0; i < segments.length; i++) {
    const ax = pts[i * 3];
    const ay = pts[i * 3 + 1];
    const az = pts[i * 3 + 2];
    const bx = pts[(i + 1) * 3];
    const by = pts[(i + 1) * 3 + 1];
    const bz = pts[(i + 1) * 3 + 2];
    segments[i].position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    segments[i].scale.set(1, Math.max(0.05, Math.hypot(bx - ax, by - ay, bz - az)), 1);
    segments[i].quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(bx - ax, by - ay, bz - az).normalize(),
    );
    const taper = 1 - i / segments.length;
    segments[i].scale.x = 0.45 + taper;
    segments[i].scale.z = 0.45 + taper;
  }
  const hand = pts[2 * 3];
  reel.position.set(hand, pts[2 * 3 + 1] - 0.05, pts[2 * 3 + 2] - 0.04);
  rotor.position.copy(reel.position);
  rotor.rotation.y = rig.rotor;
  crank.position.set(reel.position.x - 0.06, reel.position.y, reel.position.z);
  crank.rotation.x = rig.crank;
  bail.position.copy(reel.position);
  bail.rotation.x = -rig.bail * 1.4;

  const showLine = rig.state === "flying" || rig.state === "floating" || rig.state === "fighting" || rig.state === "retrieving" || rig.state === "landing";
  lineMesh.visible = showLine;
  bobber.visible = showLine && rig.state !== "landing";
  bobber.position.set(rig.bobX, rig.bobY, rig.bobZ);
  if (showLine) {
    const dist = Math.hypot(rig.bobX - v.eyeX, rig.bobY - v.eyeY, rig.bobZ - v.eyeZ);
    bobber.scale.setScalar(Math.max(1.4, dist / 6));
    camera.updateMatrixWorld(true);
    const tip = pts.length / 3 - 1;
    const tipV = new THREE.Vector3(pts[tip * 3], pts[tip * 3 + 1], pts[tip * 3 + 2]);
    const bobL = camera.worldToLocal(new THREE.Vector3(rig.bobX, rig.bobY, rig.bobZ));
    const sag = Math.min(1.2, dist * 0.08);
    const arr = lineGeo.attributes.position.array as Float32Array;
    for (let i = 0; i <= LINE_SEGS; i++) {
      const t = i / LINE_SEGS;
      const a = 1 - t;
      const mx = (tipV.x + bobL.x) * 0.5;
      const my = (tipV.y + bobL.y) * 0.5 - sag;
      const mz = (tipV.z + bobL.z) * 0.5;
      const x = a * a * tipV.x + 2 * a * t * mx + t * t * bobL.x;
      const y = a * a * tipV.y + 2 * a * t * my + t * t * bobL.y;
      const z = a * a * tipV.z + 2 * a * t * mz + t * t * bobL.z;
      const nx = bobL.x - tipV.x;
      const nz = bobL.z - tipV.z;
      const len = Math.hypot(nx, nz) || 1;
      const ox = (-nz / len) * 0.02;
      const oz = (nx / len) * 0.02;
      arr[i * 6] = x + ox;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z + oz;
      arr[i * 6 + 3] = x - ox;
      arr[i * 6 + 4] = y;
      arr[i * 6 + 5] = z - oz;
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.computeBoundingSphere();
  }
  splashBits.forEach((bit, i) => {
    bit.visible = rig.splash > 0.05;
    const a = (i / splashBits.length) * Math.PI * 2;
    bit.position.set(rig.bobX + Math.cos(a) * rig.splash * 0.35, rig.bobY + rig.splash * 0.15, rig.bobZ + Math.sin(a) * rig.splash * 0.35);
    bit.scale.setScalar(0.4 + rig.splash);
  });
  fishRoot.visible = v.phase === "card";
  if (v.phase === "card") {
    fishRoot.position.set(0.0, 0.02, -1.55);
    fishRoot.rotation.y = Math.sin(performance.now() / 1000 * 0.55) * 0.25;
  }
  if (v.phase === "fighting" && v.tension > 0.9) {
    if (audio.line_strain.paused) void audio.line_strain.play().catch(() => undefined);
  } else audio.line_strain.pause();
  if (v.reeling) {
    if (audio.reel_wind.paused) void audio.reel_wind.play().catch(() => undefined);
  } else audio.reel_wind.pause();
}

let waveT = 0;
function wave(dt: number): void {
  waveT += dt;
  const attr = waterGeo.attributes.position;
  const arr = attr.array as Float32Array;
  for (let i = 0; i < attr.count; i++) {
    const x = baseY[i * 3];
    const z = baseY[i * 3 + 2];
    arr[i * 3 + 1] = Math.sin(x * 0.18 + waveT * 1.3) * 0.06 + Math.cos(z * 0.13 + waveT) * 0.05;
  }
  attr.needsUpdate = true;
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / Math.max(1, innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000) * speed;
  last = now;
  if (!trip.view.guideOpen) trip.tick(dt);
  syncRig(dt);
  wave(dt);
  syncHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
paintGuide();

const api = {
  view: () => trip.view,
  setSpeed: (n: number) => { speed = n; },
  setHeld: (down: boolean) => setHold(down),
  act: (name: string) => onAct(name),
  openShop: () => { panelKind = "marta"; paintPanel(); },
  bend: () => rig.bend,
  bobY: () => rig.bobY,
  rodState: () => rig.state,
  trip,
};
Object.assign(window, { __fishing: api });
void joe;
void marta;
