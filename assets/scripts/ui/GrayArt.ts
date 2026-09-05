import { Color, Graphics, Node, UITransform } from "cc";
import {
  boatOps,
  crateOps,
  dockOps,
  fishOps,
  islandSetOps,
  mix,
  speckleDots,
  type DrawOp,
  type FishFace,
  type Rgba,
} from "../domain/ArtRecipe";

function toColor(rgba: Rgba): Color {
  return new Color(rgba[0], rgba[1], rgba[2], rgba[3] ?? 255);
}

function paintOps(g: Graphics, ops: DrawOp[]): void {
  for (const op of ops) {
    if (op.t === "ellipse") {
      g.fillColor = toColor(op.fill);
      g.ellipse(op.x, op.y, op.rx, op.ry);
      g.fill();
      continue;
    }
    if (op.t === "circle") {
      g.fillColor = toColor(op.fill);
      g.circle(op.x, op.y, op.r);
      g.fill();
      continue;
    }
    if (op.t === "rect") {
      g.fillColor = toColor(op.fill);
      if (op.r && op.r > 0) g.roundRect(op.x, op.y, op.w, op.h, op.r);
      else g.rect(op.x, op.y, op.w, op.h);
      g.fill();
      continue;
    }
    if (op.t === "poly") {
      g.fillColor = toColor(op.fill);
      g.moveTo(op.pts[0], op.pts[1]);
      for (let i = 2; i < op.pts.length; i += 2) g.lineTo(op.pts[i], op.pts[i + 1]);
      g.close();
      g.fill();
      continue;
    }
    if (op.t === "line") {
      g.strokeColor = toColor(op.color);
      g.lineWidth = op.width;
      g.moveTo(op.x1, op.y1);
      g.lineTo(op.x2, op.y2);
      g.stroke();
      continue;
    }
    if (op.t === "bezier") {
      g.strokeColor = toColor(op.color);
      g.lineWidth = op.width;
      g.moveTo(op.x1, op.y1);
      g.bezierCurveTo(op.c1x, op.c1y, op.c2x, op.c2y, op.x2, op.y2);
      g.stroke();
      continue;
    }
    if (op.t === "ring") {
      g.strokeColor = toColor(op.color);
      g.lineWidth = op.width;
      g.circle(op.x, op.y, op.r);
      g.stroke();
      continue;
    }
    if (op.t === "grad") {
      const bands = 6;
      for (let i = 0; i < bands; i++) {
        const t = i / (bands - 1);
        const rgb = mix(
          [op.from[0], op.from[1], op.from[2]],
          [op.to[0], op.to[1], op.to[2]],
          t,
        );
        const a = Math.round(
          (op.from[3] ?? 255) + ((op.to[3] ?? 255) - (op.from[3] ?? 255)) * t,
        );
        g.fillColor = toColor([rgb[0], rgb[1], rgb[2], a]);
        if (op.axis === "x") {
          const slice = op.w / bands;
          if (op.r && op.r > 0 && (i === 0 || i === bands - 1)) {
            g.roundRect(op.x + i * slice, op.y, slice + 1, op.h, op.r);
          } else g.rect(op.x + i * slice, op.y, slice + 1, op.h);
        } else {
          const slice = op.h / bands;
          g.rect(op.x, op.y + i * slice, op.w, slice + 1);
        }
        g.fill();
      }
      continue;
    }
    if (op.t === "speckle") {
      g.fillColor = toColor(op.color);
      for (const dot of speckleDots(op)) {
        g.circle(dot.x, dot.y, dot.r);
        g.fill();
      }
      continue;
    }
    if (op.t === "shadow") {
      g.fillColor = toColor(op.fill);
      g.ellipse(op.x, op.y, op.rx, op.ry);
      g.fill();
      continue;
    }
    g.strokeColor = toColor(op.color);
    g.lineWidth = op.width;
    if (op.r && op.r > 0) g.roundRect(op.x, op.y, op.w, op.h, op.r);
    else g.rect(op.x, op.y, op.w, op.h);
    g.stroke();
  }
}

export function drawSeascape(
  parent: Node,
  options: { islandId?: string; harbor?: boolean } = {},
): void {
  const harbor = options.harbor === true;
  const islandId = options.islandId ?? "island_foam_bay";
  const canvasTransform =
    parent.getComponent(UITransform) ?? parent.addComponent(UITransform);
  canvasTransform.setContentSize(1280, 720);

  const background = new Node("OceanBackground");
  background.parent = parent;
  background.addComponent(UITransform).setContentSize(1280, 720);
  const g = background.addComponent(Graphics);
  paintOps(g, islandSetOps(islandId, harbor));
}

export function drawDock(parent: Node): void {
  const node = new Node("Dock");
  node.layer = parent.layer;
  node.parent = parent;
  node.addComponent(UITransform).setContentSize(1280, 720);
  paintOps(node.addComponent(Graphics), dockOps());
}

export function drawBoat(graphics: Graphics): void {
  graphics.clear();
  paintOps(graphics, boatOps());
}

export function drawCrate(graphics: Graphics): void {
  graphics.clear();
  paintOps(graphics, crateOps());
}

export function drawFishBody(
  g: Graphics,
  id: string,
  scale: number,
  decoy: boolean,
  armored: boolean,
  face: FishFace = "idle",
): void {
  paintOps(g, fishOps(id, scale, { decoy, armored, hit: false, hooked: false, flashing: false, face }));
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
    face?: FishFace;
  },
): void {
  g.clear();
  paintOps(g, fishOps(id, scale, state));
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
    g.fillColor = color;
    g.circle(shot.x, shot.y, shot.radius);
    g.fill();
  }
}

export function drawJuice(
  g: Graphics,
  particles: Array<{
    x: number;
    y: number;
    life: number;
    kind: "bubble" | "star" | "coin" | "dust";
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
        : flash.kind === "weak" || flash.kind === "smash"
          ? 28
          : 30;
    const r = 18 + grow * (1 - flash.life);
    g.strokeColor = new Color(255, 236, 120, alpha);
    g.lineWidth =
      flash.kind === "weak" || flash.kind === "perfect" || flash.kind === "smash"
        ? 6
        : flash.kind === "catch" || flash.kind === "sell"
          ? 6
          : 5;
    g.circle(flash.x, flash.y, r);
    g.stroke();
    const cover = flash.kind === "weak" ? 0.18 : 0.32;
    g.fillColor = new Color(
      255,
      250,
      200,
      Math.round((flash.kind === "weak" ? 36 : 64) * flash.life),
    );
    g.circle(flash.x, flash.y, r * cover);
    g.fill();
  }
  for (const particle of particles) {
    const alpha = Math.max(40, Math.round(255 * particle.life));
    const r = particle.size * (0.65 + 0.35 * particle.life);
    if (particle.kind === "coin") {
      g.fillColor = new Color(255, 214, 72, alpha);
      g.ellipse(particle.x, particle.y, r * 1.15, r * 0.85);
      g.fill();
      g.fillColor = new Color(255, 248, 200, Math.round(alpha * 0.7));
      g.ellipse(particle.x - r * 0.15, particle.y + r * 0.15, r * 0.35, r * 0.22);
      g.fill();
      continue;
    }
    if (particle.kind === "dust") {
      g.fillColor = new Color(186, 142, 78, Math.round(alpha * 0.85));
      g.ellipse(particle.x, particle.y, r * 1.4, r * 0.55);
      g.fill();
      continue;
    }
    if (particle.kind === "star") {
      g.fillColor = new Color(255, 236, 120, alpha);
      g.moveTo(particle.x, particle.y + r * 1.4);
      g.lineTo(particle.x + r * 0.9, particle.y);
      g.lineTo(particle.x, particle.y - r * 1.4);
      g.lineTo(particle.x - r * 0.9, particle.y);
      g.close();
      g.fill();
      continue;
    }
    g.fillColor = new Color(170, 240, 255, alpha);
    g.circle(particle.x, particle.y, r);
    g.fill();
    g.fillColor = new Color(255, 255, 255, Math.round(alpha * 0.7));
    g.circle(particle.x - r * 0.25, particle.y + r * 0.2, r * 0.35);
    g.fill();
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
    haloWidth?: number;
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
  const halo = spec.haloWidth ?? 4;
  if (halo > 0) {
    g.lineWidth = halo;
    g.strokeColor = new Color(
      spec.stroke[0],
      spec.stroke[1],
      spec.stroke[2],
      Math.max(40, Math.round(spec.stroke[3] * 0.45)),
    );
    g.circle(cx, cy, holeRadius + 10);
    g.stroke();
  }
}
