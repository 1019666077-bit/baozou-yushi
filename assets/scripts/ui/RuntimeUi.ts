import { Color, Graphics, JsonAsset, Label, Node, UITransform, resources } from "cc";
import { SfxPlayer } from "../platform/SfxPlayer";
import { drawBoat as paintBoat, drawDock as paintDock, drawSeascape } from "./GrayArt";

export function loadJson<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    resources.load(path, JsonAsset, (error, asset) => {
      if (error) reject(error);
      else resolve(asset.json as T);
    });
  });
}

export function drawOcean(
  parent: Node,
  options: { islandId?: string; harbor?: boolean } = {},
): void {
  drawSeascape(parent, options);
}

export function drawBoat(graphics: Graphics): void {
  paintBoat(graphics);
}

export function drawDock(parent: Node): void {
  paintDock(parent);
}

export function makeLabel(
  parent: Node,
  value: string,
  fontSize: number,
  x: number,
  y: number,
  width = 900,
): Label {
  const node = new Node(value.slice(0, 24));
  node.parent = parent;
  node.setPosition(x, y);
  node.addComponent(UITransform).setContentSize(width, fontSize + 18);
  const label = node.addComponent(Label);
  label.string = value;
  label.fontSize = fontSize;
  label.lineHeight = fontSize + 6;
  label.color = new Color(240, 250, 255, 255);
  label.horizontalAlign = Label.HorizontalAlign.CENTER;
  label.overflow = Label.Overflow.SHRINK;
  return label;
}

export function makeButton(
  parent: Node,
  text: string,
  x: number,
  y: number,
  onClick: () => void,
  width = 190,
  height = 82,
  fontSize = 26,
): Node {
  const node = new Node(text);
  node.parent = parent;
  node.setPosition(x, y);
  node.addComponent(UITransform).setContentSize(width, height);
  const graphics = node.addComponent(Graphics);
  graphics.fillColor = new Color(24, 154, 170, 255);
  graphics.roundRect(-width / 2, -height / 2, width, height, 16);
  graphics.fill();
  makeLabel(node, text, fontSize, 0, 0, width - 12);
  node.on(Node.EventType.TOUCH_END, () => {
    SfxPlayer.unlock();
    // Rebuilding PlayLayer during TOUCH_END destroys the button mid-dispatch.
    setTimeout(onClick, 0);
  });
  return node;
}

export const PLAY_LAYER = "PlayLayer";

export function replacePlayLayer(canvas: Node): Node {
  const old = canvas.getChildByName(PLAY_LAYER);
  old?.destroy();
  const layer = new Node(PLAY_LAYER);
  layer.layer = canvas.layer;
  layer.parent = canvas;
  layer.addComponent(UITransform).setContentSize(1280, 720);
  return layer;
}
