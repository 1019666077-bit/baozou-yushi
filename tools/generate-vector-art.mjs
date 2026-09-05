/**
 * 自绘简笔卡通矢量：湾鳍鱼、木码头、分层水面。
 * 配方与 Runtime Graphics / 代理预览同一份 ArtRecipe，不引入外部立绘包。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "assets/art/vector");
fs.mkdirSync(out, { recursive: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "baozou-art-"));
const tsc = path.join(root, "node_modules/typescript/bin/tsc");
const compiled = spawnSync(
  process.execPath,
  [
    tsc,
    "--ignoreConfig",
    "--rootDir",
    path.join(root, "assets/scripts"),
    "--outDir",
    tmp,
    "--module",
    "commonjs",
    "--target",
    "ES2022",
    "--skipLibCheck",
    "--esModuleInterop",
    path.join(root, "assets/scripts/domain/GrayLook.ts"),
    path.join(root, "assets/scripts/domain/ArtRecipe.ts"),
  ],
  { encoding: "utf8" },
);
if (compiled.status !== 0) {
  throw new Error(`art recipe compile failed:\n${compiled.stdout}\n${compiled.stderr}`);
}

const require = createRequire(import.meta.url);
const Art = require(path.join(tmp, "domain/ArtRecipe.js"));
const Look = require(path.join(tmp, "domain/GrayLook.js"));

function hex([r, g, b], a = 255) {
  if (a < 255) return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function svgX(x, origin) {
  return origin ? x : x + 640;
}

function svgY(y, h, origin) {
  return origin ? y : 360 - y;
}

function opsToSvg(ops, { width, height, viewBox, local = false }) {
  const parts = [];
  for (const op of ops) {
    if (op.t === "ellipse") {
      parts.push(
        `<ellipse cx="${svgX(op.x, local)}" cy="${svgY(op.y, height, local)}" rx="${op.rx}" ry="${op.ry}" fill="${hex(op.fill, op.fill[3] ?? 255)}"/>`,
      );
      continue;
    }
    if (op.t === "circle") {
      parts.push(
        `<circle cx="${svgX(op.x, local)}" cy="${svgY(op.y, height, local)}" r="${op.r}" fill="${hex(op.fill, op.fill[3] ?? 255)}"/>`,
      );
      continue;
    }
    if (op.t === "rect") {
      const x = local ? op.x : op.x + 640;
      const y = local ? -op.y - op.h : 360 - op.y - op.h;
      const r = op.r ?? 0;
      parts.push(
        `<rect x="${x}" y="${y}" width="${op.w}" height="${op.h}" rx="${r}" fill="${hex(op.fill, op.fill[3] ?? 255)}"/>`,
      );
      continue;
    }
    if (op.t === "poly") {
      const pts = [];
      for (let i = 0; i < op.pts.length; i += 2) {
        pts.push(`${svgX(op.pts[i], local)},${svgY(op.pts[i + 1], height, local)}`);
      }
      parts.push(`<polygon points="${pts.join(" ")}" fill="${hex(op.fill, op.fill[3] ?? 255)}"/>`);
      continue;
    }
    if (op.t === "line") {
      parts.push(
        `<line x1="${svgX(op.x1, local)}" y1="${svgY(op.y1, height, local)}" x2="${svgX(op.x2, local)}" y2="${svgY(op.y2, height, local)}" stroke="${hex(op.color, op.color[3] ?? 255)}" stroke-width="${op.width}" fill="none"/>`,
      );
      continue;
    }
    if (op.t === "bezier") {
      parts.push(
        `<path d="M${svgX(op.x1, local)} ${svgY(op.y1, height, local)} C${svgX(op.c1x, local)} ${svgY(op.c1y, height, local)}, ${svgX(op.c2x, local)} ${svgY(op.c2y, height, local)}, ${svgX(op.x2, local)} ${svgY(op.y2, height, local)}" fill="none" stroke="${hex(op.color, op.color[3] ?? 255)}" stroke-width="${op.width}"/>`,
      );
      continue;
    }
    if (op.t === "ring") {
      parts.push(
        `<circle cx="${svgX(op.x, local)}" cy="${svgY(op.y, height, local)}" r="${op.r}" fill="none" stroke="${hex(op.color, op.color[3] ?? 255)}" stroke-width="${op.width}"/>`,
      );
      continue;
    }
    if (op.t === "strokeRect") {
      const x = local ? op.x : op.x + 640;
      const y = local ? -op.y - op.h : 360 - op.y - op.h;
      parts.push(
        `<rect x="${x}" y="${y}" width="${op.w}" height="${op.h}" rx="${op.r ?? 0}" fill="none" stroke="${hex(op.color, op.color[3] ?? 255)}" stroke-width="${op.width}"/>`,
      );
      continue;
    }
    if (op.t === "grad") {
      const id = `g${parts.length}`;
      const x1 = op.axis === "x" ? "0%" : "0%";
      const y1 = op.axis === "x" ? "0%" : "100%";
      const x2 = op.axis === "x" ? "100%" : "0%";
      const y2 = op.axis === "x" ? "0%" : "0%";
      const x = local ? op.x : op.x + 640;
      const y = local ? -op.y - op.h : 360 - op.y - op.h;
      parts.push(
        `<defs><linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0%" stop-color="${hex(op.from, op.from[3] ?? 255)}"/><stop offset="100%" stop-color="${hex(op.to, op.to[3] ?? 255)}"/></linearGradient></defs><rect x="${x}" y="${y}" width="${op.w}" height="${op.h}" rx="${op.r ?? 0}" fill="url(#${id})"/>`,
      );
      continue;
    }
    if (op.t === "speckle") {
      const dots = Art.speckleDots(op);
      for (const dot of dots) {
        parts.push(
          `<circle cx="${svgX(dot.x, local)}" cy="${svgY(dot.y, height, local)}" r="${dot.r}" fill="${hex(op.color, op.color[3] ?? 255)}"/>`,
        );
      }
      continue;
    }
    if (op.t === "shadow") {
      parts.push(
        `<ellipse cx="${svgX(op.x, local)}" cy="${svgY(op.y, height, local)}" rx="${op.rx}" ry="${op.ry}" fill="${hex(op.fill, op.fill[3] ?? 255)}"/>`,
      );
      continue;
    }
    if (op.t === "grain") {
      for (const stroke of Art.grainStrokes(op)) {
        parts.push(
          `<line x1="${svgX(stroke.x1, local)}" y1="${svgY(stroke.y1, height, local)}" x2="${svgX(stroke.x2, local)}" y2="${svgY(stroke.y2, height, local)}" stroke="${hex(op.color, op.color[3] ?? 255)}" stroke-width="${stroke.w}" fill="none"/>`,
        );
      }
      continue;
    }
    if (op.t === "wash") {
      for (const blob of Art.washBlobs(op)) {
        parts.push(
          `<ellipse cx="${svgX(blob.x, local)}" cy="${svgY(blob.y, height, local)}" rx="${blob.rx}" ry="${blob.ry}" fill="${hex(op.color, op.color[3] ?? 255)}"/>`,
        );
      }
      continue;
    }
    if (op.t === "burst") {
      const pts = [];
      const raw = Art.burstPts(op);
      for (let i = 0; i < raw.length; i += 2) {
        pts.push(`${svgX(raw[i], local)},${svgY(raw[i + 1], height, local)}`);
      }
      parts.push(`<polygon points="${pts.join(" ")}" fill="${hex(op.fill, op.fill[3] ?? 255)}"/>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  ${parts.join("\n  ")}
</svg>
`;
}

const look = Look.islandLook("island_foam_bay", true);
const water = opsToSvg(Art.islandSetOps("island_foam_bay", true, 0), {
  width: 1280,
  height: 720,
  viewBox: "0 0 1280 720",
});
const dock = opsToSvg(Art.dockOps(), {
  width: 440,
  height: 140,
  viewBox: "-640 -280 460 160",
});
const bayfin = opsToSvg(
  Art.fishOps("fish_bayfin", 1, {
    decoy: false,
    armored: false,
    hit: false,
    hooked: false,
    flashing: true,
    face: "idle",
  }),
  {
    width: 320,
    height: 160,
    viewBox: "-80 -50 160 100",
    local: true,
  },
);

fs.writeFileSync(path.join(out, "bayfin.svg"), bayfin);
fs.writeFileSync(path.join(out, "dock.svg"), dock);
fs.writeFileSync(path.join(out, "water.svg"), water);
fs.writeFileSync(
  path.join(out, "README.md"),
  `# 自绘矢量（非外部立绘包）

\`generate-vector-art.mjs\` 从 \`ArtRecipe\` 写出湾鳍鱼、木码头、分层海景。

Runtime Graphics 与第一局体验代理读同一份配方。**不能当作 Cocos 实机截图。**

港口日落 / 木码头市集 / 鱼剪影分层，色板跟 \`GrayLook\` 对齐。
`,
);
console.log(`wrote vector art → ${out} (${look.skyTop.join(",")})`);
