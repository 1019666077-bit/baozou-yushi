import { _decorator, Component, Vec3 } from "cc";
import type { FishConfig, ToolKind, ToolLevel } from "../data/types";
import { CaptureEngine, type HitResult } from "../domain/CaptureEngine";
import {
  poseForBehavior,
  shieldDamageScale,
  shieldGapOpen,
  shotFromFront,
} from "../domain/FishBehavior";
import { depthScale } from "../domain/DepthScale";
import { FishView } from "./FishView";
import {
  applyEscape,
  beginFlop,
  bouncedOnDeck,
  createFlopBody,
  escapePhaseAt,
  flopMassForTier,
  isAirborne,
  inWater,
  knock,
  knockKindOf,
  smashGradeAt,
  stepFlop,
  yankStep,
  type EscapePhase,
  type FlopBody,
  type KnockKind,
  type SmashGrade,
} from "../domain/FlopPhysics";

const { ccclass } = _decorator;

@ccclass("FishController")
export class FishController extends Component {
  private static battlePaused = false;

  static setPaused(value: boolean): void {
    FishController.battlePaused = value;
  }

  static setLowPower(value: boolean): void {
    FishController.lowPower = value;
  }

  private static lowPower = false;

  private config?: FishConfig;
  private capture?: CaptureEngine;
  private elapsed = 0;
  private origin = new Vec3();
  private hooked = false;
  private view?: FishView;
  private facing = 1;
  private airborneNow = false;
  private stunnedNow = false;
  private patternStun = 0;
  private hitPulse = 0;
  private mode: "swim" | "yank" | "flop" | "stunned" | "carried" = "swim";
  private body: FlopBody = createFlopBody(0, 0);
  private waterTime = 0;
  private pendingBounce = false;
  private pendingSplash = false;
  private bounceCount = 0;
  private pendingBounceIndex = 0;
  private mass = 1;
  private apexY = 0;
  private unattended = 0;
  private escapeLocked = false;
  private escapeNow: EscapePhase = "idle";
  private smashNow: SmashGrade = "none";
  decoy = false;

  initialize(config: FishConfig, decoy = false): void {
    this.config = config;
    this.capture = decoy ? undefined : new CaptureEngine(config);
    this.elapsed = 0;
    this.hooked = false;
    this.decoy = decoy;
    this.patternStun = 0;
    this.mode = "swim";
    this.waterTime = 0;
    this.pendingBounce = false;
    this.pendingSplash = false;
    this.bounceCount = 0;
    this.pendingBounceIndex = 0;
    this.mass = flopMassForTier(config.tier);
    this.apexY = this.node.position.y;
    this.unattended = 0;
    this.escapeLocked = false;
    this.escapeNow = "idle";
    this.smashNow = "none";
    this.node.angle = 0;
    this.origin.set(this.node.position);
    this.body = createFlopBody(this.node.position.x, this.node.position.y, this.mass);
    this.node.active = true;
    this.view =
      this.node.getComponent(FishView) ?? this.node.addComponent(FishView);
    this.view.render(config);
    this.node.setScale(this.facing * this.depth(), this.depth(), 1);
    this.present();
  }

  setHooked(value: boolean): void {
    this.hooked = value;
    if (value && this.mode === "swim") {
      this.mode = "yank";
      this.body = createFlopBody(this.node.position.x, this.node.position.y, this.mass);
    }
    if (!value && this.mode !== "carried" && this.mode !== "swim") {
      this.mode = "swim";
      this.node.angle = 0;
      this.smashNow = "none";
      this.origin.set(this.node.position);
    }
    this.present();
  }

  forceDeckFlop(): void {
    this.hooked = true;
    this.mode = "flop";
    this.body = beginFlop(-320, -70, this.mass);
    this.apexY = this.body.y;
    this.unattended = 0;
    this.applyBody();
    this.present();
  }

  startCarry(): void {
    this.mode = "carried";
    this.stunnedNow = true;
    this.airborneNow = false;
    this.smashNow = "none";
    this.escapeNow = "idle";
    this.node.angle = 0;
    this.present();
  }

  followCarry(x: number, y: number): void {
    this.node.setPosition(x, y);
    this.body = createFlopBody(x, y, this.mass);
  }

  dropCarry(x: number, y: number, intoWater: boolean): void {
    this.mode = this.remainingToughness <= 0 && !intoWater ? "stunned" : "flop";
    this.body = createFlopBody(x, y, this.mass);
    this.body.vy = intoWater ? 80 : 240;
    this.body.vx = intoWater ? 180 : -40;
    this.body.spin = intoWater ? 10 : 8;
    this.unattended = intoWater ? 2 : 0;
    this.apexY = y;
    this.applyBody();
    this.present();
  }

  get yanking(): boolean {
    return this.mode === "yank";
  }

  get onDeck(): boolean {
    return this.mode === "flop" || this.mode === "stunned";
  }

  takeLandFx(): { bounce: boolean; splash: boolean; bounceIndex: number } {
    const fx = {
      bounce: this.pendingBounce,
      splash: this.pendingSplash,
      bounceIndex: this.pendingBounceIndex,
    };
    this.pendingBounce = false;
    this.pendingSplash = false;
    return fx;
  }

  get pickable(): boolean {
    return (
      !this.decoy &&
      this.remainingToughness <= 0 &&
      (this.mode === "flop" || this.mode === "stunned")
    );
  }

  get carrying(): boolean {
    return this.mode === "carried";
  }

  get smashGrade(): SmashGrade {
    return this.smashNow;
  }

  get escapePhase(): EscapePhase {
    return this.escapeNow;
  }

  knockFrom(
    fromX: number,
    fromY: number,
    power: number,
    kind: KnockKind = "body",
  ): void {
    if (this.mode !== "flop" && this.mode !== "stunned" && this.mode !== "yank") {
      return;
    }
    if (this.mode === "yank") {
      this.mode = "flop";
      this.body = beginFlop(this.body.x, this.body.y, this.mass);
    }
    this.body = knock(this.body, fromX, fromY, power, kind);
    this.unattended = 0;
  }

  setAssist(options?: {
    freezeSeconds?: number;
    forceWeak?: boolean;
    radiusScale?: number;
    noEscape?: boolean;
  }): void {
    if (options?.noEscape !== undefined) this.escapeLocked = options.noEscape;
  }

  applyHit(
    tool: ToolLevel,
    accuracy: number,
    weakPoint: boolean,
    charge = 1,
    context?: { originX?: number; toolKind?: ToolKind; damageBonus?: number },
  ): HitResult {
    if (this.decoy || !this.capture) {
      return {
        damage: 0,
        remainingToughness: this.remainingToughness,
        weakPoint: false,
        readyToReel: false,
      };
    }
    const kind = context?.toolKind ?? "rod";
    const fromFront =
      context?.originX != null
        ? shotFromFront(context.originX, this.node.position.x, this.facing)
        : false;
    const gap = this.shieldOpen;
    const scale =
      (this.config?.behavior === "shield"
        ? shieldDamageScale({
            gapOpen: gap,
            weakPoint,
            fromFront,
            toolKind: kind,
          })
        : 1) * (context?.damageBonus ?? 1);
    this.hitPulse = FishController.lowPower ? 0 : weakPoint ? 0.22 : 0.16;
    const result = this.capture.hit(tool, accuracy, weakPoint, charge, scale);
    if (context?.originX != null) {
      this.knockFrom(
        context.originX,
        this.node.position.y,
        tool.power,
        knockKindOf(weakPoint, this.airborneNow),
      );
    }
    if (result.remainingToughness <= 0 && this.mode !== "carried") {
      this.mode = "stunned";
      this.stunnedNow = true;
    }
    this.applyFacingScale();
    this.present();
    return result;
  }

  tryReel(timingError: number, lineStrength: number): {
    captured: boolean;
    perfect: boolean;
  } {
    if (this.decoy || !this.capture) return { captured: false, perfect: false };
    return this.capture.reel(timingError, lineStrength);
  }

  get id(): string {
    return this.decoy ? `${this.config?.id ?? ""}_decoy` : (this.config?.id ?? "");
  }

  get fishConfig(): FishConfig | undefined {
    return this.decoy ? undefined : this.config;
  }

  get remainingToughness(): number {
    return this.capture?.remainingToughness ?? 0;
  }

  get toughnessRatio(): number {
    const total = this.config?.toughness ?? 1;
    return this.remainingToughness / Math.max(1, total);
  }

  get isHooked(): boolean {
    return this.hooked;
  }

  setPatternStun(seconds: number): void {
    this.patternStun = Math.max(this.patternStun, seconds);
  }

  get airborne(): boolean {
    return this.airborneNow;
  }

  get stunned(): boolean {
    return this.stunnedNow;
  }

  get shieldOpen(): boolean {
    return this.config?.behavior === "shield" && shieldGapOpen(this.elapsed);
  }

  get weakOpen(): boolean {
    if (this.patternStun > 0 && this.config?.behavior === "boss") return true;
    if (this.config?.behavior === "shield") return this.shieldOpen;
    return Math.sin(this.elapsed * 2.2) > 0.25;
  }

  weakPointWorld(out = new Vec3()): Vec3 {
    const offset = this.view?.weakPointOffset() ?? { x: 25, y: 8, radius: 10 };
    out.set(
      this.node.worldPosition.x + offset.x * this.facing,
      this.node.worldPosition.y + offset.y,
      this.node.worldPosition.z,
    );
    return out;
  }

  bodyRadius(): number {
    return (this.view?.bodyRadius() ?? 52) * this.depth();
  }

  weakRadius(): number {
    return (this.view?.weakPointOffset().radius ?? 10) * this.depth();
  }

  viewOffset(): { x: number; y: number; radius: number } {
    const offset = this.view?.weakPointOffset() ?? { x: 25, y: 8, radius: 10 };
    const depth = this.depth();
    return {
      x: offset.x * this.facing * depth,
      y: offset.y * depth,
      radius: offset.radius * depth,
    };
  }

  protected update(dt: number): void {
    if (!this.config || FishController.battlePaused) return;
    if (this.hitPulse > 0) {
      this.hitPulse = Math.max(0, this.hitPulse - dt);
    }
    this.elapsed += dt;
    if (this.mode === "carried") {
      this.stunnedNow = true;
      this.airborneNow = false;
      this.present();
      return;
    }
    if (this.mode === "yank") {
      const next = yankStep(this.body.x, this.body.y, dt);
      this.body.x = next.x;
      this.body.y = next.y;
      this.applyBody();
      if (next.landed) {
        this.pendingSplash = true;
        this.mode = "flop";
        this.body = beginFlop(next.x, next.y, this.mass);
        this.apexY = this.body.y;
        this.unattended = 0;
        this.applyBody();
      }
      this.present();
      return;
    }
    if (this.mode === "flop" || this.mode === "stunned") {
      if (this.remainingToughness <= 0) this.mode = "stunned";
      const down = this.mode === "stunned";
      const prev = this.body;
      this.body = stepFlop(this.body, dt, down);
      if (bouncedOnDeck(prev, this.body)) {
        this.pendingBounce = true;
        this.pendingBounceIndex = this.bounceCount;
        this.bounceCount += 1;
      }
      if (this.body.y > this.apexY) this.apexY = this.body.y;
      this.airborneNow = isAirborne(this.body);
      this.stunnedNow = down;
      this.smashNow = smashGradeAt(this.body, this.apexY);
      if (this.escapeLocked || this.airborneNow) {
        if (this.airborneNow) this.unattended = 0;
      } else {
        this.unattended += dt;
      }
      if (inWater(this.body)) this.waterTime += dt;
      else this.waterTime = 0;
      this.escapeNow = this.escapeLocked
        ? "idle"
        : escapePhaseAt({
            onDeck: !this.airborneNow && !inWater(this.body),
            airborne: this.airborneNow,
            inWater: inWater(this.body),
            stunned: down,
            unattended: this.unattended,
            waterTime: this.waterTime,
          });
      if (!this.escapeLocked) {
        this.body = applyEscape(this.body, this.escapeNow, dt);
      }
      this.applyBody();
      if (this.escapeNow === "gone") {
        this.setHooked(false);
        this.present();
        return;
      }
      this.present();
      return;
    }
    if (this.patternStun > 0) {
      this.patternStun = Math.max(0, this.patternStun - dt);
      this.stunnedNow = true;
      this.airborneNow = false;
      this.applyFacingScale();
      this.present();
      return;
    }
    const pose = poseForBehavior(
      this.config,
      this.elapsed,
      this.hooked,
      this.toughnessRatio,
    );
    this.airborneNow = pose.airborne;
    this.stunnedNow = pose.stunned;
    this.facing = pose.facing;
    if (!pose.stunned) {
      this.node.setPosition(
        this.origin.x + pose.x,
        this.origin.y + pose.y,
        this.origin.z,
      );
    }
    this.body = createFlopBody(this.node.position.x, this.node.position.y, this.mass);
    this.node.angle = 0;
    this.applyFacingScale();
    this.present();
  }

  private applyBody(): void {
    this.node.setPosition(this.body.x, this.body.y, this.node.position.z);
    this.node.angle = (this.body.angle * 180) / Math.PI;
    const flip = this.body.vx < -8 ? -1 : 1;
    this.facing = flip;
    this.applyFacingScale();
  }

  private applyFacingScale(): void {
    const punch =
      this.hitPulse > 0 && !FishController.lowPower
        ? 1 + 0.24 * (this.hitPulse / 0.22)
        : 1;
    const d = this.depth() * punch;
    this.node.setScale(this.facing * d, d, 1);
  }

  private depth(): number {
    return depthScale(this.node.position.y, this.airborneNow);
  }

  private present(): void {
    this.view?.setPresentation(this.weakOpen, this.hooked, {
      decoy: this.decoy,
      armored: this.config?.behavior === "shield" && !this.shieldOpen,
      hit: this.hitPulse > 0,
      face:
        this.mode === "carried"
          ? "carry"
          : this.mode === "yank"
            ? "hooked"
            : this.stunnedNow
              ? "stunned"
              : this.hooked
                ? "hooked"
                : "idle",
    });
  }
}
