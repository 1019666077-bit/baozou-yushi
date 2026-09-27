/**
 * 第一人称低多边形钓场。网格用 StageBuild 的方块，姿态数字来自 RodRig。
 * 不改港口舞台。从 RuntimeHome 进来时港口已经卸掉。
 */
import { Camera, Color, DirectionalLight, Layers, Node, Quat, Vec3 } from "cc";
import { waterAmp } from "../domain/ProcGeom";
import type { StagePart } from "../domain/ProcGeom";
import { rippleWater, spawnPart, spawnParts } from "../world/StageBuild";
import { blankCameraPoints, LINE_SEGS, presentRodPoint, type RodRig } from "./RodRig";
import { fishingLook, type SpotId } from "./SpotQuery";

export interface FishingPose {
  eyeX: number;
  eyeY: number;
  eyeZ: number;
  spot: string;
  phase: string;
  fishRgb: readonly [number, number, number] | null;
  bobX: number;
  bobY: number;
  bobZ: number;
  showLine: boolean;
}

const WOOD: [number, number, number] = [196, 160, 106];
const WOOD_DARK: [number, number, number] = [138, 98, 64];
const RAIL: [number, number, number] = [215, 196, 162];
const SAND: [number, number, number] = [230, 211, 164];
const WET: [number, number, number] = [203, 185, 138];
const HULL: [number, number, number] = [45, 74, 68];
const DECK: [number, number, number] = [242, 239, 230];

export class FishingWorld {
  private static current?: FishingWorld;
  private root: Node;
  private canvas: Node;
  private uiCam?: Camera;
  private camNode!: Node;
  private rodRoot!: Node;
  private savedClear = 0;
  private savedPriority = 0;
  private savedVisibility = 0;
  private water?: Node;
  private boat!: Node;
  private segments: Node[] = [];
  private reel!: Node;
  private lineBits: Node[] = [];
  private bobber!: Node;
  private splash: Node[] = [];
  private fish!: Node;
  private elapsed = 0;
  private alive = true;
  private readonly up = new Vec3(0, 1, 0);
  private readonly dir = new Vec3();
  private readonly quat = new Quat();
  private readonly look = new Vec3();
  private readonly tmp = new Vec3();
  private readonly bobLocal = new Vec3();

  static ensure(canvas: Node): FishingWorld {
    if (FishingWorld.current?.alive && FishingWorld.current.root?.isValid) {
      return FishingWorld.current;
    }
    FishingWorld.drop();
    FishingWorld.current = new FishingWorld(canvas);
    return FishingWorld.current;
  }

  static drop(): void {
    FishingWorld.current?.dispose();
    FishingWorld.current = undefined;
  }

  private constructor(canvas: Node) {
    this.canvas = canvas;
    const scene = canvas.scene;
    if (!scene) throw new Error("FishingWorld needs a scene");
    this.root = new Node("FishingWorld");
    this.root.layer = Layers.Enum.DEFAULT;
    this.root.parent = scene;
    this.buildLight();
    this.buildCamera();
    this.buildDiorama();
    this.buildRod();
    this.bindUiCamera();
  }

  tick(dt: number, pose: FishingPose, rig: RodRig): void {
    if (!this.root?.isValid) return;
    this.elapsed += dt;
    if (this.water?.isValid) rippleWater(this.water, this.elapsed, waterAmp(false));
    this.camNode.setPosition(pose.eyeX, pose.eyeY, pose.eyeZ);
    const look = fishingLook(pose.spot as SpotId, pose.eyeX, pose.eyeZ);
    this.look.set(look.x, look.y, look.z);
    this.camNode.lookAt(this.look, this.up);
    if (pose.spot === "boat") this.boat.setPosition(pose.eyeX, 0.15, pose.eyeZ + 1.2);
    else this.boat.setPosition(64.5, 0.15, 36.5);
    this.placeRod(rig);
    this.placeLine(rig, pose);
    const showFish = pose.phase === "card" && pose.fishRgb !== null;
    this.fish.active = showFish;
    if (showFish && pose.fishRgb) {
      this.fish.setPosition(0.05, -0.05, -1.2);
      this.fish.setRotationFromEuler(0, Math.sin(this.elapsed * 0.55) * 18, 0);
    }
  }

  dispose(): void {
    this.alive = false;
    for (const camera of this.root.getComponentsInChildren(Camera)) camera.enabled = false;
    if (this.uiCam?.isValid) {
      this.uiCam.clearFlags = this.savedClear;
      this.uiCam.priority = this.savedPriority;
      this.uiCam.visibility = this.savedVisibility;
    }
    this.uiCam = undefined;
    if (this.root?.isValid) {
      this.root.removeFromParent();
      this.root.destroy();
    }
  }

  private buildDiorama(): void {
    const layer = Layers.Enum.DEFAULT;
    const parts: StagePart[] = [
      { name: "PierDeck", kind: "box", x: 55, y: 2.22, z: 27, sx: 2.6, sy: 0.16, sz: 28, color: WOOD, finish: "wood" },
      { name: "PierHead", kind: "box", x: 55, y: 2.24, z: 36.5, sx: 14, sy: 0.18, sz: 7, color: WOOD, finish: "wood" },
      { name: "Beach", kind: "box", x: 20, y: -0.15, z: -58, sx: 90, sy: 0.4, sz: 36, color: SAND, finish: "land" },
      { name: "WetSand", kind: "box", x: 20, y: -0.05, z: -42, sx: 90, sy: 0.2, sz: 8, color: WET, finish: "land" },
      { name: "Water", kind: "plane", x: 40, y: 0, z: 30, sx: 220, sy: 1, sz: 180, color: [70, 150, 176], finish: "water", wave: true },
    ];
    for (let z = 14; z <= 40; z += 3.2) {
      parts.push(
        { name: "PostL", kind: "box", x: 53.8, y: 2.7, z, sx: 0.08, sy: 0.9, sz: 0.08, color: WOOD_DARK, finish: "wood" },
        { name: "PostR", kind: "box", x: 56.2, y: 2.7, z, sx: 0.08, sy: 0.9, sz: 0.08, color: WOOD_DARK, finish: "wood" },
        { name: "RailL", kind: "box", x: 53.8, y: 3.12, z, sx: 0.06, sy: 0.06, sz: 3.2, color: RAIL, finish: "wood" },
        { name: "RailR", kind: "box", x: 56.2, y: 3.12, z, sx: 0.06, sy: 0.06, sz: 3.2, color: RAIL, finish: "wood" },
      );
    }
    const spawned = spawnParts(this.root, layer, parts);
    this.water = spawned.find((node) => node.name === "Water");
    this.boat = new Node("FishingBoat");
    this.boat.layer = layer;
    this.boat.parent = this.root;
    spawnParts(this.boat, layer, [
      { name: "Hull", kind: "box", x: 0, y: 0.2, z: 0, sx: 2.4, sy: 0.7, sz: 6.2, color: HULL, finish: "prop" },
      { name: "Deck", kind: "box", x: 0, y: 0.62, z: -0.2, sx: 2.1, sy: 0.12, sz: 4.2, color: DECK, finish: "wood" },
    ]);
    this.stall(49.2, 14, [93, 122, 140], [216, 178, 74]);
    this.stall(62, 18, [138, 59, 50], [61, 90, 74]);
  }

  private stall(x: number, z: number, shirt: [number, number, number], apron: [number, number, number]): void {
    const node = new Node("Stall");
    node.layer = Layers.Enum.DEFAULT;
    node.parent = this.root;
    node.setPosition(x, 0, z);
    spawnParts(node, Layers.Enum.DEFAULT, [
      { name: "Counter", kind: "box", x: 0, y: 1.05, z: 0.4, sx: 2.4, sy: 0.12, sz: 1.4, color: WOOD, finish: "wood" },
      { name: "Awning", kind: "box", x: 0, y: 2.05, z: 0.2, sx: 2.6, sy: 0.08, sz: 1.6, color: [141, 74, 58], finish: "prop" },
      { name: "Body", kind: "box", x: 0, y: 1.15, z: -0.15, sx: 0.36, sy: 0.5, sz: 0.22, color: shirt, finish: "prop" },
      { name: "Apron", kind: "box", x: 0, y: 0.95, z: -0.02, sx: 0.32, sy: 0.4, sz: 0.06, color: apron, finish: "prop" },
      { name: "Head", kind: "sphere", x: 0, y: 1.55, z: -0.15, sx: 0.22, sy: 0.22, sz: 0.2, color: [196, 138, 98], finish: "prop" },
    ]);
  }

  private buildRod(): void {
    this.rodRoot = new Node("RodRoot");
    this.rodRoot.layer = Layers.Enum.DEFAULT;
    this.rodRoot.parent = this.camNode;
    for (let i = 0; i < 22; i++) {
      const bit = spawnPart(this.rodRoot, Layers.Enum.DEFAULT, {
        name: "Blank",
        kind: "box",
        x: 0,
        y: 0,
        z: 0,
        sx: 0.01,
        sy: 0.12,
        sz: 0.01,
        color: i % 4 === 0 ? [158, 192, 214] : [58, 86, 112],
        finish: "prop",
      });
      this.segments.push(bit);
    }
    this.reel = spawnPart(this.rodRoot, Layers.Enum.DEFAULT, {
      name: "Reel",
      kind: "sphere",
      x: 0.2,
      y: -0.08,
      z: -0.4,
      sx: 0.055,
      sy: 0.055,
      sz: 0.04,
      color: [198, 168, 96],
      finish: "prop",
    });
    for (let i = 0; i < LINE_SEGS; i++) {
      const bit = spawnPart(this.camNode, Layers.Enum.DEFAULT, {
        name: "Line",
        kind: "sphere",
        x: 0,
        y: -2,
        z: 0,
        sx: 0.025,
        sy: 0.025,
        sz: 0.025,
        color: [223, 231, 200],
        finish: "prop",
      });
      bit.active = false;
      this.lineBits.push(bit);
    }
    this.bobber = new Node("Bobber");
    this.bobber.layer = Layers.Enum.DEFAULT;
    this.bobber.parent = this.root;
    spawnParts(this.bobber, Layers.Enum.DEFAULT, [
      { name: "BobTop", kind: "sphere", x: 0, y: 0.03, z: 0, sx: 0.08, sy: 0.05, sz: 0.08, color: [210, 74, 58], finish: "prop" },
      { name: "BobBot", kind: "sphere", x: 0, y: -0.02, z: 0, sx: 0.08, sy: 0.05, sz: 0.08, color: [244, 239, 228], finish: "prop" },
    ]);
    this.bobber.active = false;
    for (let i = 0; i < 8; i++) {
      const bit = spawnPart(this.root, Layers.Enum.DEFAULT, {
        name: "Splash",
        kind: "sphere",
        x: 0,
        y: 0,
        z: 0,
        sx: 0.06,
        sy: 0.06,
        sz: 0.06,
        color: [231, 246, 248],
        finish: "water",
      });
      bit.active = false;
      this.splash.push(bit);
    }
    this.fish = spawnPart(this.rodRoot, Layers.Enum.DEFAULT, {
      name: "CatchFish",
      kind: "sphere",
      x: 0,
      y: 0,
      z: 0,
      sx: 0.55,
      sy: 0.16,
      sz: 0.1,
      color: [180, 200, 190],
      finish: "fish",
    });
    this.fish.active = false;
  }

  private presented(rig: RodRig): Float32Array {
    const raw = blankCameraPoints(rig, this.segments.length + 1);
    const out = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i += 3) {
      const p = presentRodPoint(raw[i], raw[i + 1], raw[i + 2]);
      out[i] = p[0];
      out[i + 1] = p[1];
      out[i + 2] = p[2];
    }
    return out;
  }

  private placeRod(rig: RodRig): void {
    const pts = this.presented(rig);
    for (let i = 0; i < this.segments.length; i++) {
      const ax = pts[i * 3];
      const ay = pts[i * 3 + 1];
      const az = pts[i * 3 + 2];
      const bx = pts[(i + 1) * 3];
      const by = pts[(i + 1) * 3 + 1];
      const bz = pts[(i + 1) * 3 + 2];
      const node = this.segments[i];
      node.setPosition((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      const len = Math.max(0.02, Math.hypot(bx - ax, by - ay, bz - az));
      this.dir.set(bx - ax, by - ay, bz - az);
      if (this.dir.length() > 1e-4) {
        this.dir.normalize();
        Quat.rotationTo(this.quat, this.up, this.dir);
        node.setRotation(this.quat);
      }
      const t = 1 - i / this.segments.length;
      const thick = 0.009 + t * 0.034;
      node.setScale(thick, len, thick);
    }
    const hx = pts[4];
    const hy = pts[5];
    const hz = pts[6];
    this.reel.setPosition(hx + 0.03, hy - 0.03, hz);
    this.reel.setRotationFromEuler(0, (rig.rotor * 180) / Math.PI, 70);
  }

  private placeLine(rig: RodRig, pose: FishingPose): void {
    const show = pose.showLine;
    this.bobber.active = show && pose.phase !== "card";
    if (show) {
      this.bobber.setPosition(pose.bobX, pose.bobY, pose.bobZ);
      const dist = Math.hypot(pose.bobX - pose.eyeX, pose.bobY - pose.eyeY, pose.bobZ - pose.eyeZ);
      const bobScale = Math.max(3.6, dist / 3.2);
      this.bobber.setScale(bobScale, bobScale, bobScale);
    }
    const pts = this.presented(rig);
    const tip = pts.length / 3 - 1;
    this.tmp.set(pose.bobX, pose.bobY, pose.bobZ);
    this.camNode.inverseTransformPoint(this.bobLocal, this.tmp);
    const tx = pts[tip * 3];
    const ty = pts[tip * 3 + 1];
    const tz = pts[tip * 3 + 2];
    const sag = Math.min(0.45, Math.hypot(this.bobLocal.x - tx, this.bobLocal.z - tz) * 0.08);
    for (let i = 0; i < this.lineBits.length; i++) {
      const bit = this.lineBits[i];
      bit.active = show;
      if (!show) continue;
      const t = i / (this.lineBits.length - 1);
      const a = 1 - t;
      const mx = (tx + this.bobLocal.x) * 0.5;
      const my = (ty + this.bobLocal.y) * 0.5 - sag;
      const mz = (tz + this.bobLocal.z) * 0.5;
      bit.setPosition(
        a * a * tx + 2 * a * t * mx + t * t * this.bobLocal.x,
        a * a * ty + 2 * a * t * my + t * t * this.bobLocal.y,
        a * a * tz + 2 * a * t * mz + t * t * this.bobLocal.z,
      );
    }
    const splashOn = rig.splash > 0.05;
    this.splash.forEach((bit, i) => {
      bit.active = splashOn;
      if (!splashOn) return;
      const a = (i / this.splash.length) * Math.PI * 2;
      bit.setPosition(
        pose.bobX + Math.cos(a) * rig.splash * 0.35,
        pose.bobY + rig.splash * 0.12,
        pose.bobZ + Math.sin(a) * rig.splash * 0.35,
      );
    });
  }

  private bindUiCamera(): void {
    const camNode = this.canvas.getChildByName("Camera");
    this.uiCam = camNode?.getComponent(Camera) ?? undefined;
    if (!this.uiCam) return;
    this.savedClear = this.uiCam.clearFlags;
    this.savedPriority = this.uiCam.priority;
    this.savedVisibility = this.uiCam.visibility;
    this.uiCam.clearFlags = Camera.ClearFlag.DEPTH_ONLY;
    this.uiCam.priority = 1;
    this.uiCam.visibility = Layers.Enum.UI_2D;
  }

  private buildCamera(): void {
    this.camNode = new Node("FishingCamera");
    this.camNode.layer = Layers.Enum.DEFAULT;
    this.camNode.parent = this.root;
    const cam = this.camNode.addComponent(Camera);
    cam.projection = Camera.ProjectionType.PERSPECTIVE;
    cam.fov = 58;
    cam.near = 0.1;
    cam.far = 180;
    cam.priority = 0;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    cam.clearColor = new Color(158, 200, 226, 255);
    cam.visibility = Layers.Enum.DEFAULT;
  }

  private buildLight(): void {
    const node = new Node("FishingLight");
    node.layer = Layers.Enum.DEFAULT;
    node.parent = this.root;
    node.setRotationFromEuler(-36, 40, 0);
    const light = node.addComponent(DirectionalLight);
    light.illuminance = 110000;
  }
}
