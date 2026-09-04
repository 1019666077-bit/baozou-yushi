import {
  Camera,
  Color,
  DirectionalLight,
  Layers,
  Material,
  Mesh,
  MeshRenderer,
  Node,
  Vec3,
  primitives,
  utils,
} from "cc";
import { FishController } from "../battle/FishController";
import { toActorWorld, toBoatWorld, deckKindForFish } from "../domain/DeckMap";
import { fishLook, islandLook } from "../domain/GrayLook";
import { deckFlag } from "./deckFlag";

export class DeckStage {
  private root: Node;
  private canvas: Node;
  private uiCam?: Camera;
  private savedClear = 0;
  private savedPriority = 0;
  private savedVisibility = 0;
  private boxMesh!: Mesh;
  private boat!: Node;
  private line!: Node;
  private fishes = new Map<string, Node>();
  private mats = new Map<string, Material>();
  private mid = new Vec3();
  private to = new Vec3();

  static mount(canvas: Node, islandId: string): DeckStage {
    const stage = new DeckStage(canvas, islandId);
    deckFlag.live = true;
    return stage;
  }

  private constructor(canvas: Node, islandId: string) {
    this.canvas = canvas;
    const scene = canvas.scene;
    if (!scene) throw new Error("DeckStage needs a scene");
    if (!primitives?.box || !utils?.createMesh) {
      throw new Error("3d primitive module is off");
    }

    this.boxMesh = utils.createMesh(primitives.box());

    this.root = new Node("DeckWorld");
    this.root.layer = Layers.Enum.DEFAULT;
    this.root.parent = scene;

    const look = islandLook(islandId);
    this.buildLight();
    this.buildCamera(look.sky);
    this.buildSet(look);
    this.boat = this.makeBox("Boat", 1.15, 0.32, 0.52, rgb(214, 160, 86));
    const cabin = this.makeBox("Cabin", 0.42, 0.28, 0.34, rgb(236, 214, 168));
    cabin.parent = this.boat;
    cabin.setPosition(0.12, 0.22, 0);
    this.line = this.makeBox("Line", 0.06, 0.06, 1, rgb(255, 214, 70));
    this.line.active = false;

    this.bindUiCamera();
  }

  sync(
    player: Node,
    fishRoot: Node,
    hooked?: FishController,
    aimTo?: Vec3,
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
        kind === "sea" ? 90 : 20,
      );
    }
    for (const [id, node] of this.fishes) {
      if (seen.has(id)) continue;
      node.destroy();
      this.fishes.delete(id);
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
    this.mats.clear();
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
    const color = fish.decoy
      ? rgb(
          Math.round((look.body[0] + 200) / 2),
          Math.round((look.body[1] + 210) / 2),
          Math.round((look.body[2] + 220) / 2),
          140,
        )
      : rgb(look.body[0], look.body[1], look.body[2]);
    const tier = fish.fishConfig?.tier;
    const s = tier === "boss" ? 1.7 : tier === "elite" ? 1.05 : 0.62;
    node = this.makeBox(`${fish.id || "fish"}`, s * 1.55, s * 0.38, s * 0.5, color);
    this.fishes.set(id, node);
    return node;
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
    const node = new Node("DeckCamera");
    node.layer = Layers.Enum.DEFAULT;
    node.parent = this.root;
    node.setPosition(0.4, 6.8, 9.6);
    node.setRotationFromEuler(-32, 6, 0);
    const cam = node.addComponent(Camera);
    cam.projection = Camera.ProjectionType.PERSPECTIVE;
    cam.fov = 42;
    cam.near = 0.2;
    cam.far = 80;
    cam.priority = 0;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    cam.clearColor = rgb(sky[0], sky[1], sky[2]);
    cam.visibility = Layers.Enum.DEFAULT;
  }

  private buildLight(): void {
    const node = new Node("DeckLight");
    node.layer = Layers.Enum.DEFAULT;
    node.parent = this.root;
    node.setRotationFromEuler(-48, -28, 0);
    const light = node.addComponent(DirectionalLight);
    light.illuminance = 120000;
  }

  private buildSet(look: ReturnType<typeof islandLook>): void {
    this.makeBox("Water", 22, 0.18, 16, rgb(look.near[0], look.near[1], look.near[2])).setPosition(
      1.4,
      -0.08,
      0.2,
    );
    this.makeBox("Deep", 10, 0.16, 8, rgb(look.deep[0], look.deep[1], look.deep[2])).setPosition(
      4.6,
      -0.12,
      -2.4,
    );
    this.makeBox("Dock", 4.4, 0.22, 2.6, rgb(176, 124, 70)).setPosition(-4.25, 0.12, 1.15);
    this.makeBox("PlankDark", 4.35, 0.04, 2.55, rgb(142, 96, 52)).setPosition(-4.25, 0.24, 1.15);
    this.makeBox("Crate", 0.85, 0.72, 0.85, rgb(24, 154, 170)).setPosition(-5.2, 0.62, 1.5);
    this.makeBox("Isle", 2.4, 0.7, 1.6, rgb(look.land[0], look.land[1], look.land[2])).setPosition(
      4.8,
      0.4,
      -4.6,
    );
  }

  private makeBox(
    name: string,
    w: number,
    h: number,
    d: number,
    color: Color,
  ): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.DEFAULT;
    node.parent = this.root;
    node.setScale(w, h, d);
    const renderer = node.addComponent(MeshRenderer);
    renderer.mesh = this.boxMesh;
    renderer.material = this.material(color);
    renderer.shadowCastingMode = MeshRenderer.ShadowCastingMode.OFF;
    return node;
  }

  private material(color: Color): Material {
    const key = `${color.r},${color.g},${color.b},${color.a}`;
    const cached = this.mats.get(key);
    if (cached) return cached;
    const mat = new Material();
    mat.initialize({
      effectName: "builtin-unlit",
      defines: { USE_INSTANCING: false },
    });
    mat.setProperty("mainColor", color);
    this.mats.set(key, mat);
    return mat;
  }
}

function rgb(r: number, g: number, b: number, a = 255): Color {
  return new Color(r, g, b, a);
}
