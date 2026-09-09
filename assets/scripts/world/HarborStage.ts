import { Camera, Color, DirectionalLight, Layers, Node, director } from "cc";
import { camHarborSway, HARBOR_CAM_REST } from "../domain/CameraFeel";
import { islandLook } from "../domain/GrayLook";
import { boatParts, flotsamParts, waterAmp } from "../domain/ProcGeom";
import { visiblePontoonTier } from "../domain/StationOps";
import {
  TIDE_STATION,
  fishermanParts,
  flotsamAnchor,
  foundationParts,
  horizonParts,
  oceanParts,
  orderBoardParts,
  raftPropParts,
} from "../domain/TideStation";
import { rippleWater, spawnParts } from "./StageBuild";

export type HarborStageOpts = {
  pontoonTier?: number;
  showFlotsam?: boolean;
};

export class HarborStage {
  private static current?: HarborStage;
  private root: Node;
  private canvas: Node;
  private uiCam?: Camera;
  private camNode!: Node;
  private savedClear = 0;
  private savedPriority = 0;
  private savedVisibility = 0;
  private water?: Node;
  private flotsam?: Node;
  private elapsed = 0;
  private alive = true;
  private pontoonTier: 1 | 2;
  private showFlotsam: boolean;

  static ensure(canvas: Node, opts: HarborStageOpts = {}): HarborStage {
    const tier = visiblePontoonTier(opts.pontoonTier ?? 1);
    const showFlotsam = opts.showFlotsam !== false;
    const current = HarborStage.current;
    HarborStage.purgeRoots(current?.root, canvas.scene);
    if (current?.alive && current.root?.isValid) {
      if (current.pontoonTier === tier && current.showFlotsam === showFlotsam) {
        return current;
      }
      HarborStage.drop();
    }
    try {
      HarborStage.current = new HarborStage(canvas, tier, showFlotsam);
      return HarborStage.current;
    } catch (error) {
      HarborStage.current = undefined;
      HarborStage.purgeRoots(undefined, canvas.scene);
      throw error;
    }
  }

  static drop(): void {
    HarborStage.current?.dispose();
    HarborStage.current = undefined;
    HarborStage.purgeRoots();
  }

  private static purgeRoots(
    keep?: Node,
    scene: Node | null = keep?.scene ?? director.getScene(),
  ): void {
    for (const root of scene?.children.filter((node) => node.name === "HarborWorld") ?? []) {
      if (root === keep) continue;
      for (const camera of root.getComponentsInChildren(Camera)) camera.enabled = false;
      root.removeFromParent();
      root.destroy();
    }
  }

  private constructor(canvas: Node, pontoonTier: 1 | 2, showFlotsam: boolean) {
    this.canvas = canvas;
    this.pontoonTier = pontoonTier;
    this.showFlotsam = showFlotsam;
    const scene = canvas.scene;
    if (!scene) throw new Error("HarborStage needs a scene");

    this.root = new Node("HarborWorld");
    this.root.layer = Layers.Enum.DEFAULT;
    this.root.parent = scene;

    const look = islandLook("island_foam_bay", true);
    const layer = Layers.Enum.DEFAULT;
    this.buildLight();
    this.buildCamera(look.skyTop);

    const ocean = this.group("Ocean");
    const waters = spawnParts(ocean, layer, oceanParts(look.near, look.deep));
    this.water = waters.find((node) => node.name === "Water") ?? waters[0];

    spawnParts(this.group("Horizon"), layer, horizonParts(look));

    const raft = this.group("RaftRoot");
    spawnParts(this.group("Foundation", raft), layer, foundationParts(pontoonTier));
    spawnParts(raft, layer, raftPropParts(pontoonTier));
    spawnParts(this.group("OrderBoard", raft), layer, orderBoardParts());
    spawnParts(this.group("Fisherman", raft), layer, fishermanParts());
    const fisher = raft.getChildByName("Fisherman");
    fisher?.setPosition(
      TIDE_STATION.fisherman.x,
      TIDE_STATION.fisherman.y,
      TIDE_STATION.fisherman.z,
    );
    const board = raft.getChildByName("OrderBoard");
    board?.setPosition(
      TIDE_STATION.orderBoard.x,
      TIDE_STATION.orderBoard.y,
      TIDE_STATION.orderBoard.z,
    );

    const boat = this.group("HarborBoat");
    boat.setPosition(TIDE_STATION.boat.x, TIDE_STATION.boat.y, TIDE_STATION.boat.z);
    spawnParts(boat, layer, boatParts());

    if (showFlotsam) {
      const wood = this.group("Tidewood");
      const anchor = flotsamAnchor();
      wood.setPosition(anchor.x, anchor.y, anchor.z);
      spawnParts(wood, layer, flotsamParts());
      this.flotsam = wood;
    }
    this.bindUiCamera();
  }

  tick(dt: number, lowPower: boolean): void {
    if (!this.root?.isValid) return;
    this.elapsed += dt;
    if (!lowPower && this.water?.isValid) {
      this.water.setPosition(0, -0.02 + Math.sin(this.elapsed * 1.1) * 0.022, 0);
      rippleWater(this.water, this.elapsed, waterAmp(false) * 1.35);
    }
    if (!lowPower && this.flotsam?.isValid) {
      const anchor = flotsamAnchor();
      this.flotsam.setPosition(
        anchor.x,
        anchor.y + Math.sin(this.elapsed * 1.4) * 0.03,
        anchor.z,
      );
    }
    if (!this.camNode?.isValid) return;
    const sway = camHarborSway(this.elapsed, lowPower);
    this.camNode.setPosition(HARBOR_CAM_REST.x + sway.x, HARBOR_CAM_REST.y + sway.y, HARBOR_CAM_REST.z);
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

  private group(name: string, parent: Node = this.root): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.DEFAULT;
    node.parent = parent;
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
    this.camNode = new Node("HarborCamera");
    this.camNode.layer = Layers.Enum.DEFAULT;
    this.camNode.parent = this.root;
    this.camNode.setPosition(HARBOR_CAM_REST.x, HARBOR_CAM_REST.y, HARBOR_CAM_REST.z);
    this.camNode.setRotationFromEuler(HARBOR_CAM_REST.pitch, HARBOR_CAM_REST.yaw, 0);
    const cam = this.camNode.addComponent(Camera);
    cam.projection = Camera.ProjectionType.PERSPECTIVE;
    cam.fov = TIDE_STATION.cam.fov;
    cam.near = 0.2;
    cam.far = TIDE_STATION.cam.far;
    cam.priority = 0;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    cam.clearColor = new Color(sky[0], sky[1], sky[2], 255);
    cam.visibility = Layers.Enum.DEFAULT;
  }

  private buildLight(): void {
    const node = new Node("HarborLight");
    node.layer = Layers.Enum.DEFAULT;
    node.parent = this.root;
    node.setRotationFromEuler(-42, 48, 0);
    const light = node.addComponent(DirectionalLight);
    light.illuminance = 115000;
  }
}
