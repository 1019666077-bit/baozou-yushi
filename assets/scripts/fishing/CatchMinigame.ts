/**
 * Ported from tidewater `src/game/CatchMinigame.js`
 * https://github.com/dgreenheck/tidewater (MIT, Copyright (c) 2026 DRG Software Solutions LLC)
 *
 * 按住收线：线变短、拉力上升。松开：拉力回落，鱼会带走线。
 * 绿区耗体力最快。拉力超过 1 约半秒断线；太松太久脱钩。
 * 鱼会周期性冲刺。距离收到 1.2m 以内上岸。
 *
 * 绿区默认 [0.3, 0.85]。鱼竿加宽绿区在 `RodBand.ts`，由 FishingTrip 在开打后写入 `band`。
 * 体力耗尽的额外上岸判定也在 FishingTrip，不改这里的距离条件。
 */
import { FISH } from "./FishTable";

export type FightState = "fighting" | "caught" | "snapped" | "escaped";

export class CatchMinigame {
  species: string;
  kg: number;
  rng: () => number;
  reelSpeed: number;
  power: number;
  staminaMax: number;
  stamina: number;
  distance: number;
  maxDistance: number;
  tension: number;
  surge: number;
  slack: number;
  time: number;
  band: [number, number];
  overload: number;
  state: FightState;
  private nextSurge: number;
  private surgeT: number;

  constructor(opts: {
    species: string;
    kg: number;
    lineKg?: number;
    reelSpeed?: number;
    distance?: number;
    rng?: () => number;
  }) {
    const fish = FISH[opts.species];
    const lineKg = opts.lineKg ?? 7;
    const distance = opts.distance ?? 15;
    this.species = opts.species;
    this.kg = opts.kg;
    this.rng = opts.rng ?? Math.random;
    this.reelSpeed = opts.reelSpeed ?? 1.1;
    this.power = Math.min(
      2.2,
      (0.25 + 0.75 * fish.fight) * Math.pow(opts.kg / Math.max(lineKg * 0.5, 0.2), 0.55),
    );
    this.staminaMax = fish.stamina * Math.pow(Math.max(opts.kg / fish.kg[1], 0.15), 0.35);
    this.stamina = 1;
    this.distance = distance;
    this.maxDistance = Math.max(60, distance + 40);
    this.tension = 0.3;
    this.surge = 0;
    this.slack = 0;
    this.time = 0;
    this.band = [0.3, 0.85];
    this.overload = 0;
    this.nextSurge = 1.2 + this.rng() * 2;
    this.surgeT = 0;
    this.state = "fighting";
  }

  update(dt: number, reeling: boolean): FightState {
    if (this.state !== "fighting") return this.state;
    this.time += dt;
    const tired = 1 - this.stamina;

    this.nextSurge -= dt;
    if (this.nextSurge <= 0 && this.surgeT <= 0) {
      this.surgeT = 0.8 + this.rng() * 1.2 * (1 - tired * 0.6);
      this.nextSurge = (2 + this.rng() * 3) * (1 + tired);
    }

    this.surgeT -= dt;
    const surgeTarget = this.surgeT > 0 ? 1 : 0;
    this.surge += (surgeTarget - this.surge) * (1 - Math.exp(-dt * 6));

    const pull = this.power * (0.35 + 0.65 * this.surge) * (1 - 0.65 * tired);
    const target = reeling ? 0.25 + pull * 0.95 + 0.25 : pull * 0.72;
    const rate = reeling ? 2.2 : 3.0;
    this.tension += (target - this.tension) * (1 - Math.exp(-dt * rate));

    if (reeling) this.distance -= this.reelSpeed * dt * (1.15 - 0.6 * this.surge * (1 - tired));
    else this.distance += pull * 1.4 * dt;
    this.distance = Math.max(0, this.distance);

    const inBand = this.tension >= this.band[0] && this.tension <= this.band[1];
    this.stamina = Math.max(0, this.stamina - (dt / this.staminaMax) * (inBand ? 1 : 0.3));

    this.overload = this.tension > 1 ? this.overload + dt : Math.max(0, this.overload - dt * 2);
    if (this.overload > 0.45) this.state = "snapped";
    else {
      this.slack = this.tension < 0.12 ? this.slack + dt : Math.max(0, this.slack - dt * 2);
      if (this.slack > 4 || this.distance > this.maxDistance) this.state = "escaped";
      else if (this.distance < 1.2) this.state = "caught";
    }
    return this.state;
  }
}
