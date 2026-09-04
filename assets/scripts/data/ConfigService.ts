import { JsonAsset } from "cc";
import {
  bundledFish,
  bundledIslands,
  bundledRemote,
  bundledTools,
} from "./bundledConfig";
import type {
  FishConfig,
  IslandConfig,
  RemoteConfig,
  ToolConfig,
} from "./types";

export class ConfigService {
  private static fish = new Map<string, FishConfig>();
  private static tools = new Map<string, ToolConfig>();
  private static islands = new Map<string, IslandConfig>();
  private static remote: RemoteConfig;

  static initialize(
    fishAsset: JsonAsset,
    toolAsset: JsonAsset,
    islandAsset: JsonAsset,
    remoteAsset: JsonAsset,
  ): void {
    this.initializeRaw(
      fishAsset.json as FishConfig[],
      toolAsset.json as ToolConfig[],
      islandAsset.json as IslandConfig[],
      remoteAsset.json as RemoteConfig,
    );
  }

  static initializeRaw(
    fish: FishConfig[],
    tools: ToolConfig[],
    islands: IslandConfig[],
    remote: RemoteConfig,
  ): void {
    this.assertUnique(fish.map((item) => item.id), "fish");
    this.assertUnique(tools.map((item) => item.id), "tool");
    this.assertUnique(islands.map((item) => item.id), "island");
    if (!fish.length || !tools.length || !islands.length) {
      throw new Error("Core config arrays cannot be empty");
    }
    this.fish = new Map(fish.map((item) => [item.id, item]));
    this.tools = new Map(tools.map((item) => [item.id, item]));
    this.islands = new Map(islands.map((item) => [item.id, item]));
    this.remote = remote;
  }

  static fishById(id: string): FishConfig {
    const value = this.fish.get(id);
    if (!value) throw new Error(`Unknown fish config: ${id}`);
    return value;
  }

  static toolById(id: string): ToolConfig {
    const value = this.tools.get(id);
    if (!value) throw new Error(`Unknown tool config: ${id}`);
    return value;
  }

  static islandById(id: string): IslandConfig {
    const value = this.islands.get(id);
    if (!value) throw new Error(`Unknown island config: ${id}`);
    return value;
  }

  static allFish(): FishConfig[] {
    return Array.from(this.fish.values());
  }

  static allTools(): ToolConfig[] {
    return Array.from(this.tools.values());
  }

  static allIslands(): IslandConfig[] {
    return Array.from(this.islands.values());
  }

  static initialized(): boolean {
    return this.fish.size > 0 && this.tools.size > 0 && this.islands.size > 0;
  }

  static ensureBundled(): void {
    if (!this.initialized()) {
      this.initializeRaw(bundledFish, bundledTools, bundledIslands, bundledRemote);
    }
  }

  static remoteConfig(): RemoteConfig {
    return this.remote;
  }

  static applyRemoteConfig(config: RemoteConfig): void {
    if (!config || config.version < this.remote.version) return;
    this.remote = {
      ...this.remote,
      ...config,
      stylePointScale: Math.min(2, Math.max(0.5, config.stylePointScale)),
      economyScale: Math.min(2, Math.max(0.5, config.economyScale)),
      disabledIslands: [...(config.disabledIslands ?? [])],
    };
  }

  private static assertUnique(ids: string[], type: string): void {
    if (new Set(ids).size !== ids.length) {
      throw new Error(`Duplicate ${type} id`);
    }
  }
}
