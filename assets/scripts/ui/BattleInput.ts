import { _decorator, Component, EventTouch, Node, Vec2 } from "cc";
import { Analytics } from "../analytics/Analytics";
import { BattleController } from "../battle/BattleController";

const { ccclass, property } = _decorator;

@ccclass("BattleInput")
export class BattleInput extends Component {
  @property({ type: BattleController })
  public battle: BattleController | null = null;

  @property({ type: Node })
  public aimArea: Node | null = null;

  private aimStart = new Vec2();
  private chargeStartedAt = 0;

  protected start(): void {
    this.aimArea?.on(Node.EventType.TOUCH_START, this.onAimStart, this);
    this.aimArea?.on(Node.EventType.TOUCH_END, this.onAimEnd, this);
    this.aimArea?.on(Node.EventType.TOUCH_CANCEL, this.onAimEnd, this);
  }

  protected onDestroy(): void {
    this.aimArea?.off(Node.EventType.TOUCH_START, this.onAimStart, this);
    this.aimArea?.off(Node.EventType.TOUCH_END, this.onAimEnd, this);
    this.aimArea?.off(Node.EventType.TOUCH_CANCEL, this.onAimEnd, this);
  }

  public onCastPressed(): void {
    if (this.battle?.cast()) Analytics.track("cast");
  }

  public onReelPressed(normalizedTimingError = 0): void {
    this.battle?.reel(normalizedTimingError);
  }

  private onAimStart(event: EventTouch): void {
    this.aimStart.set(event.getUILocation());
    this.chargeStartedAt = Date.now();
  }

  private onAimEnd(event: EventTouch): void {
    const end = event.getUILocation();
    const distance = Vec2.distance(this.aimStart, end);
    const accuracy = Math.max(0.25, 1 - distance / 500);
    const charge = Math.min(1.75, 0.5 + (Date.now() - this.chargeStartedAt) / 1_200);
    const weakPoint = accuracy >= 0.82;
    const airborne = end.y > this.aimStart.y + 80;
    this.battle?.hit(accuracy, weakPoint, airborne, charge);
  }
}
