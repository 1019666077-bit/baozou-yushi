import { Color, Graphics, Node, UITransform } from "cc";
import {
  fishLook,
  islandLook,
  type IslandLook,
  type Rgb,
} from "../domain/GrayLook";

function c(rgb: Rgb, a = 255): Color {
  return new Color(rgb[0], rgb[1], rgb[2], a);
}

function fillEllipse(
  g: Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: Color,
): void {
  g.fillColor = color;
  g.ellipse(x, y, rx, ry);
  g.fill();
}

function fillCircle(
  g: Graphics,
  x: number,
  y: number,
  r: number,
  color: Color,
): void {
  g.fillColor = color;
  g.circle(x, y, r);
  g.fill();
}

function fillPoly(g: Graphics, color: Color, pts: number[]): void {
  g.fillColor = color;
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.close();
  g.fill();
}

function palm(g: Graphics, x: number, y: number, s: number, look: IslandLook): void {
  g.fillColor = c([118, 82, 42]);
  g.roundRect(x - 3.5 * s, y, 7 * s, 32 * s, 2);
  g.fill();
  fillPoly(g, c(look.landDark), [
    x,
    y + 32 * s,
    x - 26 * s,
    y + 16 * s,
    x - 6 * s,
    y + 26 * s,
  ]);
  fillPoly(g, c(look.accent), [
    x,
    y + 34 * s,
    x + 26 * s,
    y + 14 * s,
    x + 6 * s,
    y + 26 * s,
  ]);
  fillPoly(g, c(look.land), [
    x,
    y + 36 * s,
    x - 12 * s,
    y + 50 * s,
    x + 12 * s,
    y + 50 * s,
  ]);
}

function hut(g: Graphics, x: number, y: number, s: number, look: IslandLook): void {
  fillPoly(g, c(look.accent), [
    x - 22 * s,
    y + 10 * s,
    x,
    y + 32 * s,
    x + 22 * s,
    y + 10 * s,
  ]);
  g.fillColor = c([236, 210, 150]);
  g.roundRect(x - 16 * s, y - 4 * s, 32 * s, 18 * s, 3);
  g.fill();
  g.fillColor = c([92, 58, 32]);
  g.roundRect(x - 4 * s, y - 4 * s, 8 * s, 12 * s, 2);
  g.fill();
  fillCircle(g, x + 8 * s, y + 6 * s, 2.4 * s, c([255, 214, 96]));
}

function foamIsle(g: Graphics, x: number, y: number, s: number, look: IslandLook): void {
  fillEllipse(g, x, y, 86 * s, 24 * s, c(look.deep, 160));
  fillEllipse(g, x, y + 6 * s, 78 * s, 20 * s, c(look.landDark, 210));
  fillEllipse(g, x, y + 14 * s, 70 * s, 18 * s, c(look.land));
  fillEllipse(g, x + 10 * s, y + 22 * s, 26 * s, 12 * s, c(look.landDark));
  fillEllipse(g, x - 8 * s, y + 10 * s, 18 * s, 5 * s, c([255, 248, 210], 90));
  palm(g, x - 22 * s, y + 12 * s, s, look);
  palm(g, x + 20 * s, y + 10 * s, 0.72 * s, look);
  hut(g, x + 2 * s, y + 8 * s, s * 0.85, look);
}

function prismIsle(g: Graphics, x: number, y: number, s: number, look: IslandLook): void {
  fillEllipse(g, x, y, 70 * s, 16 * s, c(look.landDark, 160));
  fillPoly(g, c(look.land), [
    x - 40 * s,
    y + 6 * s,
    x - 8 * s,
    y + 54 * s,
    x + 18 * s,
    y + 6 * s,
  ]);
  fillPoly(g, c(look.accent), [
    x - 6 * s,
    y + 6 * s,
    x + 16 * s,
    y + 62 * s,
    x + 34 * s,
    y + 6 * s,
  ]);
  fillPoly(g, c(look.landDark), [
    x + 8 * s,
    y + 6 * s,
    x + 40 * s,
    y + 36 * s,
    x + 52 * s,
    y + 6 * s,
  ]);
}

function stormIsle(g: Graphics, x: number, y: number, s: number, look: IslandLook): void {
  fillEllipse(g, x, y, 88 * s, 20 * s, c(look.landDark, 200));
  fillPoly(g, c(look.land), [
    x - 48 * s,
    y + 4 * s,
    x,
    y + 58 * s,
    x + 48 * s,
    y + 4 * s,
  ]);
  fillPoly(g, c(look.landDark), [
    x - 18 * s,
    y + 36 * s,
    x,
    y + 70 * s,
    x + 18 * s,
    y + 36 * s,
  ]);
  fillEllipse(g, x, y + 58 * s, 12 * s, 6 * s, c(look.accent));
  fillEllipse(g, x + 6 * s, y + 78 * s, 14 * s, 10 * s, c(look.haze, 140));
  fillEllipse(g, x + 18 * s, y + 92 * s, 18 * s, 8 * s, c(look.haze, 90));
}

function pier(g: Graphics, look: IslandLook): void {
  fillEllipse(g, -400, -214, 120, 18, c(look.deep, 200));
  g.fillColor = c([92, 62, 32]);
  for (let i = 0; i < 6; i++) {
    g.roundRect(-510 + i * 46, -252, 12, 36, 3);
    g.fill();
  }
  g.fillColor = c([196, 132, 64]);
  g.roundRect(-530, -226, 300, 22, 6);
  g.fill();
  g.fillColor = c([236, 178, 92]);
  g.roundRect(-530, -210, 300, 12, 4);
  g.fill();
  g.fillColor = c([168, 104, 48]);
  g.roundRect(-530, -198, 300, 8, 3);
  g.fill();
  g.fillColor = c([214, 86, 48]);
  g.roundRect(-486, -168, 86, 52, 8);
  g.fill();
  g.fillColor = c([255, 210, 120]);
  g.roundRect(-474, -156, 62, 14, 3);
  g.fill();
  fillCircle(g, -456, -128, 5, c([255, 220, 80]));
  fillCircle(g, -430, -124, 4, c([255, 168, 64]));
}

function sun(g: Graphics, x: number, y: number, look: IslandLook): void {
  fillCircle(g, x, y, 58, c(look.accent, 40));
  fillCircle(g, x, y, 40, c(look.accent, 90));
  fillCircle(g, x, y, 24, c([255, 226, 140]));
  fillCircle(g, x + 7, y + 5, 8, c([255, 248, 220], 200));
}

function paintWaterBands(g: Graphics, look: IslandLook): void {
  g.fillColor = c(look.skyTop);
  g.rect(-640, 200, 1280, 320);
  g.fill();
  g.fillColor = c(look.sky);
  g.rect(-640, 110, 1280, 110);
  g.fill();
  fillEllipse(g, 80, 176, 260, 28, c([255, 236, 190], 48));
  fillEllipse(g, -220, 154, 140, 16, c([255, 248, 220], 28));
  fillEllipse(g, 0, 96, 640, 36, c(look.haze, 160));
  g.fillColor = c(look.far);
  g.rect(-640, 36, 1280, 78);
  g.fill();
  g.fillColor = c(look.mid);
  g.rect(-640, -36, 1280, 82);
  g.fill();
  g.fillColor = c(look.near);
  g.rect(-640, -176, 1280, 148);
  g.fill();
  g.fillColor = c(look.deep);
  g.rect(-640, -360, 1280, 196);
  g.fill();
  g.strokeColor = c([255, 236, 180], 90);
  g.lineWidth = 6;
  g.moveTo(-640, 48);
  g.lineTo(640, 48);
  g.stroke();
  g.strokeColor = c([255, 252, 236], 70);
  g.lineWidth = 2.5;
  g.moveTo(-640, 40);
  g.lineTo(640, 40);
  g.stroke();
  fillEllipse(g, -220, -68, 170, 12, c([210, 246, 255], 40));
  fillEllipse(g, 160, -122, 210, 14, c([210, 246, 255], 28));
  fillEllipse(g, 420, -206, 140, 10, c([255, 248, 220], 22));
  fillEllipse(g, -80, -188, 90, 7, c([255, 248, 220], 18));
  g.strokeColor = c(look.haze, 70);
  g.lineWidth = 2.4;
  g.moveTo(-520, -40);
  g.bezierCurveTo(-360, -16, -200, -56, -40, -32);
  g.stroke();
  g.moveTo(40, -88);
  g.bezierCurveTo(180, -64, 320, -108, 480, -82);
  g.stroke();
  g.strokeColor = c([255, 252, 236], 36);
  g.lineWidth = 1.8;
  g.moveTo(-300, -160);
  g.bezierCurveTo(-140, -148, 20, -176, 180, -158);
  g.stroke();
}

export function drawSeascape(
  parent: Node,
  options: { islandId?: string; harbor?: boolean } = {},
): void {
  const harbor = options.harbor === true;
  const look = islandLook(options.islandId ?? "island_foam_bay", harbor);
  const canvasTransform =
    parent.getComponent(UITransform) ?? parent.addComponent(UITransform);
  canvasTransform.setContentSize(1280, 720);

  const background = new Node("OceanBackground");
  background.parent = parent;
  background.addComponent(UITransform).setContentSize(1280, 720);
  const g = background.addComponent(Graphics);

  paintWaterBands(g, look);

  if (harbor) {
    sun(g, 420, 250, look);
    foamIsle(g, -160, 78, 1, islandLook("island_foam_bay"));
    prismIsle(g, 170, 82, 1, islandLook("island_prism_reef"));
    stormIsle(g, 470, 76, 0.85, islandLook("island_storm_eye"));
    pier(g, look);
  } else if (options.islandId === "island_prism_reef") {
    sun(g, -480, 240, look);
    prismIsle(g, 360, 86, 1.15, look);
    prismIsle(g, -390, 80, 0.7, look);
    fillEllipse(g, 80, 48, 40, 8, c(look.accent, 90));
    fillEllipse(g, -120, 56, 24, 6, c(look.land, 80));
  } else if (options.islandId === "island_storm_eye") {
    fillCircle(g, 500, 250, 28, c(look.haze, 160));
    stormIsle(g, 340, 78, 1.2, look);
    foamIsle(g, -430, 70, 0.55, islandLook("island_foam_bay"));
  } else {
    sun(g, 460, 248, look);
    foamIsle(g, 380, 80, 1.1, look);
    foamIsle(g, -420, 74, 0.7, look);
  }
}

export function drawDock(parent: Node): void {
  const node = new Node("Dock");
  node.layer = parent.layer;
  node.parent = parent;
  node.addComponent(UITransform).setContentSize(1280, 720);
  const g = node.addComponent(Graphics);
  fillEllipse(g, -420, -250, 220, 16, new Color(8, 28, 40, 210));
  g.fillColor = new Color(78, 50, 26, 255);
  for (let i = 0; i < 6; i++) {
    g.roundRect(-620 + i * 68, -268, 14, 44, 3);
    g.fill();
  }
  g.fillColor = new Color(204, 138, 68, 255);
  g.roundRect(-640, -230, 460, 108, 14);
  g.fill();
  g.fillColor = new Color(236, 186, 108, 255);
  g.roundRect(-640, -230, 460, 18, 10);
  g.fill();
  g.fillColor = new Color(168, 108, 52, 255);
  for (let i = 0; i < 8; i++) {
    g.rect(-628 + i * 54, -214, 6, 82);
    g.fill();
  }
  g.strokeColor = new Color(92, 58, 28, 200);
  g.lineWidth = 3;
  g.moveTo(-630, -172);
  g.lineTo(-200, -172);
  g.stroke();
  g.fillColor = new Color(28, 168, 176, 255);
  g.roundRect(-560, -186, 88, 68, 12);
  g.fill();
  g.fillColor = new Color(16, 86, 98, 255);
  g.roundRect(-550, -176, 68, 18, 4);
  g.fill();
  g.fillColor = new Color(255, 226, 140, 160);
  g.roundRect(-542, -172, 20, 8, 3);
  g.fill();
  fillCircle(g, -248, -148, 7, new Color(255, 176, 56, 255));
  fillCircle(g, -248, -148, 3, new Color(255, 236, 160, 255));
}

export function drawBoat(graphics: Graphics): void {
  const g = graphics;
  g.clear();
  fillEllipse(g, 4, -16, 72, 14, new Color(8, 28, 40, 170));
  fillPoly(g, new Color(214, 128, 58, 255), [48, -4, 78, 8, 56, 16, 28, 6]);
  g.fillColor = new Color(226, 156, 72, 255);
  g.roundRect(-62, -14, 124, 36, 16);
  g.fill();
  g.fillColor = new Color(255, 206, 118, 255);
  g.roundRect(-56, 4, 112, 10, 4);
  g.fill();
  g.fillColor = new Color(168, 96, 44, 255);
  g.roundRect(-54, 12, 108, 7, 3);
  g.fill();
  g.fillColor = new Color(255, 228, 176, 255);
  g.roundRect(-16, 10, 56, 28, 8);
  g.fill();
  fillCircle(g, 12, 24, 9, new Color(92, 214, 226, 255));
  fillCircle(g, 14, 26, 3.6, new Color(255, 252, 240, 230));
  g.fillColor = new Color(92, 68, 40, 255);
  g.roundRect(-8, 12, 6, 46, 2);
  g.fill();
  fillPoly(g, new Color(255, 148, 42, 255), [-6, 56, 32, 42, -6, 32]);
  fillPoly(g, new Color(255, 226, 150, 220), [-6, 54, 18, 42, -6, 38]);
  fillCircle(g, -40, 8, 4, new Color(255, 196, 72, 255));
}

export function drawCrate(graphics: Graphics): void {
  const g = graphics;
  g.clear();
  fillEllipse(g, 0, -30, 52, 10, new Color(8, 28, 40, 160));
  g.fillColor = new Color(156, 92, 38, 255);
  g.roundRect(-46, -28, 92, 58, 8);
  g.fill();
  g.fillColor = new Color(204, 138, 64, 255);
  g.roundRect(-46, 12, 92, 18, 6);
  g.fill();
  g.fillColor = new Color(236, 186, 96, 255);
  g.roundRect(-40, 18, 80, 7, 3);
  g.fill();
  g.fillColor = new Color(110, 64, 28, 255);
  for (let i = 0; i < 4; i++) {
    g.rect(-36 + i * 22, -20, 5, 32);
    g.fill();
  }
  g.strokeColor = new Color(255, 214, 96, 230);
  g.lineWidth = 4;
  g.roundRect(-46, -28, 92, 58, 8);
  g.stroke();
  fillCircle(g, 0, 20, 5, new Color(255, 214, 72, 255));
  fillCircle(g, 0, 20, 2, new Color(255, 248, 200, 255));
}

function tint(rgb: Rgb, decoy: boolean, a = 255): Color {
  if (!decoy) return c(rgb, a);
  return new Color(
    Math.round((rgb[0] + 200) / 2),
    Math.round((rgb[1] + 210) / 2),
    Math.round((rgb[2] + 220) / 2),
    Math.round(a * 0.45),
  );
}

export function drawFishBody(
  g: Graphics,
  id: string,
  scale: number,
  decoy: boolean,
  armored: boolean,
): void {
  const look = fishLook(id);
  const s = scale;
  const body = tint(look.body, decoy);
  const belly = tint(look.belly, decoy);
  const accent = tint(look.accent, decoy);
  const kind = look.silhouette;

  if (kind === "eel") {
    fillEllipse(g, -28 * s, -4 * s, 22 * s, 9 * s, accent);
    fillEllipse(g, -6 * s, 0, 24 * s, 11 * s, body);
    fillEllipse(g, 18 * s, 2 * s, 20 * s, 10 * s, belly);
    fillCircle(g, 32 * s, 3 * s, 4 * s, new Color(20, 24, 32, decoy ? 120 : 255));
    return;
  }
  if (kind === "ray") {
    fillPoly(g, body, [
      22 * s,
      4 * s,
      -8 * s,
      36 * s,
      -28 * s,
      4 * s,
      -8 * s,
      -28 * s,
    ]);
    fillEllipse(g, 8 * s, 2 * s, 16 * s, 10 * s, belly);
    fillPoly(g, accent, [-24 * s, 2 * s, -52 * s, 8 * s, -52 * s, -4 * s]);
    return;
  }
  if (kind === "whale") {
    fillEllipse(g, 4 * s, 0, 48 * s, 22 * s, body);
    fillEllipse(g, 10 * s, -8 * s, 36 * s, 12 * s, belly);
    fillPoly(g, accent, [-36 * s, 0, -72 * s, 22 * s, -72 * s, -22 * s]);
    fillPoly(g, accent, [6 * s, 18 * s, 18 * s, 34 * s, 22 * s, 16 * s]);
    fillCircle(g, 28 * s, 6 * s, 3.5 * s, new Color(20, 28, 40, 255));
    fillEllipse(g, 18 * s, 16 * s, 6 * s, 4 * s, new Color(40, 56, 90, 255));
    return;
  }
  if (kind === "ribbon") {
    fillEllipse(g, 8 * s, 0, 38 * s, 10 * s, body);
    fillEllipse(g, 16 * s, -3 * s, 22 * s, 6 * s, belly);
    fillPoly(g, accent, [-28 * s, 0, -70 * s, 16 * s, -58 * s, 0, -70 * s, -16 * s]);
    fillPoly(g, belly, [-24 * s, 2 * s, -48 * s, 8 * s, -40 * s, 0]);
    return;
  }
  if (kind === "pod") {
    fillEllipse(g, 0, 0, 28 * s, 22 * s, body);
    fillEllipse(g, 4 * s, -6 * s, 18 * s, 12 * s, belly);
    fillCircle(g, -6 * s, 8 * s, 5 * s, accent);
    fillCircle(g, 8 * s, 10 * s, 4 * s, accent);
    fillCircle(g, 4 * s, 4 * s, 3 * s, new Color(255, 252, 210, 255));
    return;
  }
  if (kind === "sail") {
    fillPoly(g, accent, [-6 * s, 8 * s, 8 * s, 48 * s, 22 * s, 8 * s]);
    fillEllipse(g, 2 * s, -2 * s, 30 * s, 14 * s, body);
    fillEllipse(g, 8 * s, -6 * s, 20 * s, 8 * s, belly);
    fillPoly(g, body, [-26 * s, 0, -52 * s, 14 * s, -52 * s, -14 * s]);
    return;
  }
  if (kind === "jaw") {
    fillEllipse(g, 0, 0, 34 * s, 20 * s, body);
    fillEllipse(g, 8 * s, -8 * s, 22 * s, 10 * s, belly);
    fillEllipse(g, 22 * s, -4 * s, 16 * s, 12 * s, accent);
    fillPoly(g, tint(look.accent, decoy, 255), [
      18 * s,
      -12 * s,
      40 * s,
      -6 * s,
      22 * s,
      2 * s,
    ]);
    fillPoly(g, body, [-28 * s, 0, -50 * s, 16 * s, -50 * s, -16 * s]);
    if (armored) {
      fillEllipse(g, 4 * s, 4 * s, 22 * s, 16 * s, new Color(210, 176, 110, 230));
    }
    return;
  }
  if (kind === "shell") {
    fillEllipse(g, 0, 0, 32 * s, 20 * s, belly);
    fillEllipse(g, 4 * s, 6 * s, 24 * s, 16 * s, body);
    fillEllipse(g, -8 * s, 8 * s, 16 * s, 12 * s, accent);
    fillEllipse(g, 12 * s, 10 * s, 14 * s, 12 * s, accent);
    fillPoly(g, accent, [-24 * s, 0, -44 * s, 12 * s, -44 * s, -12 * s]);
    if (armored) {
      fillEllipse(g, 6 * s, 4 * s, 20 * s, 16 * s, new Color(230, 196, 120, 240));
    }
    return;
  }
  if (kind === "hopper") {
    fillEllipse(g, 4 * s, 0, 28 * s, 16 * s, body);
    fillEllipse(g, 10 * s, -6 * s, 18 * s, 9 * s, belly);
    fillPoly(g, accent, [4 * s, 10 * s, 18 * s, 28 * s, 20 * s, 8 * s]);
    fillPoly(g, body, [-22 * s, 2 * s, -48 * s, 18 * s, -40 * s, 0, -48 * s, -16 * s]);
    return;
  }
  fillPoly(g, accent, [-24 * s, 0, -68 * s, -20 * s, -52 * s, 0, -68 * s, 20 * s]);
  fillPoly(g, accent, [8 * s, 8 * s, 28 * s, 36 * s, 34 * s, 6 * s]);
  fillPoly(g, body, [6 * s, -6 * s, 0, -30 * s, 18 * s, -8 * s]);
  fillEllipse(g, 6 * s, 2 * s, 36 * s, 18 * s, body);
  fillEllipse(g, 16 * s, 8 * s, 22 * s, 10 * s, belly);
  fillEllipse(g, 18 * s, -2 * s, 8 * s, 5 * s, new Color(255, 168, 140, decoy ? 80 : 160));
  g.strokeColor = accent;
  g.lineWidth = 2.4;
  g.moveTo(-6 * s, 2 * s);
  g.bezierCurveTo(8 * s, 12 * s, 20 * s, 10 * s, 26 * s, 3 * s);
  g.stroke();
  fillCircle(g, 30 * s, 1 * s, 6.2 * s, new Color(255, 252, 244, decoy ? 120 : 255));
  fillCircle(g, 32 * s, 0, 3 * s, new Color(18, 28, 24, decoy ? 120 : 255));
  fillCircle(g, 33.2 * s, -1.2 * s, 1.1 * s, new Color(255, 255, 255, 240));
  fillEllipse(g, 34 * s, 10 * s, 4 * s, 2 * s, new Color(22, 40, 32, decoy ? 90 : 220));
}

export function drawFish(
  g: Graphics,
  id: string,
  scale: number,
  state: {
    decoy: boolean;
    armored: boolean;
    hit: boolean;
    hooked: boolean;
    flashing: boolean;
  },
): void {
  const look = fishLook(id);
  const s = scale;
  g.clear();
  if (state.hooked) {
    g.strokeColor = new Color(255, 210, 90, 230);
    g.lineWidth = 4;
    g.circle(0, 0, 58 * s);
    g.stroke();
  }
  drawFishBody(g, id, s, state.decoy, state.armored);
  if (state.hit) {
    g.strokeColor = new Color(255, 255, 255, 230);
    g.lineWidth = 6;
    g.ellipse(0, 0, 54 * s, 30 * s);
    g.stroke();
  }
  const glow = state.flashing
    ? new Color(255, 255, 120, 255)
    : new Color(255, 245, 150, 255);
  fillCircle(g, look.weakX * s, look.weakY * s, (state.flashing ? 11 : 5) * s, glow);
  g.strokeColor = state.flashing
    ? new Color(255, 255, 255, 255)
    : new Color(255, 255, 255, 220);
  g.lineWidth = state.flashing ? 5 : 3;
  g.circle(look.weakX * s, look.weakY * s, (state.flashing ? 16 : 10) * s);
  g.stroke();
}

export function drawShots(
  g: Graphics,
  shots: Array<{
    x: number;
    y: number;
    nx: number;
    ny: number;
    kind: string;
    radius: number;
  }>,
): void {
  for (const shot of shots) {
    const tail = shot.kind === "harpoon" ? 30 : 16;
    const color =
      shot.kind === "harpoon"
        ? new Color(255, 180, 90, 240)
        : shot.kind === "cannon"
          ? new Color(140, 230, 255, 230)
          : new Color(255, 236, 150, 240);
    g.strokeColor = color;
    g.lineWidth = shot.kind === "harpoon" ? 6 : 4;
    g.moveTo(shot.x - shot.nx * tail, shot.y - shot.ny * tail);
    g.lineTo(shot.x, shot.y);
    g.stroke();
    fillCircle(g, shot.x, shot.y, shot.radius, color);
  }
}

export function drawJuice(
  g: Graphics,
    particles: Array<{
    x: number;
    y: number;
    life: number;
    kind: "bubble" | "star" | "coin";
    size: number;
  }>,
  flashes: Array<{
    x: number;
    y: number;
    life: number;
    kind: string;
  }> = [],
): void {
  g.clear();
  for (const flash of flashes) {
    const alpha = Math.max(0, Math.round(210 * flash.life));
    const grow =
      flash.kind === "catch" || flash.kind === "perfect" || flash.kind === "sell"
        ? 42
        : flash.kind === "weak"
          ? 28
          : 30;
    const r = 18 + grow * (1 - flash.life);
    g.strokeColor = new Color(255, 236, 120, alpha);
    g.lineWidth =
      flash.kind === "weak" || flash.kind === "perfect"
        ? 6
        : flash.kind === "catch" || flash.kind === "sell"
          ? 6
          : 5;
    g.circle(flash.x, flash.y, r);
    g.stroke();
    const cover = flash.kind === "weak" ? 0.18 : 0.32;
    fillCircle(
      g,
      flash.x,
      flash.y,
      r * cover,
      new Color(255, 250, 200, Math.round((flash.kind === "weak" ? 36 : 64) * flash.life)),
    );
  }
  for (const particle of particles) {
    const alpha = Math.max(40, Math.round(255 * particle.life));
    const r = particle.size * (0.65 + 0.35 * particle.life);
    if (particle.kind === "coin") {
      fillEllipse(
        g,
        particle.x,
        particle.y,
        r * 1.15,
        r * 0.85,
        new Color(255, 214, 72, alpha),
      );
      fillEllipse(
        g,
        particle.x - r * 0.15,
        particle.y + r * 0.15,
        r * 0.35,
        r * 0.22,
        new Color(255, 248, 200, Math.round(alpha * 0.7)),
      );
      continue;
    }
    if (particle.kind === "star") {
      fillPoly(
        g,
        new Color(255, 236, 120, alpha),
        [
          particle.x,
          particle.y + r * 1.4,
          particle.x + r * 0.9,
          particle.y,
          particle.x,
          particle.y - r * 1.4,
          particle.x - r * 0.9,
          particle.y,
        ],
      );
      continue;
    }
    fillCircle(
      g,
      particle.x,
      particle.y,
      r,
      new Color(170, 240, 255, alpha),
    );
    fillCircle(
      g,
      particle.x - r * 0.25,
      particle.y + r * 0.2,
      r * 0.35,
      new Color(255, 255, 255, Math.round(alpha * 0.7)),
    );
  }
}

export function drawGuideHole(
  g: Graphics,
  cx: number,
  cy: number,
  holeRadius: number,
  spec: {
    lineWidth: number;
    fillAlpha: number;
    maskAlpha: number;
    stroke: [number, number, number, number];
  },
): void {
  g.clear();
  const left = -640;
  const right = 640;
  const top = 360;
  const bottom = -360;
  const holeL = Math.max(left, cx - holeRadius);
  const holeR = Math.min(right, cx + holeRadius);
  const holeB = Math.max(bottom, cy - holeRadius);
  const holeT = Math.min(top, cy + holeRadius);
  g.fillColor = new Color(4, 10, 18, spec.maskAlpha);
  if (holeT < top) {
    g.rect(left, holeT, right - left, top - holeT);
    g.fill();
  }
  if (holeB > bottom) {
    g.rect(left, bottom, right - left, holeB - bottom);
    g.fill();
  }
  if (holeL > left && holeT > holeB) {
    g.rect(left, holeB, holeL - left, holeT - holeB);
    g.fill();
  }
  if (holeR < right && holeT > holeB) {
    g.rect(holeR, holeB, right - holeR, holeT - holeB);
    g.fill();
  }
  g.fillColor = new Color(
    spec.stroke[0],
    spec.stroke[1],
    spec.stroke[2],
    spec.fillAlpha,
  );
  g.circle(cx, cy, holeRadius);
  g.fill();
  g.strokeColor = new Color(
    spec.stroke[0],
    spec.stroke[1],
    spec.stroke[2],
    spec.stroke[3],
  );
  g.lineWidth = spec.lineWidth;
  g.circle(cx, cy, holeRadius);
  g.stroke();
}
