import {
  Color,
  ImageAsset,
  Material,
  Mesh,
  MeshRenderer,
  Node,
  Texture2D,
  Vec4,
  primitives,
  utils,
} from "cc";
import {
  STAGE_BUDGET,
  displaceWaterPositions,
  type StageFinish,
  type StagePart,
} from "../domain/ProcGeom";
import { paintWaterAlbedo, paintWoodAlbedo } from "../domain/StageSkin";

const mats = new Map<string, Material>();
let boxMesh: Mesh | undefined;
let sphereMesh: Mesh | undefined;
let planeMesh: Mesh | undefined;
let woodTex: Texture2D | undefined;
let waterTex: Texture2D | undefined;
let useLit = true;
let useSkinTex = true;

type WaterRipple = {
  mesh: Mesh;
  geo: primitives.IGeometry;
  xScale: number;
  zScale: number;
};

const ripples = new Map<Node, WaterRipple>();

export function resetStageMeshes(): void {
  boxMesh = undefined;
  sphereMesh = undefined;
  planeMesh = undefined;
  woodTex = undefined;
  waterTex = undefined;
  mats.clear();
  ripples.clear();
  useLit = true;
  useSkinTex = true;
}

function ensurePrimitives(): void {
  if (!primitives?.box || !utils?.createMesh) {
    throw new Error("3d primitive module is off");
  }
}

export function sharedBox(): Mesh {
  ensurePrimitives();
  boxMesh ??= utils.createMesh(primitives.box());
  return boxMesh;
}

export function sharedSphere(): Mesh {
  ensurePrimitives();
  if (!sphereMesh) {
    const geo = primitives.sphere
      ? primitives.sphere(0.5, { segments: 10 })
      : primitives.box();
    sphereMesh = utils.createMesh(geo);
  }
  return sphereMesh;
}

export function sharedPlane(): Mesh {
  ensurePrimitives();
  if (!planeMesh) {
    const geo = primitives.plane
      ? primitives.plane({
          width: 1,
          length: 1,
          widthSegments: 1,
          lengthSegments: 1,
        })
      : primitives.box();
    planeMesh = utils.createMesh(geo);
  }
  return planeMesh;
}

function makeWaterMesh(): { mesh: Mesh; geo: primitives.IGeometry } {
  ensurePrimitives();
  if (!primitives.plane) {
    const geo = primitives.box();
    return { mesh: utils.createMesh(geo), geo };
  }
  const geo = primitives.plane({
    width: 1,
    length: 1,
    widthSegments: STAGE_BUDGET.waterSegX,
    lengthSegments: STAGE_BUDGET.waterSegZ,
  });
  return { mesh: utils.createMesh(geo), geo };
}

function uploadRuntimeTex(
  paint: typeof paintWoodAlbedo,
): Texture2D | undefined {
  if (!useSkinTex) return undefined;
  try {
    const { width, height, data } = paint(STAGE_BUDGET.runtimeTexSize);
    const img = new ImageAsset();
    img.reset({
      _data: data,
      _compressed: false,
      width,
      height,
      format: Texture2D.PixelFormat.RGBA8888,
    });
    const tex = new Texture2D();
    tex.image = img;
    tex.setWrapMode(Texture2D.WrapMode.REPEAT, Texture2D.WrapMode.REPEAT);
    tex.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
    tex.uploadData(data);
    return tex;
  } catch {
    useSkinTex = false;
    return undefined;
  }
}

function woodTexture(): Texture2D | undefined {
  woodTex ??= uploadRuntimeTex(paintWoodAlbedo);
  return woodTex;
}

function waterTexture(): Texture2D | undefined {
  waterTex ??= uploadRuntimeTex(paintWaterAlbedo);
  return waterTex;
}

function roughnessOf(finish?: StageFinish): number {
  if (finish === "water") return 0.22;
  if (finish === "fish") return 0.4;
  if (finish === "prop") return 0.35;
  if (finish === "wood") return 0.78;
  return 0.68;
}

function makeLit(color: Color, finish: StageFinish | undefined, glow: boolean): Material | undefined {
  if (!useLit) return undefined;
  try {
    const mat = new Material();
    mat.initialize({
      effectName: "builtin-standard",
      defines: { USE_INSTANCING: false },
    });
    mat.setProperty("mainColor", color);
    mat.setProperty("roughness", roughnessOf(finish));
    mat.setProperty("metallic", finish === "prop" && glow ? 0.28 : 0.02);
    if (glow) {
      mat.setProperty(
        "emissive",
        new Color(
          Math.min(255, color.r + 40),
          Math.min(255, color.g + 24),
          Math.min(255, color.b + 8),
          255,
        ),
      );
    }
    return mat;
  } catch {
    useLit = false;
    return undefined;
  }
}

export function unlitMat(color: Color): Material {
  const key = `u:${color.r},${color.g},${color.b},${color.a}`;
  const cached = mats.get(key);
  if (cached) return cached;
  const mat = new Material();
  mat.initialize({
    effectName: "builtin-unlit",
    defines: { USE_INSTANCING: false },
  });
  mat.setProperty("mainColor", color);
  mats.set(key, mat);
  return mat;
}

function skinMat(
  color: Color,
  finish: StageFinish | undefined,
  tiling?: readonly [number, number],
): Material {
  const kind = finish === "wood" ? "wood" : finish === "water" ? "water" : "";
  if (!kind || !useSkinTex) return unlitMat(color);
  const tileKey = tiling ? `${tiling[0]},${tiling[1]}` : "";
  const key = `t:${kind}:${color.r},${color.g},${color.b}:${tileKey}`;
  const cached = mats.get(key);
  if (cached) return cached;
  const tex = kind === "wood" ? woodTexture() : waterTexture();
  if (!tex) return unlitMat(color);
  try {
    const mat = new Material();
    mat.initialize({
      effectName: "builtin-unlit",
      defines: { USE_TEXTURE: true, USE_INSTANCING: false },
    });
    mat.setProperty("mainColor", color);
    mat.setProperty("mainTexture", tex);
    if (tiling) {
      mat.setProperty("tilingOffset", new Vec4(tiling[0], tiling[1], 0, 0));
    }
    mats.set(key, mat);
    return mat;
  } catch {
    useSkinTex = false;
    return unlitMat(color);
  }
}

export function stageMat(
  color: Color,
  finish?: StageFinish,
  _glow = false,
  tiling?: readonly [number, number],
): Material {
  // Runtime-created standard materials can rebuild their PSO before the
  // generated mesh has a valid local descriptor layout on Web. Unlit + a
  // tiny runtime albedo is deterministic across Web, Android, and WeChat.
  if (finish === "wood" || finish === "water") {
    return skinMat(color, finish, tiling);
  }
  return unlitMat(color);
}

export function colorOf(rgb: readonly [number, number, number, number?]): Color {
  return new Color(rgb[0], rgb[1], rgb[2], rgb[3] ?? 255);
}

export function spawnPart(parent: Node, layer: number, part: StagePart): Node {
  const node = new Node(part.name);
  node.layer = layer;
  node.parent = parent;
  node.setPosition(part.x, part.y, part.z);
  node.setScale(part.sx, part.sy, part.sz);
  if (part.rx || part.ry || part.rz) {
    node.setRotationFromEuler(part.rx ?? 0, part.ry ?? 0, part.rz ?? 0);
  }
  const renderer = node.addComponent(MeshRenderer);
  if (part.wave && part.kind === "plane") {
    const made = makeWaterMesh();
    renderer.mesh = made.mesh;
    ripples.set(node, {
      mesh: made.mesh,
      geo: made.geo,
      xScale: part.sx,
      zScale: part.sz,
    });
  } else {
    renderer.mesh =
      part.kind === "sphere"
        ? sharedSphere()
        : part.kind === "plane"
          ? sharedPlane()
          : sharedBox();
  }
  renderer.material = stageMat(
    colorOf(part.color),
    part.finish,
    part.glow === true,
    part.uvTiling,
  );
  renderer.shadowCastingMode = MeshRenderer.ShadowCastingMode.OFF;
  return node;
}

export function spawnParts(parent: Node, layer: number, parts: StagePart[]): Node[] {
  return parts.map((part) => spawnPart(parent, layer, part));
}

export function rippleWater(node: Node | undefined, time: number, amp: number): void {
  if (!node?.isValid) return;
  const ripple = ripples.get(node);
  if (!ripple) return;
  displaceWaterPositions(
    ripple.geo.positions,
    time,
    amp,
    ripple.xScale,
    ripple.zScale,
    ripple.geo.normals,
  );
  utils.createMesh(ripple.geo, ripple.mesh);
}
