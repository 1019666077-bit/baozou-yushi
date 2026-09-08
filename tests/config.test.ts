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
  it("keeps asset licensing and honest store capture gates in the repository", () => {
    const register = path.join(root, "THIRD_PARTY_ASSETS.md");
    const checklist = path.join(root, "docs", "STORE_ASSET_CHECKLIST.md");
    expect(fs.existsSync(register)).toBe(true);
    expect(fs.existsSync(checklist)).toBe(true);
    expect(fs.readFileSync(register, "utf8")).toContain("当前不包含第三方");
    expect(fs.readFileSync(register, "utf8")).toContain("完整提示词");
    expect(fs.readFileSync(checklist, "utf8")).toContain("不是成品截图");
    expect(fs.readFileSync(checklist, "utf8")).toContain("不得进入 release");
  });

  it("ships the five-island stage-two content set", () => {
    expect(fish).toHaveLength(22);
    expect(fish.filter((item) => item.tier === "normal")).toHaveLength(14);
    expect(fish.filter((item) => item.tier === "elite")).toHaveLength(5);
    expect(fish.filter((item) => item.tier === "boss")).toHaveLength(3);
    expect(tools).toHaveLength(3);
    expect(islands).toHaveLength(5);
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
      expect(tool.levels.map((entry) => entry.level)).toEqual([1, 2, 3, 4, 5]);
      expect(tool.levels[4].power).toBeGreaterThan(tool.levels[0].power);
      expect(tool.levels[4].cooldownMs).toBeLessThan(
        tool.levels[0].cooldownMs,
      );
      expect(tool.levels[3].modifiers).toBeTruthy();
      expect(tool.levels[4].modifiers).toBeTruthy();
    }
  });

  it("expands foam bay fish pools into string ids, not a Set", () => {
    const foamBay = islands.find((item) => item.id === "island_foam_bay");
    expect(foamBay).toBeTruthy();
    const pool = fishIdsForIsland(foamBay!);
    expect(pool).toContain("fish_bayfin");
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
    expect(boss?.escapeSeconds).toBe(90);
  });

  it("keeps the three islands in named content packs", () => {
    expect(islandPackName("island_foam_bay")).toBe("island_foam_bay");
    expect(islandPackName("island_prism_reef")).toBe("island_prism_reef");
    expect(islandPackName("island_storm_eye")).toBe("island_storm_eye");
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
