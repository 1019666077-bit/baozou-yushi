import * as THREE from "three";

const DEG = Math.PI / 180;

function rgb(color) {
  return new THREE.Color(color[0] / 255, color[1] / 255, color[2] / 255);
}

function hash2(x, y, seed) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 45.164) * 43758.5453;
  return n - Math.floor(n);
}

function paintWood(size = 64) {
  const data = new Uint8Array(size * size * 4);
  const plankW = size / 6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = Math.floor(x / plankW);
      const local = x - p * plankW;
      const seam = local < 1.6 || local > plankW - 1.2;
      const grain = Math.sin(y * 0.55 + p * 1.7) * 10 + hash2(x, y, p) * 14;
      const odd = p % 2 === 0;
      let r = odd ? 214 : 186;
      let g = odd ? 154 : 118;
      let b = odd ? 88 : 62;
      r = Math.max(0, Math.min(255, Math.round(r + grain)));
      g = Math.max(0, Math.min(255, Math.round(g + grain * 0.7)));
      b = Math.max(0, Math.min(255, Math.round(b + grain * 0.4)));
      if (seam) {
        r = 72;
        g = 42;
        b = 22;
      }
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

function paintWater(size = 64) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const band = 0.5 + 0.5 * Math.sin(y * 0.28 + x * 0.05);
      const chop = 0.5 + 0.5 * Math.sin(x * 0.41 - y * 0.19);
      const foam = Math.sin(x * 0.9 + y * 0.35) * Math.sin(y * 0.22);
      const speckle = hash2(x, y, 3) * 0.12;
      const t = Math.min(1, Math.max(0, band * 0.55 + chop * 0.3 + speckle));
      let r = Math.round(18 + t * 70);
      let g = Math.round(88 + t * 90);
      let b = Math.round(118 + t * 80);
      if (foam > 0.62) {
        r = Math.min(255, r + 90);
        g = Math.min(255, g + 80);
        b = Math.min(255, b + 55);
      }
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

function makeTex(data, size = 64, repeat = 1) {
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const layout = await fetch("./generated/layout.json").then((res) => {
  if (!res.ok) throw new Error("layout.json missing — start via serve.mjs");
  return res.json();
});

document.getElementById("title").textContent = layout.title;

const woodMap = makeTex(paintWood(), 64, 1.4);
const waterMap = makeTex(paintWater(), 64, 3.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = rgb(layout.look.skyTop);
scene.fog = new THREE.Fog(rgb(layout.look.haze), 16, 48);

const camera = new THREE.PerspectiveCamera(layout.cam.fov, innerWidth / innerHeight, 0.2, layout.cam.far);
const target = new THREE.Vector3(0, 0.62, 0);
const spherical = new THREE.Spherical();

function applyRestCamera() {
  camera.position.set(layout.cam.x, layout.cam.y, layout.cam.z);
  camera.lookAt(target);
  spherical.setFromVector3(camera.position.clone().sub(target));
}

applyRestCamera();

const hemi = new THREE.HemisphereLight(rgb(layout.look.skyTop), rgb(layout.look.deep), 0.72);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xfff1d6, 1.35);
const lightEuler = new THREE.Euler(layout.light.pitch * DEG, layout.light.yaw * DEG, 0, "YXZ");
dir.position.copy(new THREE.Vector3(0, 0, -1).applyEuler(lightEuler).multiplyScalar(-18));
scene.add(dir);
scene.add(new THREE.AmbientLight(0xffe6c4, 0.22));

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(0.5, 12, 10);
const planeGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
planeGeo.rotateX(-Math.PI / 2);

const mats = new Map();
function materialFor(part) {
  const key = `${part.name}:${part.finish}:${part.glow}:${part.color.join(",")}`;
  if (mats.has(key)) return mats.get(key);
  const color = rgb(part.color);
  let mat;
  if (part.name === "HorizonHaze") {
    mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      fog: true,
    });
  } else if (part.glow) {
    mat = new THREE.MeshBasicMaterial({ color, fog: true });
  } else if (part.finish === "water") {
    mat = new THREE.MeshPhongMaterial({
      color,
      map: waterMap,
      shininess: 42,
      specular: 0x88c8e0,
      transparent: true,
      opacity: 0.94,
    });
  } else if (part.finish === "wood") {
    mat = new THREE.MeshLambertMaterial({ color, map: woodMap });
  } else {
    mat = new THREE.MeshLambertMaterial({ color });
  }
  mats.set(key, mat);
  return mat;
}

let waterNode = null;
for (const part of layout.parts) {
  const geo = part.kind === "sphere" ? sphereGeo : part.kind === "plane" ? planeGeo : boxGeo;
  const mesh = new THREE.Mesh(geo, materialFor(part));
  mesh.position.set(part.x, part.y, part.z);
  mesh.scale.set(part.sx, part.sy, part.sz);
  mesh.rotation.order = "XYZ";
  mesh.rotation.set(part.rx * DEG, part.ry * DEG, part.rz * DEG);
  mesh.name = part.name;
  scene.add(mesh);
  if (part.name === "Water") waterNode = mesh;
}

const clock = new THREE.Clock();
let dragging = false;
let lastX = 0;
let lastY = 0;

function onPointerDown(ev) {
  dragging = true;
  lastX = ev.clientX;
  lastY = ev.clientY;
  renderer.domElement.setPointerCapture(ev.pointerId);
}

function onPointerMove(ev) {
  if (!dragging) return;
  const dx = ev.clientX - lastX;
  const dy = ev.clientY - lastY;
  lastX = ev.clientX;
  lastY = ev.clientY;
  spherical.theta -= dx * 0.005;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy * 0.004, 0.18, 1.42);
  camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(target));
  camera.lookAt(target);
}

function onPointerUp(ev) {
  dragging = false;
  try {
    renderer.domElement.releasePointerCapture(ev.pointerId);
  } catch {
    /* already released */
  }
}

renderer.domElement.addEventListener("pointerdown", onPointerDown);
renderer.domElement.addEventListener("pointermove", onPointerMove);
renderer.domElement.addEventListener("pointerup", onPointerUp);
renderer.domElement.addEventListener("pointercancel", onPointerUp);
renderer.domElement.addEventListener(
  "wheel",
  (ev) => {
    ev.preventDefault();
    spherical.radius = THREE.MathUtils.clamp(spherical.radius + ev.deltaY * 0.01, 4.2, 28);
    camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(target));
    camera.lookAt(target);
  },
  { passive: false },
);

document.getElementById("reset").addEventListener("click", applyRestCamera);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function tick() {
  const t = clock.getElapsedTime();
  if (waterNode) {
    waterNode.position.y = -0.02 + Math.sin(t * 1.1) * 0.022;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();
