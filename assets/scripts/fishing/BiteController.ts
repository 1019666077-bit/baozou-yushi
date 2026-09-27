/**
 * Ported from tidewater `src/game/Game.js` 的 updateBite / strike。
 * https://github.com/dgreenheck/tidewater (MIT, Copyright (c) 2026 DRG Software Solutions LLC)
 *
 * 等咬 → 试饵（浮标点头）→ 吞饵窗口。窗口长度 2.4 - fight * 0.5 秒。
 * 窗口结束鱼跑掉。试饵时提竿只提示（hint），和源码一样，不把鱼吓跑。
 * 等待阶段提竿没有鱼，不惩罚。
 */
import { biteDelay, pickSpecies, rollWeight, type HabitatWeights } from "./Bites";
import { FISH } from "./FishTable";

export type BitePhase = "wait" | "nibble" | "take";
export type EarlyStrike = "hint" | "spook";
export type BiteEvent = BitePhase | "ran" | "idle" | "empty";

export function hookWindowSeconds(fight: number): number {
  return 2.4 - fight * 0.5;
}

interface Bite {
  phase: BitePhase;
  t: number;
  nibbles: number;
  pulse: number;
  species: string;
  kg: number;
}

export class BiteController {
  dip = 0;
  private bite: Bite | null = null;
  private habitat: HabitatWeights | null = null;
  private hour = 12;

  constructor(
    private readonly rng: () => number = Math.random,
    private readonly earlyStrike: EarlyStrike = "hint",
  ) {}

  get phase(): BitePhase | null {
    return this.bite?.phase ?? null;
  }

  get species(): string {
    return this.bite?.species ?? "";
  }

  get kg(): number {
    return this.bite?.kg ?? 0;
  }

  get timeLeft(): number {
    return this.bite?.t ?? 0;
  }

  /** 返回等待秒数。贫瘠水域为 Infinity，且不进入等待。 */
  start(habitat: HabitatWeights, hour: number): number {
    const delay = biteDelay(habitat, hour, this.rng);
    this.habitat = habitat;
    this.hour = hour;
    this.dip = 0;
    if (!Number.isFinite(delay)) {
      this.bite = null;
      return delay;
    }
    this.bite = {
      phase: "wait",
      t: delay,
      nibbles: 0,
      pulse: 0,
      species: "",
      kg: 0,
    };
    return delay;
  }

  reset(): void {
    this.bite = null;
    this.dip = 0;
  }

  update(dt: number): BiteEvent {
    const bite = this.bite;
    if (!bite) return "idle";
    bite.t -= dt;
    if (bite.phase === "nibble") {
      this.dip = Math.max(0, Math.sin(Math.min(1, bite.pulse) * Math.PI) * 0.45);
      bite.pulse += dt * 3.2;
    } else if (bite.phase === "take") {
      this.dip += (1.4 - this.dip) * (1 - Math.exp(-dt * 14));
    } else {
      this.dip = Math.max(0, this.dip - dt * 3);
    }
    if (bite.t > 0) return bite.phase;
    if (bite.phase === "wait") {
      const species = this.habitat ? pickSpecies(this.habitat, this.hour, this.rng) : null;
      if (!species) {
        bite.t = 8;
        return "empty";
      }
      bite.species = species;
      bite.kg = rollWeight(species, this.rng);
      bite.phase = "nibble";
      bite.nibbles = 1 + Math.floor(this.rng() * 3);
      bite.t = 0.7 + this.rng() * 0.8;
      bite.pulse = 0;
      this.dip = 0;
      return "nibble";
    }
    if (bite.phase === "nibble") {
      bite.nibbles -= 1;
      bite.pulse = 0;
      if (bite.nibbles > 0) {
        bite.t = 0.6 + this.rng() * 1.0;
        return "nibble";
      }
      bite.phase = "take";
      bite.t = hookWindowSeconds(FISH[bite.species].fight);
      return "take";
    }
    this.bite = null;
    this.dip = 0;
    return "ran";
  }

  /** ignore：还在等。hint：试饵，源逻辑不惩罚。spook：试饵被吓跑。hooked：窗口内提竿。 */
  strike(): "ignore" | "hint" | "spook" | "hooked" {
    const bite = this.bite;
    if (!bite || bite.phase === "wait") return "ignore";
    if (bite.phase === "nibble") {
      if (this.earlyStrike === "hint") return "hint";
      this.bite = null;
      this.dip = 0;
      return "spook";
    }
    return "hooked";
  }

  consumeHook(): { species: string; kg: number } | null {
    const bite = this.bite;
    if (!bite || bite.phase !== "take") return null;
    const hooked = { species: bite.species, kg: bite.kg };
    this.bite = null;
    return hooked;
  }
}
