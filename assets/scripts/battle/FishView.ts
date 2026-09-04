import { _decorator, Component, Graphics, UITransform } from "cc";
import type { FishConfig } from "../data/types";
import { fishLook } from "../domain/GrayLook";
import { drawFish } from "../ui/GrayArt";
import { deckFlag } from "../world/deckFlag";

const { ccclass } = _decorator;

@ccclass("FishView")
export class FishView extends Component {
  private config?: FishConfig;
  private flashing = false;
  private hooked = false;
  private decoy = false;
  private armored = false;
  private hit = false;

  render(config: FishConfig): void {
    this.config = config;
    this.draw();
  }

  setPresentation(
    flashing: boolean,
    hooked: boolean,
    look: { decoy?: boolean; armored?: boolean; hit?: boolean } = {},
  ): void {
    const decoy = look.decoy === true;
    const armored = look.armored === true;
    const hit = look.hit === true;
    if (
      this.flashing === flashing &&
      this.hooked === hooked &&
      this.decoy === decoy &&
      this.armored === armored &&
      this.hit === hit
    ) {
      return;
    }
    this.flashing = flashing;
    this.hooked = hooked;
    this.decoy = decoy;
    this.armored = armored;
    this.hit = hit;
    this.draw();
  }

  weakPointOffset(): { x: number; y: number; radius: number } {
    const scale = this.scale();
    const look = fishLook(this.config?.id ?? "");
    return {
      x: look.weakX * scale,
      y: look.weakY * scale,
      radius: this.flashing ? 18 * scale : 10 * scale,
    };
  }

  bodyRadius(): number {
    return fishLook(this.config?.id ?? "").bodyRadius * this.scale();
  }

  private scale(): number {
    const tier = this.config?.tier;
    return tier === "boss" ? 2.5 : tier === "elite" ? 1.45 : 1;
  }

  private draw(): void {
    if (!this.config) return;
    if (deckFlag.live) {
      const graphics = this.getComponent(Graphics);
      if (graphics) {
        graphics.clear();
        graphics.enabled = false;
      }
      return;
    }
    let graphics = this.getComponent(Graphics);
    if (!graphics) graphics = this.addComponent(Graphics);
    let transform = this.getComponent(UITransform);
    if (!transform) transform = this.addComponent(UITransform);
    if (!graphics || !transform) return;
    graphics.enabled = true;
    const scale = this.scale();
    transform.setContentSize(130 * scale, 90 * scale);
    drawFish(graphics, this.config.id, scale, {
      decoy: this.decoy,
      armored: this.armored,
      hit: this.hit,
      hooked: this.hooked,
      flashing: this.flashing,
    });
  }
}
