import { Color, Graphics, JsonAsset, Label, Node, UITransform, resources } from "cc";
import { SfxPlayer } from "../platform/SfxPlayer";
import {
  canSelectCosmetic,
  MARKET_UI,
} from "../domain/MarketArtStyle";
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

export function drawBoat(graphics: Graphics, cosmeticId?: string): void {
  paintBoat(graphics, cosmeticId);
}

export function drawDock(parent: Node, cosmeticId?: string): void {
  paintDock(parent, cosmeticId);
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
  node.layer = parent.layer;
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
  node.layer = parent.layer;
  node.parent = parent;
  node.setPosition(x, y);
  node.addComponent(UITransform).setContentSize(width, height);
  const graphics = node.addComponent(Graphics);
  graphics.fillColor = new Color(...MARKET_UI.woodDark, 255);
  graphics.roundRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, MARKET_UI.cornerRadius);
  graphics.fill();
  graphics.fillColor = new Color(...MARKET_UI.wood, 255);
  graphics.roundRect(-width / 2, -height / 2, width, height, MARKET_UI.cornerRadius);
  graphics.fill();
  makeLabel(node, text, fontSize, 0, 0, width - 12);
  node.on(Node.EventType.TOUCH_END, () => {
    SfxPlayer.unlock();
    // Rebuilding PlayLayer during TOUCH_END destroys the button mid-dispatch.
    setTimeout(onClick, 0);
  });
  return node;
}

export function makePriceTag(
  parent: Node,
  value: string,
  x: number,
  y: number,
  emphasis: "level" | "quote" | "freshness" | "target" = "quote",
): Label {
  const node = new Node(`PriceTag-${emphasis}`);
  node.layer = parent.layer;
  node.parent = parent;
  node.setPosition(x, y);
  node.addComponent(UITransform).setContentSize(250, 54);
  const g = node.addComponent(Graphics);
  const fill = emphasis === "freshness" ? MARKET_UI.fresh : MARKET_UI.paper;
  g.fillColor = new Color(...MARKET_UI.ink, 220);
  g.roundRect(-127, -29, 254, 58, 8);
  g.fill();
  g.fillColor = new Color(...fill, 255);
  g.roundRect(-123, -25, 246, 50, 6);
  g.fill();
  const label = makeLabel(node, value, emphasis === "quote" ? 24 : 20, 0, 0, 230);
  label.color = new Color(...MARKET_UI.ink, 255);
  return label;
}

export function activeCosmeticIds(owned: readonly string[], selected: {
  boat?: string;
  trail?: string;
}): { boat?: string; trail?: string } {
  const boat = selected.boat && canSelectCosmetic(owned, selected.boat, "boat")
    ? selected.boat
    : undefined;
  const trail = selected.trail && canSelectCosmetic(owned, selected.trail, "trail")
    ? selected.trail
    : undefined;
  return { boat, trail };
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
