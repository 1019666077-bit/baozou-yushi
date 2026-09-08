import type { PlayerSave } from "../data/types";
import {
  bundledFish,
  bundledIslands,
  bundledTools,
} from "../data/bundledConfig";
import { defaultStationState, normalizeStation } from "./StationOps";

import { localDayKey } from "./MonetizationPolicy";
import { sanitizeCosmeticSelection } from "./MarketArtStyle";

export const CURRENT_SAVE_SCHEMA = 3;

export function createDefaultSave(now = Date.now()): PlayerSave {
  return {
    schemaVersion: CURRENT_SAVE_SCHEMA,
    revision: 1,
    updatedAt: now,
    coins: 0,
    unlockedIslands: ["island_foam_bay"],
    tools: [{ toolId: "tool_rod", level: 1 }],
    discoveredFish: [],
    bestStyleScore: 0,
    tutorialComplete: false,
    completedRuns: 0,
    recentRuns: [],
    fishMastery: {},
    challengeProgress: {},
    cosmeticShards: 0,
    dailyOrders: null,
    weeklyChallenge: null,
    endlessTide: {
      unlocked: false,
      bestRound: 0,
      bestBankedCoins: 0,
      runs: 0,
    },
    entitlements: {},
    cosmetics: [],
    selectedCosmetics: {},
    adGrants: {
      dayKey: localDayKey(now),
      lastInterstitialAt: 0,
      settlementRewards: 0,
      reliefGrants: 0,
      grantIds: [],
    },
    pendingTransactions: [],
    settings: {
      music: true,
      sfx: true,
      vibration: true,
      lowPower: false,
    },
    station: defaultStationState(),
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
  const source = save as Partial<PlayerSave>;
  if ((source.schemaVersion ?? 1) > CURRENT_SAVE_SCHEMA) {
    throw new Error("Save was created by a newer client");
  }
  const fallback = createDefaultSave(
    typeof source.updatedAt === "number" ? source.updatedAt : Date.now(),
  );
  const toolById = new Map(bundledTools.map((tool) => [tool.id, tool]));
  const islandIds = new Set(bundledIslands.map((island) => island.id));
  const fishIds = new Set(bundledFish.map((fish) => fish.id));
  const tools = Array.isArray(source.tools)
    ? source.tools.flatMap((item) => {
        const config =
          item && typeof item.toolId === "string"
            ? toolById.get(item.toolId)
            : undefined;
        if (!config || !Number.isFinite(item.level)) return [];
        const maxLevel = Math.max(...config.levels.map((level) => level.level));
        return [{
          toolId: config.id,
          level: Math.max(1, Math.min(maxLevel, Math.floor(item.level))),
        }];
      })
    : fallback.tools;
  const fishMastery =
    source.fishMastery && typeof source.fishMastery === "object"
      ? Object.fromEntries(
          Object.entries(source.fishMastery)
            .filter(
              ([id, value]) =>
                fishIds.has(id) &&
                value &&
                typeof value.fishId === "string" &&
                fishIds.has(value.fishId),
            )
            .map(([id, value]) => [
              id,
              {
                fishId: value.fishId,
                captures: Math.max(0, Math.floor(value.captures ?? 0)),
                bestGrade: ["C", "B", "A", "S"].includes(value.bestGrade)
                  ? value.bestGrade
                  : "C",
                mastery: Math.max(0, Math.floor(value.mastery ?? 0)),
              },
            ]),
        )
      : {};
  const serverControlledCosmetics = new Set([
    "boat_ember",
    "trail_prism",
    "boat_mist",
  ]);
  const cosmetics = Array.isArray(source.cosmetics)
    ? Array.from(new Set(source.cosmetics.filter(
        (id): id is string =>
          typeof id === "string" && !serverControlledCosmetics.has(id),
      )))
    : [];
  return {
    ...fallback,
    ...source,
    schemaVersion: CURRENT_SAVE_SCHEMA,
    revision: Number.isFinite(source.revision) ? Math.max(1, source.revision!) : 1,
    updatedAt: Number.isFinite(source.updatedAt) ? source.updatedAt! : fallback.updatedAt,
    coins: Number.isFinite(source.coins) ? Math.max(0, source.coins!) : 0,
    unlockedIslands: Array.isArray(source.unlockedIslands)
      ? Array.from(new Set([
          "island_foam_bay",
          ...source.unlockedIslands.filter(
            (id): id is string => typeof id === "string" && islandIds.has(id),
          ),
        ]))
      : fallback.unlockedIslands,
    tools: tools.length ? tools : fallback.tools,
    discoveredFish: Array.isArray(source.discoveredFish)
      ? Array.from(new Set(source.discoveredFish.filter(
          (id): id is string => typeof id === "string" && fishIds.has(id),
        )))
      : [],
    fishMastery,
    challengeProgress:
      source.challengeProgress && typeof source.challengeProgress === "object"
        ? { ...source.challengeProgress }
        : {},
    cosmeticShards: Number.isFinite(source.cosmeticShards)
      ? Math.max(0, Math.floor(source.cosmeticShards!))
      : 0,
    dailyOrders: source.dailyOrders ?? null,
    weeklyChallenge: source.weeklyChallenge ?? null,
    endlessTide: {
      ...fallback.endlessTide,
      ...(source.endlessTide ?? {}),
    },
    // Entitlements are server-authoritative. This client has no embedded
    // public-key verifier, so a local cache is deny-by-default on process
    // start; the authenticated verifier repopulates it via syncRevocations.
    entitlements: {},
    cosmetics,
    selectedCosmetics: sanitizeCosmeticSelection(
      cosmetics,
      source.selectedCosmetics && typeof source.selectedCosmetics === "object"
        ? source.selectedCosmetics
        : {},
    ),
    adGrants: {
      ...fallback.adGrants,
      ...(source.adGrants ?? {}),
      grantIds: Array.isArray(source.adGrants?.grantIds)
        ? Array.from(new Set(source.adGrants.grantIds.filter((id) => typeof id === "string")))
        : [],
    },
    pendingTransactions: Array.isArray(source.pendingTransactions)
      ? source.pendingTransactions
          .filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              typeof item.productId === "string" &&
              [
                "purchasing",
                "awaiting_verification",
                "finalize_pending",
                "verification_failed",
              ].includes(
                item.state,
              ),
          )
          .slice(-20)
      : [],
    completedRuns:
      typeof source.completedRuns === "number"
        ? source.completedRuns
        : source.tutorialComplete
          ? 1
          : 0,
    recentRuns: Array.isArray(source.recentRuns)
      ? source.recentRuns
          .filter((run) => run && islandIds.has(run.islandId))
          .slice(0, 5)
      : [],
    settings: {
      ...fallback.settings,
      ...(source.settings ?? {}),
    },
    station: normalizeStation(save.station),
  };
}
