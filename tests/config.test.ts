import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fishIdsForIsland } from "../assets/scripts/content/IslandFishPool";
import { islandPackName } from "../assets/scripts/domain/IslandPack";
import type {
  FishConfig,
  IslandConfig,
  ToolConfig,
} from "../assets/scripts/data/types";

const root = path.resolve(import.meta.dirname, "..");
const read = <T>(name: string): T =>
  JSON.parse(
    fs.readFileSync(path.join(root, "assets", "config", name), "utf8"),
  ) as T;

const fish = read<FishConfig[]>("fish.json");
const tools = read<ToolConfig[]>("tools.json");
const islands = read<IslandConfig[]>("islands.json");

describe("content configuration", () => {
  it("ships exactly the scoped MVP content", () => {
    expect(fish.filter((item) => item.tier === "normal")).toHaveLength(6);
    expect(fish.filter((item) => item.tier === "elite")).toHaveLength(3);
    expect(fish.filter((item) => item.tier === "boss")).toHaveLength(1);
    expect(tools).toHaveLength(3);
    expect(islands.filter((item) => item.id !== "island_tutorial")).toHaveLength(
      3,
    );
  });

  it("has no broken fish, island, or tool references", () => {
    const fishIds = new Set(fish.map((item) => item.id));
    const islandIds = new Set(islands.map((item) => item.id));
    for (const item of fish) expect(islandIds.has(item.islandId)).toBe(true);
    for (const tool of tools) expect(islandIds.has(tool.unlockIsland)).toBe(true);
    for (const island of islands) {
      for (const wave of island.waves) {
        for (const id of wave.fishPool) expect(fishIds.has(id)).toBe(true);
      }
      if (island.bossId) expect(fishIds.has(island.bossId)).toBe(true);
    }
  });

  it("keeps combat and economy values inside design boundaries", () => {
    for (const item of fish) {
      expect(item.escapeSeconds).toBeGreaterThanOrEqual(10);
      expect(item.weakPointMultiplier).toBeGreaterThanOrEqual(1.5);
      expect(item.weakPointMultiplier).toBeLessThanOrEqual(2.5);
      expect(item.basePrice).toBeGreaterThan(0);
    }
    for (const tool of tools) {
      expect(tool.levels.map((entry) => entry.level)).toEqual([1, 2, 3]);
      expect(tool.levels[2].power).toBeGreaterThan(tool.levels[0].power);
      expect(tool.levels[2].cooldownMs).toBeLessThan(
        tool.levels[0].cooldownMs,
      );
    }
  });

  it("gives the tutorial tide a 60s clock so the first crate budget matches the wave", () => {
    const tutorial = islands.find((item) => item.id === "island_tutorial");
    expect(tutorial?.targetSessionSeconds).toBe(60);
    expect(tutorial?.waves[0]?.durationSeconds).toBe(60);
    expect(
      tutorial!.waves.reduce((sum, wave) => sum + wave.durationSeconds, 0),
    ).toBeLessThanOrEqual(60);
  });

  it("expands island fish pools into string ids, not a Set", () => {
    const tutorial = islands.find((item) => item.id === "island_tutorial");
    expect(tutorial).toBeTruthy();
    const pool = fishIdsForIsland(tutorial!);
    expect(pool).toEqual(["fish_bayfin"]);
    expect(pool.every((id) => typeof id === "string")).toBe(true);
  });

  it("defines a three-phase tide-singer that can be reeled in one window", () => {
    const final = islands.find((item) => item.id === "island_storm_eye");
    const boss = fish.find((item) => item.id === "boss_tide_singer");
    expect(final?.bossId).toBe("boss_tide_singer");
    expect(final?.bossPhases).toHaveLength(3);
    expect(final?.bossPhases?.map((phase) => phase.threshold)).toEqual([
      1,
      0.66,
      0.33,
    ]);
    expect(boss?.toughness).toBe(420);
    expect(boss?.escapeSeconds).toBe(120);
  });

  it("keeps the three islands in named content packs", () => {
    expect(islandPackName("island_foam_bay")).toBe("island_foam_bay");
    expect(islandPackName("island_prism_reef")).toBe("island_prism_reef");
    expect(islandPackName("island_storm_eye")).toBe("island_storm_eye");
    expect(islandPackName("island_tutorial")).toBeUndefined();
    for (const id of [
      "island_foam_bay",
      "island_prism_reef",
      "island_storm_eye",
    ]) {
      const pack = JSON.parse(
        fs.readFileSync(
          path.join(root, "assets", "bundles", id, "pack.json"),
          "utf8",
        ),
      ) as { islandId: string };
      expect(pack.islandId).toBe(id);
    }
  });
});
