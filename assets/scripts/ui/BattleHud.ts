import { _decorator, Component, Label, ProgressBar } from "cc";
import { gameEvents } from "../core/EventBus";
import type { CapturedFish, StyleSnapshot } from "../data/types";

const { ccclass, property } = _decorator;

@ccclass("BattleHud")
export class BattleHud extends Component {
  @property({ type: Label })
  public multiplierLabel: Label | null = null;

  @property({ type: Label })
  public coinLabel: Label | null = null;

  @property({ type: Label })
  public comboLabel: Label | null = null;

  @property({ type: ProgressBar })
  public toughnessBar: ProgressBar | null = null;

  private coins = 0;
  private disposers: Array<() => void> = [];

  protected start(): void {
    this.disposers = [
      gameEvents.on<StyleSnapshot>("style_changed", (style) => {
        if (this.multiplierLabel) {
          this.multiplierLabel.string = `精彩 ×${style.multiplier.toFixed(2)}`;
        }
        if (this.comboLabel) {
          this.comboLabel.string = style.combo > 1 ? `${style.combo} 连技` : "";
        }
      }),
      gameEvents.on<CapturedFish>("fish_captured", (fish) => {
        this.coins += fish.price;
        if (this.coinLabel) this.coinLabel.string = `${this.coins}`;
      }),
      gameEvents.on<{ remainingToughness: number; maxToughness: number }>(
        "fish_hit",
        ({ remainingToughness, maxToughness }) => {
          if (this.toughnessBar) {
            this.toughnessBar.progress = Math.max(
              0,
              Math.min(1, remainingToughness / Math.max(1, maxToughness)),
            );
          }
        },
      ),
    ];
  }

  protected onDestroy(): void {
    for (const dispose of this.disposers) dispose();
  }
}
