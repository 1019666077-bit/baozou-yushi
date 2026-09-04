import { _decorator, Component, director, game, ResolutionPolicy, view } from "cc";
import { gameEvents } from "./EventBus";

const { ccclass, property } = _decorator;

@ccclass("PerformanceGuard")
export class PerformanceGuard extends Component {
  @property
  public lowFpsThreshold = 38;

  @property
  public sampleSeconds = 8;

  private elapsed = 0;
  private frames = 0;
  private lowPower = false;

  protected start(): void {
    director.getScheduler().setTimeScale(1);
  }

  protected update(dt: number): void {
    this.elapsed += dt;
    this.frames += 1;
    if (this.elapsed < this.sampleSeconds) return;
    const fps = this.frames / this.elapsed;
    if (!this.lowPower && fps < this.lowFpsThreshold) this.enableLowPower(fps);
    gameEvents.emit("performance_sample", { fps, lowPower: this.lowPower });
    this.elapsed = 0;
    this.frames = 0;
  }

  private enableLowPower(fps: number): void {
    this.lowPower = true;
    game.frameRate = 30;
    const size = view.getVisibleSize();
    view.setDesignResolutionSize(
      size.width * 0.85,
      size.height * 0.85,
      ResolutionPolicy.SHOW_ALL,
    );
    gameEvents.emit("low_power_enabled", { detectedFps: fps });
  }
}
