export const ISLAND_PACK_NAMES = [
  "island_foam_bay",
  "island_prism_reef",
  "island_storm_eye",
] as const;

export type IslandPackName = (typeof ISLAND_PACK_NAMES)[number];

export function islandPackName(islandId: string): IslandPackName | undefined {
  return ISLAND_PACK_NAMES.find((name) => name === islandId);
}

export function harborSailWait(islandName: string): string {
  return `正在驶向${islandName}…`;
}
