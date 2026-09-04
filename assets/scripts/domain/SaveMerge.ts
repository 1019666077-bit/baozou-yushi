import type { PlayerSave } from "../data/types";

export const CURRENT_SAVE_SCHEMA = 1;

export function createDefaultSave(now = Date.now()): PlayerSave {
  return {
    schemaVersion: CURRENT_SAVE_SCHEMA,
    revision: 1,
    updatedAt: now,
    coins: 0,
    unlockedIslands: ["island_tutorial", "island_foam_bay"],
    tools: [{ toolId: "tool_rod", level: 1 }],
    discoveredFish: [],
    bestStyleScore: 0,
    tutorialComplete: false,
    completedRuns: 0,
    recentRuns: [],
    settings: {
      music: true,
      sfx: true,
      vibration: true,
      lowPower: false,
    },
  };
}

export function mergeSaves(
  local: PlayerSave | null,
  cloud: PlayerSave | null,
): PlayerSave {
  if (!local && !cloud) return createDefaultSave();
  if (!local) return migrate(cloud!);
  if (!cloud) return migrate(local);

  const a = migrate(local);
  const b = migrate(cloud);
  if (a.revision !== b.revision) return a.revision > b.revision ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

export function migrate(save: PlayerSave): PlayerSave {
  if (save.schemaVersion > CURRENT_SAVE_SCHEMA) {
    throw new Error("Save was created by a newer client");
  }
  return {
    ...createDefaultSave(save.updatedAt),
    ...save,
    schemaVersion: CURRENT_SAVE_SCHEMA,
    completedRuns:
      typeof save.completedRuns === "number"
        ? save.completedRuns
        : save.tutorialComplete
          ? 1
          : 0,
    recentRuns: Array.isArray(save.recentRuns)
      ? save.recentRuns.slice(0, 5)
      : [],
    settings: {
      ...createDefaultSave(save.updatedAt).settings,
      ...save.settings,
    },
  };
}
