import type { PlayerSave } from "../data/types";
import type { CloudKind } from "../domain/CloudCopy";
import {
  createDefaultSave,
  mergeSaves,
} from "../domain/SaveMerge";
import type { PlatformAdapter } from "../platform/PlatformAdapter";
import { platformAdapter } from "../platform/PlatformRuntime";

const SAVE_KEY = "baozou_yushi_save_v1";

export class SaveService {
  private current: PlayerSave = createDefaultSave();
  private sync: Exclude<CloudKind, "syncing"> = "local";
  private loading?: Promise<PlayerSave>;
  private hasLocalSave = false;

  constructor(
    private readonly platform: () => PlatformAdapter = platformAdapter,
  ) {}

  loadLocal(): PlayerSave {
    const local = this.platform().localSave.get<PlayerSave>(SAVE_KEY);
    this.hasLocalSave = local !== null;
    this.current = mergeSaves(local, null);
    // Do not persist a generated default before an asynchronous platform data
    // store has had a chance to load its authoritative copy.
    if (local) this.persistLocal();
    return this.get();
  }

  async load(): Promise<PlayerSave> {
    if (this.loading) return this.loading;
    this.loading = this.performLoad();
    try {
      return await this.loading;
    } finally {
      this.loading = undefined;
    }
  }

  private async performLoad(): Promise<PlayerSave> {
    this.loadLocal();
    const cloud = this.platform().cloudSave;
    if (!cloud) {
      this.sync = "local";
      this.persistLocal();
      return this.get();
    }
    try {
      this.current = mergeSaves(
        this.hasLocalSave ? this.get() : null,
        await cloud.load<PlayerSave>(),
      );
      this.persistLocal();
      this.sync = "cloud";
    } catch {
      this.sync = "offline";
    }
    return this.get();
  }

  async save(next: PlayerSave): Promise<void> {
    if (this.loading) await this.loading;
    this.current = {
      ...next,
      revision: Math.max(this.current.revision + 1, next.revision),
      updatedAt: Date.now(),
    };
    this.persistLocal();
    const cloud = this.platform().cloudSave;
    if (!cloud) {
      this.sync = "local";
      return;
    }
    try {
      await cloud.save(this.current);
      this.sync = "cloud";
    } catch {
      this.sync = "offline";
    }
  }

  cloudKind(): Exclude<CloudKind, "syncing"> {
    return this.sync;
  }

  get(): PlayerSave {
    return JSON.parse(JSON.stringify(this.current)) as PlayerSave;
  }

  async reset(): Promise<PlayerSave> {
    this.platform().localSave.remove(SAVE_KEY);
    this.current = createDefaultSave();
    this.persistLocal();
    const cloud = this.platform().cloudSave;
    if (!cloud) {
      this.sync = "local";
      return this.get();
    }
    try {
      await cloud.delete();
      this.sync = "cloud";
    } catch (error) {
      this.sync = "offline";
      throw new Error(
        `本机档已清空，但云端删除失败：${
          error instanceof Error ? error.message : "未知错误"
        }`,
      );
    }
    return this.get();
  }

  private persistLocal(): void {
    this.platform().localSave.set(SAVE_KEY, this.current);
  }
}

export const playerSave = new SaveService();
