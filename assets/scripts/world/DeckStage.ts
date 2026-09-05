import {
  Camera,
  Color,
  DirectionalLight,
  Layers,
  Node,
  Vec3,
} from "cc";
import { FishController } from "../battle/FishController";
import {
  CAM_REST,
  composeHuntCam,
  smashHoldSeconds,
  yankCamK,
} from "../domain/CameraFeel";
import { toActorWorld, toBoatWorld, deckKindForFish } from "../domain/DeckMap";
import type { SmashGrade } from "../domain/FlopPhysics";
import { smashSquashAt } from "../domain/HitJuice";
import { fishLook, islandLook } from "../domain/GrayLook";
import {
  boatParts,
  dockParts,
  fishParts,
  huntIsleParts,
  waterAmp,
  waterParts,
} from "../domain/ProcGeom";
import { deckFlag } from "./deckFlag";
import { HarborStage } from "./HarborStage";
import { rippleWater, spawnPart, spawnParts } from "./StageBuild";

export type DeckFeel = {
  smashElapsed?: number;
  lowPower?: boolean;
  smashGrade?: SmashGrade;
};

export class DeckStage {
  private root: Node;
  private canvas: Node;
  private uiCam?: Camera;
  private worldCam!: Camera;
  private camNode!: Node;
  private savedClear = 0;
  private savedPriority = 0;
  private savedVisibility = 0;
  private boat!: Node;
  private line!: Node;
  private fishes = new Map<string, Node>();
  private weakBase = new Map<string, { x: number; y: number; z: number }>();
  private mid = new Vec3();
  private to = new Vec3();
  private water?: Node;
  private foam?: Node;
  private waveT = 0;

  static mount(canvas: Node, islandId: string): DeckStage {
    HarborStage.drop();
    const stage = new DeckStage(canvas, islandId);
    deckFlag.live = true;
    return stage;
  }

  private constructor(canvas: Node, islandId: string) {
    this.canvas = canvas;
    const scene = canvas.scene;
    if (!scene) throw new Error("DeckStage needs a scene");

    this.root = new Node("DeckWorld");
    this.root.layer = Layers.Enum.DEFAULT;
    this.root.parent = scene;

    const look = islandLook(islandId);
    this.buildLight();
    this.buildCamera(look.sky);
    this.buildSet(islandId, look);
    this.boat = this.makeBoat();
    this.line = spawnPart(this.root, Layers.Enum.DEFAULT, {
      name: "Line",
      kind: "box",
      x: 0,
      y: 0,
      z: 0,
      sx: 0.05,
      sy: 0.05,
      sz: 1,
      color: [255, 214, 70],
    });
    this.line.active = false;
    this.bindUiCamera();
  }

  sync(
    player: Node,
    fishRoot: Node,
    hooked?: FishController,
    aimTo?: Vec3,
    feel: DeckFeel = {},
  ): void {
    if (!this.root?.isValid || !player?.isValid || !fishRoot?.isValid) return;
    const boat = toBoatWorld(player.position.x, player.position.y);
    this.boat.setPosition(boat.x, boat.y, boat.z);

    const seen = new Set<string>();
    for (const child of fishRoot.children) {
      if (!child.active) continue;
      const fish = child.getComponent(FishController);
      if (!fish) continue;
      seen.add(child.uuid);
      const puppet = this.fishNode(child.uuid, fish);
      const kind = deckKindForFish(
        child.position.x,
        fish.onDeck || fish.carrying,
        fish.yanking,
      );
      const pos = toActorWorld(child.position.x, child.position.y, kind);
      puppet.setPosition(pos.x, pos.y + (fish.carrying ? 0.45 : 0), pos.z);
      puppet.setRotationFromEuler(
        kind === "deck" ? child.angle : 0,
        child.position.x > player.position.x ? 0 : 180,
        kind === "sea" ? 12 : 8,
      );
      this.squashFish(puppet, feel, fish);
    }
    for (const [id, node] of this.fishes) {
      if (seen.has(id)) continue;
      node.destroy();
      this.fishes.delete(id);
      this.weakBase.delete(id);
    }

    if (hooked?.yanking && hooked.node.active) {
      const kind = deckKindForFish(
        hooked.node.position.x,
        hooked.onDeck || hooked.carrying,
        true,
      );
      const pos = toActorWorld(hooked.node.position.x, hooked.node.position.y, kind);
      this.placeLine(
        this.boat.position.x,
        this.boat.position.y + 0.28,
        this.boat.position.z,
        pos.x,
        pos.y,
        pos.z,
      );
      this.line.active = true;
    } else if (aimTo) {
      const pos = toActorWorld(aimTo.x, aimTo.y, "sea");
      this.placeLine(
        this.boat.position.x,
        this.boat.position.y + 0.28,
        this.boat.position.z,
        pos.x,
        pos.y + 0.2,
        pos.z,
      );
      this.line.active = true;
    } else {
      this.line.active = false;
    }

    this.aimCamera(hooked, feel);
  }

  tickWater(dt: number, lowPower: boolean): void {
    if (lowPower || !this.water?.isValid) return;
    this.waveT += dt;
    this.water.setPosition(1.6, -0.02 + Math.sin(this.waveT * 1.4) * 0.02, 0.1);
    rippleWater(this.water, this.waveT, waterAmp(false));
    if (this.foam?.isValid) {
      this.foam.setPosition(-1.1 + Math.sin(this.waveT * 0.6) * 0.15, 0.03, 0.35);
    }
    this.pulseWeaks();
  }

  dispose(): void {
    deckFlag.live = false;
    if (this.uiCam?.isValid) {
      this.uiCam.clearFlags = this.savedClear;
      this.uiCam.priority = this.savedPriority;
      this.uiCam.visibility = this.savedVisibility;
    }
    this.uiCam = undefined;
    if (this.root?.isValid) this.root.destroy();
    this.fishes.clear();
    this.weakBase.clear();
  }

  private aimCamera(hooked: FishController | undefined, feel: DeckFeel): void {
    if (!this.camNode?.isValid) return;
    const lowPower = feel.lowPower === true;
    const pose = composeHuntCam({
      rest: CAM_REST,
      yankK: hooked?.yanking ? yankCamK(hooked.node.position.x) : 0,
      airborne: !lowPower && hooked?.airborne === true,
      smashElapsed: feel.smashElapsed ?? 1,
      smashDuration: smashHoldSeconds(lowPower),
      lowPower,
    });
    this.camNode.setPosition(pose.x, pose.y, pose.z);
    this.camNode.setRotationFromEuler(pose.pitch, pose.yaw, 0);
  }

  private placeLine(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
  ): void {
    const len = Math.hypot(bx - ax, by - ay, bz - az) || 0.05;
    this.mid.set((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
    this.to.set(bx, by, bz);
    this.line.setPosition(this.mid);
    this.line.lookAt(this.to);
    this.line.setScale(0.05, 0.05, len);
  }

  private fishNode(id: string, fish: FishController): Node {
    let node = this.fishes.get(id);
    if (node?.isValid) return node;
    const look = fishLook(fish.id.replace(/_decoy$/, "") || "fish_bayfin");
    const body = fish.decoy
      ? ([
          Math.round((look.body[0] + 200) / 2),
          Math.round((look.body[1] + 210) / 2),
          Math.round((look.body[2] + 220) / 2),
        ] as const)
      : look.body;
    const tier = fish.fishConfig?.tier;
    const s = tier === "boss" ? 1.55 : tier === "elite" ? 1.05 : 0.62;
    node = new Node(fish.id || "fish");
    node.layer = Layers.Enum.DEFAULT;
    node.parent = this.root;
    spawnParts(
      node,
      Layers.Enum.DEFAULT,
      fishParts(body, look.belly, look.accent, s, look.silhouette),
    );
    this.fishes.set(id, node);
    return node;
  }

  private squashFish(puppet: Node, feel: DeckFeel, fish?: FishController): void {
    const dur = smashHoldSeconds(feel.lowPower === true);
    const elapsed = feel.smashElapsed ?? 1;
    const squash = smashSquashAt(elapsed, feel.lowPower === true, dur);
    const grade = fish?.smashGrade ?? feel.smashGrade;
    const pulse =
      grade === "perfect" ? 1 + 0.1 * Math.abs(Math.sin(this.waveT * 9)) : grade === "open" ? 1.04 : 1;
    puppet.setScale(squash.sx * pulse, squash.sy * pulse, squash.sx);
  }

  private pulseWeaks(): void {
    for (const [id, node] of this.fishes) {
      if (!node.isValid) continue;
      const weak = node.getChildByName("Weak");
      if (!weak?.isValid) continue;
      let base = this.weakBase.get(id);
      if (!base) {
        base = { x: weak.scale.x, y: weak.scale.y, z: weak.scale.z };
        this.weakBase.set(id, base);
      }
      const k = 1 + Math.sin(this.waveT * 5.6) * 0.2;
      weak.setScale(base.x * k, base.y * k, base.z * k);
    }
  }

  private makeBoat(): Node {
    const root = new Node("Boat");
    root.layer = Layers.Enum.DEFAULT;
    root.parent = this.root;
    spawnParts(root, Layers.Enum.DEFAULT, boatParts());
    return root;
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

  private buildCamera(sky: readonly [number, number, number]): void {
    this.camNode = new Node("DeckCamera");
    this.camNode.layer = Layers.Enum.DEFAULT;
    this.camNode.parent = this.root;
    this.camNode.setPosition(CAM_REST.x, CAM_REST.y, CAM_REST.z);
    this.camNode.setRotationFromEuler(CAM_REST.pitch, CAM_REST.yaw, 0);
    this.worldCam = this.camNode.addComponent(Camera);
    this.worldCam.projection = Camera.ProjectionType.PERSPECTIVE;
    this.worldCam.fov = 38;
    this.worldCam.near = 0.2;
    this.worldCam.far = 80;
    this.worldCam.priority = 0;
    this.worldCam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    this.worldCam.clearColor = new Color(sky[0], sky[1], sky[2], 255);
    this.worldCam.visibility = Layers.Enum.DEFAULT;
  }

  private buildLight(): void {
    const node = new Node("DeckLight");
    node.layer = Layers.Enum.DEFAULT;
    node.parent = this.root;
    node.setRotationFromEuler(-52, -18, 0);
    const light = node.addComponent(DirectionalLight);
    light.illuminance = 120000;
  }

  private buildSet(islandId: string, look: ReturnType<typeof islandLook>): void {
    const water = spawnParts(
      this.root,
      Layers.Enum.DEFAULT,
      waterParts(look.near, look.deep),
    );
    this.water = water[0];
    this.foam = water[3];
    spawnParts(this.root, Layers.Enum.DEFAULT, dockParts());
    spawnParts(this.root, Layers.Enum.DEFAULT, huntIsleParts(islandId, look));
  }
}
