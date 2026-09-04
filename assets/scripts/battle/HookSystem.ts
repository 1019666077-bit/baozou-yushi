import { _decorator, Component, Node, Vec3 } from "cc";
import { FishController } from "./FishController";

const { ccclass, property } = _decorator;

@ccclass("HookSystem")
export class HookSystem extends Component {
  @property({ type: Node })
  public fishRoot: Node | null = null;

  @property
  public maxLockDistance = 520;

  private target: FishController | null = null;

  cast(from: Vec3): FishController | null {
    const candidates = this.fishRoot?.getComponentsInChildren(FishController) ?? [];
    this.target =
      candidates
        .filter((fish) => fish.node.active)
        .sort(
          (a, b) =>
            Vec3.distance(a.node.worldPosition, from) -
            Vec3.distance(b.node.worldPosition, from),
        )
        .find(
          (fish) =>
            Vec3.distance(fish.node.worldPosition, from) <=
            this.maxLockDistance,
        ) ?? null;
    return this.target;
  }

  release(): void {
    this.target = null;
  }

  get currentTarget(): FishController | null {
    return this.target;
  }
}
