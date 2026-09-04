import type { PlayerSave } from "../data/types";
import type { CloudKind } from "../domain/CloudCopy";
import {
  createDefaultSave,
  mergeSaves,
} from "../domain/SaveMerge";
import { WechatAdapter } from "../platform/WechatAdapter";

const SAVE_KEY = "baozou_yushi_save_v1";

export class SaveService {
  private current: PlayerSave = createDefaultSave();
  private sync: Exclude<CloudKind, "syncing"> = "local";

  loadLocal(): PlayerSave {
    const local = WechatAdapter.getLocal<PlayerSave>(SAVE_KEY);
    this.current = mergeSaves(local, null);
    this.persistLocal();
    return this.get();
  }

  async load(): Promise<PlayerSave> {
    this.loadLocal();
    try {
      const response = await WechatAdapter.callCloud<{ save: PlayerSave | null }>(
        "loadSave",
      );
      this.current = mergeSaves(this.get(), response.save);
      this.persistLocal();
      this.sync = "cloud";
    } catch {
      this.sync = WechatAdapter.available ? "offline" : "local";
    }
    return this.get();
  }

  async save(next: PlayerSave): Promise<void> {
    this.current = {
      ...next,
      revision: Math.max(this.current.revision + 1, next.revision),
      updatedAt: Date.now(),
    };
    this.persistLocal();
    try {
      await WechatAdapter.callCloud("saveGame", { save: this.current });
      this.sync = "cloud";
    } catch {
      this.sync = WechatAdapter.available ? "offline" : "local";
    }
  }

  cloudKind(): Exclude<CloudKind, "syncing"> {
    return this.sync;
  }

  get(): PlayerSave {
    return JSON.parse(JSON.stringify(this.current)) as PlayerSave;
  }

  async reset(): Promise<PlayerSave> {
    WechatAdapter.removeLocal(SAVE_KEY);
    this.current = createDefaultSave();
    this.persistLocal();
    try {
      await WechatAdapter.callCloud("deleteSave");
      this.sync = "cloud";
    } catch {
      this.sync = WechatAdapter.available ? "offline" : "local";
    }
    return this.get();
  }

  private persistLocal(): void {
    WechatAdapter.setLocal(SAVE_KEY, this.current);
  }
}

export const playerSave = new SaveService();
