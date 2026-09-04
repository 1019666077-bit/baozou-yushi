import { DECK_Y, DOCK_X } from "./FlopPhysics";

export const DECK_SCALE = 0.01;
export const DECK_SURFACE_Z = 1.15;

export type DeckKind = "sea" | "deck";

export function deckKindForFish(x: number, onDeck: boolean, yanking: boolean): DeckKind {
  if (onDeck) return "deck";
  if (yanking && x <= DOCK_X + 90) return "deck";
  return "sea";
}

export function toActorWorld(
  x: number,
  y: number,
  kind: DeckKind,
): { x: number; y: number; z: number } {
  const wx = x * DECK_SCALE;
  if (kind === "deck") {
    return {
      x: wx,
      y: 0.22 + Math.max(0, y - DECK_Y) * DECK_SCALE,
      z: DECK_SURFACE_Z,
    };
  }
  return {
    x: wx,
    y: 0.1,
    z: -y * DECK_SCALE,
  };
}

export function toBoatWorld(x: number, y: number): { x: number; y: number; z: number } {
  return {
    x: x * DECK_SCALE,
    y: 0.4,
    z: 0.82 - y * DECK_SCALE * 0.28,
  };
}
