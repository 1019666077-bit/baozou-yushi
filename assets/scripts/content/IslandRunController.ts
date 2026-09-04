import { _decorator, Component } from "cc";
import { gameEvents } from "../core/EventBus";
import { ConfigService } from "../data/ConfigService";
import { BossController } from "../battle/BossController";
import { FishSpawner } from "../battle/FishSpawner";

const { ccclass, property } = _decorator;

@ccclass("IslandRunController")
export class IslandRunController extends Component {
  @property({ type: FishSpawner })
  public spawner: FishSpawner | null = null;

  @property({ type: BossController })
  public boss: BossController | null = null;

  private islandId = "";
  private waveIndex = -1;
  private waveElapsed = 0;
  private seed = 1;
  private disposeBossHit?: () => void;
  private disposeBossCaptured?: () => void;

  protected start(): void {
    this.disposeBossHit = gameEvents.on<{
      fishId: string;
      remainingToughness: number;
      maxToughness: number;
    }>("fish_hit", ({ fishId, remainingToughness, maxToughness }) => {
      if (!this.islandId) return;
      const island = ConfigService.islandById(this.islandId);
      if (island.bossId !== fishId) return;
      this.boss?.setToughnessRatio(
        remainingToughness / Math.max(1, maxToughness),
      );
    });
    this.disposeBossCaptured = gameEvents.on<{ fishId: string }>(
      "fish_captured",
      ({ fishId }) => {
        if (!this.islandId) return;
        const island = ConfigService.islandById(this.islandId);
        if (island.bossId === fishId) {
          gameEvents.emit("island_finished", { islandId: this.islandId });
        }
      },
    );
  }

  protected onDestroy(): void {
    this.disposeBossHit?.();
    this.disposeBossCaptured?.();
  }

  startIsland(islandId: string, seed = Date.now()): void {
    const island = ConfigService.islandById(islandId);
    this.islandId = islandId;
    this.seed = seed;
    this.waveIndex = -1;
    this.waveElapsed = 0;
    gameEvents.emit("island_started", { islandId });
    this.nextWave();
  }

  protected update(dt: number): void {
    if (!this.islandId || this.waveIndex < 0) return;
    const island = ConfigService.islandById(this.islandId);
    const wave = island.waves[this.waveIndex];
    if (!wave) return;
    this.waveElapsed += dt;
    if (this.waveElapsed >= wave.durationSeconds) this.nextWave();
  }

  private nextWave(): void {
    const island = ConfigService.islandById(this.islandId);
    this.waveIndex += 1;
    this.waveElapsed = 0;
    const wave = island.waves[this.waveIndex];
    if (wave) {
      this.spawner?.startWave(wave, this.seed + this.waveIndex * 997);
      gameEvents.emit("wave_started", {
        islandId: this.islandId,
        waveIndex: this.waveIndex,
      });
      return;
    }
    this.spawner?.stopWave();
    if (island.bossId && island.bossPhases) {
      this.spawner?.spawn(island.bossId);
      this.boss?.initialize(island.bossPhases);
      gameEvents.emit("boss_started", { fishId: island.bossId });
    } else {
      gameEvents.emit("island_finished", { islandId: this.islandId });
    }
  }
}
