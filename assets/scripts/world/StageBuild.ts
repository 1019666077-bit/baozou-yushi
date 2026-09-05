import {
  Color,
  Material,
  Mesh,
  MeshRenderer,
  Node,
  primitives,
  utils,
} from "cc";
import type { StagePart } from "../domain/ProcGeom";

const mats = new Map<string, Material>();
let boxMesh: Mesh | undefined;
let sphereMesh: Mesh | undefined;
let planeMesh: Mesh | undefined;

export function resetStageMeshes(): void {
  boxMesh = undefined;
  sphereMesh = undefined;
  planeMesh = undefined;
  mats.clear();
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

export function unlitMat(color: Color): Material {
  const key = `${color.r},${color.g},${color.b},${color.a}`;
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
  renderer.mesh =
    part.kind === "sphere"
      ? sharedSphere()
      : part.kind === "plane"
        ? sharedPlane()
        : sharedBox();
  renderer.material = unlitMat(colorOf(part.color));
  renderer.shadowCastingMode = MeshRenderer.ShadowCastingMode.OFF;
  return node;
}

export function spawnParts(parent: Node, layer: number, parts: StagePart[]): Node[] {
  return parts.map((part) => spawnPart(parent, layer, part));
}
