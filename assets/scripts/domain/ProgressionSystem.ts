import type { PlayerSave, ToolConfig } from "../data/types";

export class ProgressionSystem {
  static purchaseTool(save: PlayerSave, tool: ToolConfig): PlayerSave {
    if (save.tools.some((entry) => entry.toolId === tool.id)) return save;
    if (!save.unlockedIslands.includes(tool.unlockIsland)) {
      throw new Error(`Tool is locked behind island: ${tool.unlockIsland}`);
    }
    const first = tool.levels.find((level) => level.level === 1);
    if (!first) throw new Error(`Tool has no level 1: ${tool.id}`);
    if (save.coins < first.upgradeCost) {
      throw new Error(`Insufficient coins: need ${first.upgradeCost}`);
    }
    return {
      ...save,
      coins: save.coins - first.upgradeCost,
      revision: save.revision + 1,
      updatedAt: Date.now(),
      tools: [...save.tools.map((entry) => ({ ...entry })), { toolId: tool.id, level: 1 }],
    };
  }

  static purchaseToolUpgrade(
    save: PlayerSave,
    tool: ToolConfig,
  ): PlayerSave {
    const progress = save.tools.find((entry) => entry.toolId === tool.id);
    if (!progress) throw new Error(`Tool not owned: ${tool.id}`);
    const next = tool.levels.find((level) => level.level === progress.level + 1);
    if (!next) throw new Error(`Tool already maxed: ${tool.id}`);
    if (save.coins < next.upgradeCost) {
      throw new Error(`Insufficient coins: need ${next.upgradeCost}`);
    }

    return {
      ...save,
      coins: save.coins - next.upgradeCost,
      revision: save.revision + 1,
      updatedAt: Date.now(),
      tools: save.tools.map((entry) =>
        entry.toolId === tool.id
          ? { ...entry, level: next.level }
          : { ...entry },
      ),
    };
  }

  static unlockIsland(
    save: PlayerSave,
    islandId: string,
    cost: number,
  ): PlayerSave {
    if (save.unlockedIslands.includes(islandId)) return save;
    if (save.coins < cost) throw new Error(`Insufficient coins: need ${cost}`);
    return {
      ...save,
      coins: save.coins - cost,
      revision: save.revision + 1,
      updatedAt: Date.now(),
      unlockedIslands: [...save.unlockedIslands, islandId],
    };
  }
}
