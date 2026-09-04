import { _decorator, Component } from "cc";
import type { BossPhase } from "../data/types";
import { gameEvents } from "../core/EventBus";

const { ccclass } = _decorator;

@ccclass("BossController")
export class BossController extends Component {
  private phases: BossPhase[] = [];
  private currentPhaseIndex = -1;
  private elapsedSincePattern = 0;
  private toughness = 1;

  initialize(phases: BossPhase[]): void {
    this.phases = [...phases].sort((a, b) => b.threshold - a.threshold);
    this.toughness = 1;
    this.currentPhaseIndex = -1;
    this.evaluatePhase();
  }

  setToughnessRatio(value: number): void {
    this.toughness = Math.min(1, Math.max(0, value));
    this.evaluatePhase();
  }

  protected update(dt: number): void {
    const phase = this.phases[this.currentPhaseIndex];
    if (!phase) return;
    this.elapsedSincePattern += dt;
    if (this.elapsedSincePattern >= phase.patternIntervalSeconds) {
      this.elapsedSincePattern = 0;
      gameEvents.emit("boss_pattern", {
        phase: this.currentPhaseIndex + 1,
        behavior: phase.behavior,
        speedMultiplier: phase.speedMultiplier,
      });
    }
  }

  private evaluatePhase(): void {
    let index = -1;
    for (let i = 0; i < this.phases.length; i += 1) {
      if (this.toughness <= this.phases[i].threshold) index = i;
    }
    if (index === -1 || index === this.currentPhaseIndex) return;
    this.currentPhaseIndex = index;
    this.elapsedSincePattern = 0;
    gameEvents.emit("boss_phase", {
      phase: index + 1,
      ...this.phases[index],
    });
  }
}
