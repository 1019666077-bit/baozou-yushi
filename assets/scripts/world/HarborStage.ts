import { Camera, Color, DirectionalLight, Layers, Node } from "cc";
import { camHarborSway, HARBOR_CAM_REST } from "../domain/CameraFeel";
import { islandLook } from "../domain/GrayLook";
import { boatParts, dockParts, harborExtraParts, waterParts } from "../domain/ProcGeom";
import { spawnParts } from "./StageBuild";

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
  private elapsed = 0;
  private alive = true;

  static ensure(canvas: Node): HarborStage {
    if (HarborStage.current?.alive && HarborStage.current.root?.isValid) {
      return HarborStage.current;
    }
    HarborStage.current = new HarborStage(canvas);
    return HarborStage.current;
  }

  static drop(): void {
    HarborStage.current?.dispose();
    HarborStage.current = undefined;
  }

  private constructor(canvas: Node) {
    this.canvas = canvas;
    const scene = canvas.scene;
    if (!scene) throw new Error("HarborStage needs a scene");

    this.root = new Node("HarborWorld");
    this.root.layer = Layers.Enum.DEFAULT;
    this.root.parent = scene;

    const look = islandLook("island_foam_bay", true);
    this.buildLight();
    this.buildCamera(look.skyTop);
    const water = spawnParts(this.root, Layers.Enum.DEFAULT, waterParts(look.near, look.deep));
    this.water = water[0];
    spawnParts(this.root, Layers.Enum.DEFAULT, dockParts());
    spawnParts(this.root, Layers.Enum.DEFAULT, harborExtraParts(look));
    const boat = new Node("HarborBoat");
    boat.layer = Layers.Enum.DEFAULT;
    boat.parent = this.root;
    boat.setPosition(-3.4, 0.38, 0.7);
    spawnParts(boat, Layers.Enum.DEFAULT, boatParts());
    this.bindUiCamera();
  }

  tick(dt: number, lowPower: boolean): void {
    if (!this.root?.isValid) return;
    this.elapsed += dt;
    if (!lowPower && this.water?.isValid) {
      this.water.setPosition(1.6, -0.02 + Math.sin(this.elapsed * 1.1) * 0.025, 0.1);
    }
    if (!this.camNode?.isValid) return;
    const sway = camHarborSway(this.elapsed, lowPower);
    this.camNode.setPosition(HARBOR_CAM_REST.x + sway.x, HARBOR_CAM_REST.y + sway.y, HARBOR_CAM_REST.z);
  }

  dispose(): void {
    this.alive = false;
    if (this.uiCam?.isValid) {
      this.uiCam.clearFlags = this.savedClear;
      this.uiCam.priority = this.savedPriority;
      this.uiCam.visibility = this.savedVisibility;
    }
    this.uiCam = undefined;
    if (this.root?.isValid) this.root.destroy();
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
    cam.fov = 38;
    cam.near = 0.2;
    cam.far = 90;
    cam.priority = 0;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    cam.clearColor = new Color(sky[0], sky[1], sky[2], 255);
    cam.visibility = Layers.Enum.DEFAULT;
  }

  private buildLight(): void {
    const node = new Node("HarborLight");
    node.layer = Layers.Enum.DEFAULT;
    node.parent = this.root;
    node.setRotationFromEuler(-42, 36, 0);
    const light = node.addComponent(DirectionalLight);
    light.illuminance = 100000;
  }
}
