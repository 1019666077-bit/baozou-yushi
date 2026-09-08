import { _decorator, Component, Label, Node } from "cc";
import { gameEvents } from "../core/EventBus";
import {
  advanceTutorial,
  tutorialGuideTarget,
  tutorialPrompt,
  type TutorialStep,
} from "../domain/TutorialFlow";

const { ccclass, property } = _decorator;

@ccclass("TutorialController")
export class TutorialController extends Component {
  @property({ type: Label })
  public prompt: Label | null = null;

  @property({ type: Node })
  public castHighlight: Node | null = null;

  @property({ type: Node })
  public weakPointHighlight: Node | null = null;

  @property({ type: Node })
  public reelHighlight: Node | null = null;

  private step: TutorialStep = "cast";
  private disposers: Array<() => void> = [];

  protected start(): void {
    this.disposers = [
      gameEvents.on("fish_hooked", () => this.move("hooked")),
      gameEvents.on<{ weakPoint: boolean }>("fish_hit", ({ weakPoint }) => {
        if (weakPoint) this.move("weakHit");
      }),
      gameEvents.on("fish_captured", () => this.finish()),
    ];
    this.render();
  }

  protected onDestroy(): void {
    for (const dispose of this.disposers) dispose();
  }

  private move(event: "hooked" | "weakHit"): void {
    this.step = advanceTutorial(this.step, event);
    this.render();
  }

  private finish(): void {
    this.step = advanceTutorial(this.step, "captured");
    this.render();
  }

  private render(): void {
    if (this.prompt) this.prompt.string = tutorialPrompt(this.step);
    const focus = tutorialGuideTarget(this.step);
    if (this.castHighlight) this.castHighlight.active = focus === "cast";
    if (this.weakPointHighlight) {
      this.weakPointHighlight.active = focus === "weakPoint";
    }
    if (this.reelHighlight) this.reelHighlight.active = focus === "pickUp";
  }
}
