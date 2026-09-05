import { Color, Graphics, JsonAsset, Label, Node, UITransform, resources } from "cc";
import {
  buttonFillRgb,
  buttonLabelRgb,
  buttonRadius,
  buttonStrokeRgb,
  buttonStrokeWidth,
  creamInkRgb,
  goldHudRgb,
  plateFillRgba,
  plateSize,
  plateStrokeRgba,
  type ButtonTone,
} from "../domain/GameFeel";
import { SfxPlayer } from "../platform/SfxPlayer";
import { drawBoat as paintBoat, drawCrate as paintCrate, drawDock as paintDock, drawSeascape } from "./GrayArt";

export type { ButtonTone };

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

export function drawCrate(graphics: Graphics): void {
  paintCrate(graphics);
}

export function paintPlate(
  graphics: Graphics,
  tutorial = false,
  width = plateSize().width,
  height = plateSize().height,
): void {
  const fill = plateFillRgba(tutorial);
  const stroke = plateStrokeRgba(tutorial);
  const radius = plateSize().radius;
  graphics.clear();
  graphics.fillColor = new Color(fill[0], fill[1], fill[2], fill[3]);
  graphics.roundRect(-width / 2, -height / 2, width, height, radius);
  graphics.fill();
  graphics.fillColor = new Color(255, 226, 150, tutorial ? 50 : 28);
  graphics.roundRect(-width / 2 + 4, height / 2 - 10, width - 8, 8, 6);
  graphics.fill();
  graphics.strokeColor = new Color(stroke[0], stroke[1], stroke[2], stroke[3]);
  graphics.lineWidth = tutorial ? 3 : 1.8;
  graphics.roundRect(-width / 2, -height / 2, width, height, radius);
  graphics.stroke();
}

export function makePlate(
  parent: Node,
  x: number,
  y: number,
  tutorial = false,
  width = plateSize().width,
  height = plateSize().height,
): Node {
  const node = new Node("NarrationPlate");
  node.layer = parent.layer;
  node.parent = parent;
  node.setPosition(x, y);
  node.addComponent(UITransform).setContentSize(width, height);
  paintPlate(node.addComponent(Graphics), tutorial, width, height);
  return node;
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

export function tintGold(label: Label): Label {
  const rgb = goldHudRgb();
  label.color = new Color(rgb[0], rgb[1], rgb[2], 255);
  return label;
}

/** 港口升级缺口条：读得出 11/90，不靠特效。 */
export function makeProgressBar(
  parent: Node,
  x: number,
  y: number,
  width: number,
  ratio: number,
  height = 14,
): Node {
  const node = new Node("UpgradeProgress");
  node.layer = parent.layer;
  node.parent = parent;
  node.setPosition(x, y);
  node.addComponent(UITransform).setContentSize(width, height);
  const graphics = node.addComponent(Graphics);
  const gold = goldHudRgb();
  const clamped = Math.min(1, Math.max(0, ratio));
  graphics.fillColor = new Color(18, 28, 36, 220);
  graphics.roundRect(-width / 2, -height / 2, width, height, height / 2);
  graphics.fill();
  const fillW = Math.max(clamped > 0 ? 10 : 0, width * clamped);
  if (fillW > 0) {
    graphics.fillColor = new Color(gold[0], gold[1], gold[2], 240);
    graphics.roundRect(-width / 2, -height / 2, fillW, height, height / 2);
    graphics.fill();
  }
  graphics.strokeColor = new Color(gold[0], gold[1], gold[2], 170);
  graphics.lineWidth = 2;
  graphics.roundRect(-width / 2, -height / 2, width, height, height / 2);
  graphics.stroke();
  return node;
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
  tone: ButtonTone = "secondary",
): Node {
  const node = new Node(text);
  node.parent = parent;
  node.setPosition(x, y);
  node.addComponent(UITransform).setContentSize(width, height);
  const graphics = node.addComponent(Graphics);
  paintButtonChrome(graphics, width, height, tone);
  const label = makeLabel(node, text, fontSize, 0, 0, width - 12);
  const ink = buttonLabelRgb(tone);
  label.color = new Color(ink[0], ink[1], ink[2], 255);
  if (tone === "primary") {
    const cream = creamInkRgb();
    label.color = new Color(cream[0], cream[1], cream[2], 255);
  }
  node.on(Node.EventType.TOUCH_END, () => {
    SfxPlayer.unlock();
    // Rebuilding PlayLayer during TOUCH_END destroys the button mid-dispatch.
    setTimeout(onClick, 0);
  });
  return node;
}

export function paintButtonTone(node: Node, tone: ButtonTone): void {
  const transform = node.getComponent(UITransform);
  const graphics = node.getComponent(Graphics);
  if (!transform || !graphics) return;
  const width = transform.contentSize.width;
  const height = transform.contentSize.height;
  paintButtonChrome(graphics, width, height, tone);
  const label = node.getComponentInChildren(Label);
  if (label) {
    const ink = buttonLabelRgb(tone);
    label.color = new Color(ink[0], ink[1], ink[2], 255);
  }
}

function paintButtonChrome(
  graphics: Graphics,
  width: number,
  height: number,
  tone: ButtonTone,
): void {
  graphics.clear();
  const fill = buttonFillRgb(tone);
  const radius = buttonRadius();
  graphics.fillColor = new Color(fill[0], fill[1], fill[2], 255);
  graphics.roundRect(-width / 2, -height / 2, width, height, radius);
  graphics.fill();
  if (tone === "primary") {
    graphics.fillColor = new Color(255, 168, 48, 255);
    graphics.roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, Math.max(8, radius - 4));
    graphics.fill();
    graphics.fillColor = new Color(255, 220, 150, 95);
    graphics.roundRect(-width / 2 + 8, height / 2 - 22, width - 16, 14, 8);
    graphics.fill();
    graphics.fillColor = new Color(180, 72, 16, 70);
    graphics.roundRect(-width / 2 + 8, -height / 2 + 6, width - 16, 10, 6);
    graphics.fill();
  }
  const stroke = buttonStrokeRgb(tone);
  graphics.strokeColor = new Color(stroke[0], stroke[1], stroke[2], tone === "primary" ? 230 : 150);
  graphics.lineWidth = buttonStrokeWidth(tone);
  graphics.roundRect(-width / 2, -height / 2, width, height, radius);
  graphics.stroke();
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
