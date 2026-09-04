import {
  _decorator,
  Component,
  Node,
  Prefab,
  Vec3,
  instantiate,
} from "cc";
import { ConfigService } from "../data/ConfigService";
import type { WaveConfig } from "../data/types";
import { SeededRandom } from "../domain/SeededRandom";
import { FishController } from "./FishController";

const { ccclass, property } = _decorator;

@ccclass("FishSpawner")
export class FishSpawner extends Component {
  @property({ type: Prefab })
  public fishPrefab: Prefab | null = null;

  @property({ type: Node })
  public fishRoot: Node | null = null;

  @property
  public halfWidth = 500;

  @property
  public halfHeight = 220;

  private random = new SeededRandom(Date.now());
  private wave?: WaveConfig;
  private elapsed = 0;
  private spawnElapsed = 0;

  startWave(wave: WaveConfig, seed: number): void {
    this.wave = wave;
    this.random = new SeededRandom(seed);
    this.elapsed = 0;
    this.spawnElapsed = wave.spawnIntervalSeconds;
  }

  stopWave(): void {
    this.wave = undefined;
  }

  protected update(dt: number): void {
    if (!this.wave || !this.fishPrefab || !this.fishRoot) return;
    this.elapsed += dt;
    this.spawnElapsed += dt;
    if (this.elapsed >= this.wave.durationSeconds) {
      this.stopWave();
      return;
    }
    const alive = this.fishRoot.children.filter((node) => node.active).length;
    if (
      alive >= this.wave.maxAlive ||
      this.spawnElapsed < this.wave.spawnIntervalSeconds
    ) {
      return;
    }
    this.spawnElapsed = 0;
    this.spawn(this.random.pick(this.wave.fishPool));
  }

  spawn(fishId: string): FishController {
    if (!this.fishPrefab || !this.fishRoot) {
      throw new Error("FishSpawner prefab/root not assigned");
    }
    const node = instantiate(this.fishPrefab);
    node.parent = this.fishRoot;
    node.setPosition(
      (this.random.next() * 2 - 1) * this.halfWidth,
      (this.random.next() * 2 - 1) * this.halfHeight,
      0,
    );
    const controller =
      node.getComponent(FishController) ?? node.addComponent(FishController);
    controller.initialize(ConfigService.fishById(fishId));
    return controller;
  }
}
