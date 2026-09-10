/**
 * 从领域层抽出潮退浮站零件 JSON，供浏览器 Three.js 灰盒用。
 * 非 Cocos 实机。generated/ 不提交。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const genDomain = path.join(root, "tools/first-run-preview/generated/domain");

function extract() {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "tools/first-run-preview/extract-copy.mjs")],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function shift(parts, pos = { x: 0, y: 0, z: 0 }) {
  return parts.map((part) => ({
    name: part.name,
    kind: part.kind,
    x: part.x + (pos.x ?? 0),
    y: part.y + (pos.y ?? 0),
    z: part.z + (pos.z ?? 0),
    sx: part.sx,
    sy: part.sy,
    sz: part.sz,
    color: Array.from(part.color),
    rx: part.rx ?? 0,
    ry: part.ry ?? 0,
    rz: part.rz ?? 0,
    finish: part.finish ?? "prop",
    glow: part.glow === true,
    wave: part.wave === true,
  }));
}

export function dumpLayout({ skipExtract = false } = {}) {
  if (!skipExtract) extract();
  if (!fs.existsSync(path.join(genDomain, "TideStation.js"))) {
    throw new Error("TideStation extract missing — run extract-copy.mjs first");
  }
  const require = createRequire(import.meta.url);
  const Tide = require(path.join(genDomain, "TideStation.js"));
  const Gray = require(path.join(genDomain, "GrayLook.js"));
  const Proc = require(path.join(genDomain, "ProcGeom.js"));
  const HarborCopy = require(path.join(genDomain, "HarborCopy.js"));

  const look = Gray.islandLook("island_foam_bay", true);
  const station = Tide.TIDE_STATION;
  const parts = [
    ...shift(Tide.oceanParts(look.near, look.deep)),
    ...shift(Tide.horizonParts(look)),
    ...shift(Tide.foundationParts(1)),
    ...shift(Tide.raftPropParts(1)),
    ...shift(Tide.orderBoardParts(), station.orderBoard),
    ...shift(Tide.fishermanParts(), station.fisherman),
    ...shift(Proc.boatParts(), station.boat),
    ...shift(Proc.flotsamParts(), Tide.flotsamAnchor()),
  ];

  const layout = {
    proxy: true,
    disclaimer:
      "浏览器 3D 灰盒代理，零件来自 TideStation.ts。不是 Cocos Creator 实机，不能拷进 creator-shots。",
    title: HarborCopy.harborWorldTitle(),
    hero: Tide.HARBOR_HERO.name,
    look,
    cam: station.cam,
    light: { pitch: -42, yaw: 48 },
    parts,
  };

  const outDir = path.join(here, "generated");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "layout.json");
  fs.writeFileSync(outFile, `${JSON.stringify(layout, null, 2)}\n`);
  return { outFile, count: parts.length, title: layout.title };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dumped = dumpLayout();
  console.log(`tide-station layout ${dumped.count} parts → ${dumped.outFile}`);
}
