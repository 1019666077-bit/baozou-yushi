import { _decorator, Component, Node } from "cc";
import { Analytics } from "../analytics/Analytics";
import { ConfigService } from "../data/ConfigService";
import { BattleStateMachine } from "../domain/BattleStateMachine";
import { RunSession } from "../domain/RunSession";
import { gameEvents } from "../core/EventBus";
import { HookSystem } from "./HookSystem";
import { WeaponSystem } from "./WeaponSystem";

const { ccclass, property } = _decorator;

@ccclass("BattleController")
export class BattleController extends Component {
  @property({ type: HookSystem })
  public hook: HookSystem | null = null;

  @property({ type: WeaponSystem })
  public weapon: WeaponSystem | null = null;

  @property({ type: Node })
  public player: Node | null = null;

  private readonly state = new BattleStateMachine();
  private session?: RunSession;
  private runFinished = false;

  startRun(islandId: string, toolId: string, level: number): void {
    const tool = ConfigService.toolById(toolId);
    this.weapon?.equip(tool, level);
    this.state.reset();
    this.runFinished = false;
    this.session = new RunSession(
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      islandId,
      toolId,
      level,
    );
    gameEvents.emit("run_started", { islandId, toolId, level });
  }

  cast(): boolean {
    if (!this.player || !this.hook || this.state.state !== "idle") return false;
    this.state.transition("casting");
    const target = this.hook.cast(this.player.worldPosition);
    if (!target) {
      this.state.transition("idle");
      return false;
    }
    this.state.transition("hooked");
    this.state.transition("fighting");
    gameEvents.emit("fish_hooked", { fishId: target.id });
    return true;
  }

  hit(
    accuracy: number,
    weakPoint: boolean,
    airborne: boolean,
    charge = 1,
  ): void {
    const target = this.hook?.currentTarget;
    const level = this.weapon?.fire(Date.now());
    if (!target || !level || this.state.state !== "fighting") return;
    const result = target.applyHit(level, accuracy, weakPoint, charge);
    if (weakPoint) {
      const style = this.session?.addStyle({
        action: "weakPoint",
        atMs: Date.now(),
        quality: accuracy,
      });
      if (style) gameEvents.emit("style_changed", style);
      Analytics.track("style_action", { action: "weakPoint", accuracy });
    }
    if (airborne) {
      const style = this.session?.addStyle({
        action: "airborne",
        atMs: Date.now(),
      });
      if (style) gameEvents.emit("style_changed", style);
      Analytics.track("style_action", { action: "airborne" });
    }
    if (result.readyToReel) this.state.transition("reeling");
    gameEvents.emit("fish_hit", {
      fishId: target.id,
      maxToughness: ConfigService.fishById(target.id).toughness,
      ...result,
    });
  }

  reel(timingError: number): boolean {
    const target = this.hook?.currentTarget;
    if (!target || this.state.state !== "reeling") return false;
    const lineStrength = this.weapon?.equippedLevel.lineStrength ?? 25;
    const result = target.tryReel(timingError, lineStrength);
    if (!result.captured) {
      this.state.transition("fighting");
      return false;
    }
    if (result.perfect) {
      const style = this.session?.addStyle({
        action: "perfectReel",
        atMs: Date.now(),
        quality: 1,
      });
      if (style) gameEvents.emit("style_changed", style);
      Analytics.track("style_action", { action: "perfectReel" });
    }
    this.state.transition("captured");
    const config = ConfigService.fishById(target.id);
    const captured = this.session?.capture(
      config,
      1,
      Date.now(),
      ConfigService.remoteConfig().economyScale,
    );
    target.node.active = false;
    this.hook?.release();
    gameEvents.emit("fish_captured", captured);
    this.state.transition("casting");
    this.state.reset();
    return true;
  }

  finishRun(): void {
    if (!this.session || this.runFinished) return;
    this.runFinished = true;
    if (this.state.state !== "finished" && this.state.canTransition("finished")) {
      this.state.transition("finished");
    }
    gameEvents.emit("run_finished", this.session.finish());
  }
}
