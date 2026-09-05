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
  g.fillColor = c(look.accent);
  g.roundRect(x - 3 * s, y, 6 * s, 28 * s, 2);
  g.fill();
  fillPoly(g, c(look.landDark), [
    x,
    y + 30 * s,
    x - 22 * s,
    y + 18 * s,
    x - 8 * s,
    y + 24 * s,
  ]);
  fillPoly(g, c(look.landDark), [
    x,
    y + 30 * s,
    x + 22 * s,
    y + 16 * s,
    x + 6 * s,
    y + 24 * s,
  ]);
  fillPoly(g, c(look.accent), [
    x,
    y + 32 * s,
    x - 10 * s,
    y + 42 * s,
    x + 10 * s,
    y + 42 * s,
  ]);
}

function foamIsle(g: Graphics, x: number, y: number, s: number, look: IslandLook): void {
  fillEllipse(g, x, y, 78 * s, 22 * s, c(look.landDark, 180));
  fillEllipse(g, x, y + 8 * s, 70 * s, 18 * s, c(look.land));
  fillEllipse(g, x + 8 * s, y + 18 * s, 28 * s, 16 * s, c(look.landDark));
  palm(g, x - 18 * s, y + 10 * s, s, look);
  palm(g, x + 16 * s, y + 8 * s, 0.75 * s, look);
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
  fillEllipse(g, -420, -210, 90, 16, c(look.deep, 180));
  g.fillColor = c(look.accent);
  g.roundRect(-520, -228, 260, 18, 4);
  g.fill();
  g.fillColor = c([138, 108, 64]);
  for (let i = 0; i < 5; i++) {
    g.roundRect(-500 + i * 48, -248, 10, 28, 2);
    g.fill();
  }
  g.fillColor = c([176, 132, 78]);
  g.roundRect(-520, -214, 260, 10, 3);
  g.fill();
}

function sun(g: Graphics, x: number, y: number, look: IslandLook): void {
  fillCircle(g, x, y, 36, c(look.accent, 80));
  fillCircle(g, x, y, 22, c(look.accent));
  fillCircle(g, x + 6, y + 4, 8, c([255, 236, 200], 180));
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

  g.fillColor = c(look.skyTop);
  g.rect(-640, 160, 1280, 360);
  g.fill();
  g.fillColor = c(look.sky);
  g.rect(-640, 70, 1280, 120);
  g.fill();
  fillEllipse(g, 0, 86, 640, 28, c(look.haze, 120));
  g.fillColor = c(look.far);
  g.rect(-640, 28, 1280, 70);
  g.fill();
  g.fillColor = c(look.mid);
  g.rect(-640, -50, 1280, 90);
  g.fill();
  g.fillColor = c(look.near);
  g.rect(-640, -200, 1280, 160);
  g.fill();
  g.fillColor = c(look.deep);
  g.rect(-640, -360, 1280, 180);
  g.fill();

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

  g.strokeColor = c(look.haze, 90);
  g.lineWidth = 3;
  g.moveTo(-640, 40);
  g.lineTo(640, 40);
  g.stroke();
  fillEllipse(g, -180, -90, 120, 10, c(look.haze, 40));
  fillEllipse(g, 220, -140, 160, 12, c(look.haze, 30));
}

export function drawDock(parent: Node): void {
  const node = new Node("Dock");
  node.layer = parent.layer;
  node.parent = parent;
  node.addComponent(UITransform).setContentSize(1280, 720);
  const g = node.addComponent(Graphics);
  g.fillColor = new Color(16, 42, 58, 200);
  g.roundRect(-640, -252, 440, 26, 4);
  g.fill();
  g.fillColor = new Color(176, 124, 70, 255);
  g.roundRect(-640, -226, 410, 92, 10);
  g.fill();
  g.fillColor = new Color(142, 96, 52, 255);
  for (let i = 0; i < 7; i++) {
    g.rect(-630 + i * 56, -220, 6, 80);
    g.fill();
  }
  g.fillColor = new Color(24, 154, 170, 255);
  g.roundRect(-556, -184, 76, 62, 10);
  g.fill();
  g.fillColor = new Color(18, 90, 104, 255);
  g.roundRect(-548, -176, 60, 18, 4);
  g.fill();
}

export function drawBoat(graphics: Graphics): void {
  const g = graphics;
  g.clear();
  fillEllipse(g, 0, -20, 58, 11, new Color(18, 48, 62, 160));
  fillPoly(g, new Color(196, 122, 64, 255), [40, -8, 62, 2, 48, 10, 28, 4]);
  g.fillColor = new Color(214, 160, 86, 255);
  g.roundRect(-50, -14, 100, 28, 10);
  g.fill();
  g.fillColor = new Color(176, 118, 58, 255);
  g.roundRect(-48, 6, 96, 8, 3);
  g.fill();
  g.fillColor = new Color(236, 214, 168, 255);
  g.roundRect(-10, 6, 44, 22, 5);
  g.fill();
  fillCircle(g, 8, 18, 7, new Color(120, 196, 214, 255));
  fillCircle(g, 10, 20, 3, new Color(236, 248, 255, 200));
  g.fillColor = new Color(92, 74, 48, 255);
  g.rect(-4, 8, 5, 36);
  g.fill();
  fillPoly(g, new Color(255, 168, 72, 255), [-2, 42, 22, 34, -2, 28]);
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
  fillEllipse(g, 2 * s, 0, 32 * s, 16 * s, body);
  fillEllipse(g, 10 * s, -6 * s, 20 * s, 9 * s, belly);
  fillPoly(g, accent, [6 * s, 8 * s, 22 * s, 30 * s, 28 * s, 6 * s]);
  fillPoly(g, body, [-26 * s, 0, -54 * s, 16 * s, -48 * s, 0, -54 * s, -16 * s]);
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
    kind: "bubble" | "star";
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
    const grow = flash.kind === "catch" || flash.kind === "perfect" ? 56 : 42;
    const r = 18 + grow * (1 - flash.life);
    g.strokeColor = new Color(255, 236, 120, alpha);
    g.lineWidth = flash.kind === "catch" || flash.kind === "perfect" ? 8 : 6;
    g.circle(flash.x, flash.y, r);
    g.stroke();
    fillCircle(
      g,
      flash.x,
      flash.y,
      r * 0.42,
      new Color(255, 250, 200, Math.round(80 * flash.life)),
    );
  }
  for (const particle of particles) {
    const alpha = Math.max(40, Math.round(255 * particle.life));
    const r = particle.size * (0.65 + 0.35 * particle.life);
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
  g.fillColor = new Color(6, 14, 22, spec.maskAlpha);
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
