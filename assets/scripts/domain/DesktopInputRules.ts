export type DesktopMoveKey =
  | "KeyW"
  | "KeyA"
  | "KeyS"
  | "KeyD"
  | "ArrowUp"
  | "ArrowLeft"
  | "ArrowDown"
  | "ArrowRight";

const MOVE_KEYS = new Set<string>([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);

export function isDesktopMoveKey(code: string): code is DesktopMoveKey {
  return MOVE_KEYS.has(code);
}

export function desktopMoveAxis(keys: ReadonlySet<string>): {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
} {
  const left = keys.has("KeyA") || keys.has("ArrowLeft");
  const right = keys.has("KeyD") || keys.has("ArrowRight");
  const down = keys.has("KeyS") || keys.has("ArrowDown");
  const up = keys.has("KeyW") || keys.has("ArrowUp");
  return {
    x: left === right ? 0 : left ? -1 : 1,
    y: down === up ? 0 : down ? -1 : 1,
  };
}
