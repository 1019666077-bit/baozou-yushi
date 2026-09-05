import { _decorator, Component, Game, JsonAsset, director, game } from "cc";
import { Analytics } from "./analytics/Analytics";
import { BattleController } from "./battle/BattleController";
import { gameEvents } from "./core/EventBus";
import { ConfigService } from "./data/ConfigService";
import type { RemoteConfig, RunSummary } from "./data/types";
import { IslandRunController } from "./content/IslandRunController";
import { LeaderboardService } from "./platform/LeaderboardService";
import { WechatAdapter } from "./platform/WechatAdapter";
import { playerSave } from "./save/SaveService";

const { ccclass, property } = _decorator;

/**
 * @deprecated 编辑器实验栈，未挂到正式场景，不要当作已交付主路径。
 * 当前唯一官方运行时是 Boot.scene → RuntimeHome → RuntimePrototype（见 RuntimeAutoStart）。
 */
@ccclass("GameBootstrap")
export class GameBootstrap extends Component {
  @property({ type: JsonAsset })
  public fishConfig: JsonAsset | null = null;

  @property({ type: JsonAsset })
  public toolConfig: JsonAsset | null = null;

  @property({ type: JsonAsset })
  public islandConfig: JsonAsset | null = null;

  @property({ type: JsonAsset })
  public remoteConfig: JsonAsset | null = null;

  @property({ type: BattleController })
  public battle: BattleController | null = null;

  @property({ type: IslandRunController })
  public islandRun: IslandRunController | null = null;

  @property
  public wechatCloudEnv = "";

  private disposeRunFinished?: () => void;
  private disposeIslandFinished?: () => void;

  protected async start(): Promise<void> {
    if (
      !this.fishConfig ||
      !this.toolConfig ||
      !this.islandConfig ||
      !this.remoteConfig
    ) {
      throw new Error("GameBootstrap config assets are not assigned");
    }
    ConfigService.initialize(
      this.fishConfig,
      this.toolConfig,
      this.islandConfig,
      this.remoteConfig,
    );
    WechatAdapter.initializeCloud(this.wechatCloudEnv || undefined);
    try {
      const response = await WechatAdapter.callCloud<{ config: RemoteConfig }>(
        "getRemoteConfig",
      );
      ConfigService.applyRemoteConfig(response.config);
    } catch {
      // Bundled defaults keep the game playable offline.
    }
    const save = await playerSave.load();
    if (WechatAdapter.isLowEndDevice() && !save.settings.lowPower) {
      await playerSave.save({
        ...save,
        settings: { ...save.settings, lowPower: true },
      });
    }
    const initialIsland = save.tutorialComplete
      ? "island_foam_bay"
      : "island_tutorial";
    this.battle?.startRun(
      initialIsland,
      "tool_rod",
      1,
    );
    this.islandRun?.startIsland(initialIsland);
    this.disposeRunFinished = gameEvents.on<RunSummary>(
      "run_finished",
      (summary) => void this.onRunFinished(summary),
    );
    this.disposeIslandFinished = gameEvents.on(
      "island_finished",
      () => this.battle?.finishRun(),
    );
    Analytics.track(save.tutorialComplete ? "cast" : "tutorial_start");
    game.on(Game.EVENT_HIDE, this.onHide, this);
  }

  protected onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.onHide, this);
    this.disposeRunFinished?.();
    this.disposeIslandFinished?.();
  }

  private onHide(): void {
    this.battle?.finishRun();
    Analytics.track("session_end", {
      scene: director.getScene()?.name ?? "unknown",
    });
    void Analytics.flush();
  }

  private async onRunFinished(summary: RunSummary): Promise<void> {
    const save = playerSave.get();
    const discovered = new Set(save.discoveredFish);
    for (const fish of summary.fish) discovered.add(fish.fishId);
    await playerSave.save({
      ...save,
      coins: save.coins + summary.totalCoins,
      bestStyleScore: Math.max(
        save.bestStyleScore,
        Math.round(summary.bestMultiplier * 100),
      ),
      discoveredFish: Array.from(discovered),
    });
    Analytics.track("run_finish", {
      islandId: summary.islandId,
      durationMs: summary.finishedAt - summary.startedAt,
      captures: summary.fish.length,
      coins: summary.totalCoins,
      bestMultiplier: summary.bestMultiplier,
    });
    try {
      await LeaderboardService.submit(summary);
    } catch {
      // Ranking failure never blocks local rewards.
    }
  }
}
