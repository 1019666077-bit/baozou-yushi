import { Analytics } from "../analytics/Analytics";
import { ConfigService } from "../data/ConfigService";
import { harborFailCopy } from "../domain/HarborCopy";
import { ProgressionSystem } from "../domain/ProgressionSystem";
import {
  harborFeatureLockedHint,
  harborUnlocksForSave,
} from "../domain/TutorialFlow";
import { playerSave } from "../save/SaveService";

function messageOf(error: unknown): string {
  return harborFailCopy(error);
}

export class HarborActions {
  static async upgrade(toolId: string): Promise<string | null> {
    try {
      const save = playerSave.get();
      if (!harborUnlocksForSave(save).upgrade) {
        return harborFeatureLockedHint("upgrade", save);
      }
      const next = ProgressionSystem.purchaseToolUpgrade(
        playerSave.get(),
        ConfigService.toolById(toolId),
      );
      await playerSave.save(next);
      Analytics.track("upgrade_buy", { toolId });
      return null;
    } catch (error) {
      return messageOf(error);
    }
  }

  static async buyTool(toolId: string): Promise<string | null> {
    try {
      const next = ProgressionSystem.purchaseTool(
        playerSave.get(),
        ConfigService.toolById(toolId),
      );
      await playerSave.save(next);
      Analytics.track("upgrade_buy", { toolId, purchase: true });
      return null;
    } catch (error) {
      return messageOf(error);
    }
  }

  static async unlockIsland(islandId: string): Promise<string | null> {
    try {
      const island = ConfigService.islandById(islandId);
      const next = ProgressionSystem.unlockIsland(
        playerSave.get(),
        islandId,
        island.unlockCost,
      );
      await playerSave.save(next);
      return null;
    } catch (error) {
      return messageOf(error);
    }
  }

  static async patchSettings(
    patch: Partial<{
      music: boolean;
      sfx: boolean;
      vibration: boolean;
      lowPower: boolean;
    }>,
  ): Promise<string | null> {
    try {
      const save = playerSave.get();
      await playerSave.save({
        ...save,
        settings: { ...save.settings, ...patch },
      });
      return null;
    } catch (error) {
      return messageOf(error);
    }
  }

  static async clearSave(): Promise<string | null> {
    try {
      await playerSave.reset();
      return null;
    } catch (error) {
      return messageOf(error);
    }
  }
}
