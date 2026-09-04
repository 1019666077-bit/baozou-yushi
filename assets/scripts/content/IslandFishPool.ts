import type { IslandConfig } from "../data/types";

export function fishIdsForIsland(island: IslandConfig): string[] {
  const ids = new Set(island.waves.flatMap((wave) => wave.fishPool));
  if (island.bossId) ids.add(island.bossId);
  return Array.from(ids);
}
