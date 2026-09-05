import {
  _decorator,
  Color,
  Component,
  EventTouch,
  Graphics,
  Label,
  Node,
  UITransform,
  Vec3,
  game,
} from "cc";
import { FishController } from "./battle/FishController";
import { ConfigService } from "./data/ConfigService";
import type { FishConfig, RunSummary, ToolKind, ToolLevel } from "./data/types";
import { Analytics } from "./analytics/Analytics";
import {
  classifyHit,
  projectShot,
} from "./domain/AimSolve";
import {
  bossMoveForPhase,
  patternBeat,
  phaseInterval,
  rushWindows,
  vortexHits,
  waveHits,
} from "./domain/BossPattern";
import { RunSession } from "./domain/RunSession";
import {
  cannonHoldFire,
  harpoonCharge,
  harpoonDashBonus,
} from "./domain/ToolFeel";
import {
  TUTORIAL_FISH_ID,
  TUTORIAL_WEAK_PAUSE_SECONDS,
  advanceTutorial,
  isTutorialRun,
  shouldAutoReel,
  pickupAssistDecision,
  tutorialCanLeave,
  tutorialGuideAnchor,
  tutorialGuideRing,
  tutorialGuideTarget,
  tutorialPrompt,
  battleBarButtonTone,
  battleBarButtonVisible,
  battleInboxCtaVisible,
  inboxBarCaption,
  battleWaveNarration,
  waveStartNarration,
  settleLeaveDecision,
  TUTORIAL_ISLAND_ID,
  type TutorialStep,
} from "./domain/TutorialFlow";
import {
  bossPhaseIndex,
  decoyOffsets,
} from "./domain/FishBehavior";
import {
  castChargeCaption,
  castLockCaption,
  comboHud,
  inboxPopup,
  liveQuote,
  styleCallout,
} from "./domain/StyleCallout";
import {
  formatClock,
  runPhase,
  shouldSpawn,
  waveCaption,
} from "./domain/IslandClock";
import {
  bounceFreezeSeconds,
  canPickUp,
  carryBobOffset,
  crateDrop,
} from "./domain/FlopPhysics";
import {
  castAutoReleaseMs,
  castBarSpec,
  castChargeAt,
  castPreviewPts,
  castQuality,
  tutorialCastAssists,
} from "./domain/CastFeel";
import { discoveryToast, isFirstCatch } from "./domain/SettleCopy";
import { depthScale } from "./domain/DepthScale";
import {
  calloutHoldMs,
  hitStopSeconds,
  spawnCap,
  shouldVibrate,
  styleHudPunchRgb,
  styleHudPunchScaleAt,
  styleHudPunchSeconds,
  styleHudShouldPunch,
  type ButtonTone,
} from "./domain/GameFeel";
import {
  keepLiveShots,
  spawnShot,
  shotExpired,
  tickShot,
  type Shot,
} from "./domain/ShotFlight";
import {
  castFlashSeconds,
  castLineWidth,
  castRodScaleAt,
  castTipNudgePx,
  crateBounceScaleAt,
  juicePunchScaleAt,
  juicePunchSeconds,
  juiceShakePx,
  juiceShakeSeconds,
  popupLiftPx,
  spawnJuice,
  spawnJuiceFlash,
  spawnLandingDust,
  tickJuice,
  tickJuiceFlash,
  type JuiceFlash,
  type JuiceKind,
  type JuiceParticle,
} from "./domain/HitJuice";
import { SfxPlayer } from "./platform/SfxPlayer";
import { WechatAdapter } from "./platform/WechatAdapter";
import { playerSave } from "./save/SaveService";
import {
  drawOcean,
  drawBoat,
  drawCrate,
  drawDock,
  makeButton,
  makeLabel,
  makePlate,
  paintButtonTone,
  replacePlayLayer,
  tintGold,
} from "./ui/RuntimeUi";
import { drawGuideHole, drawJuice, drawShots } from "./ui/GrayArt";
import { DeckStage } from "./world/DeckStage";
import { deckFlag } from "./world/deckFlag";

const { ccclass } = _decorator;

export interface PrototypeLaunch {
  islandId: string;
  toolId: string;
  onHarbor?: (summary: RunSummary) => void;
}

@ccclass("RuntimePrototype")
export class RuntimePrototype extends Component {
  static pending?: PrototypeLaunch;

  private status!: Label;
  private multiplier!: Label;
  private coinsLabel!: Label;
  private fishName!: Label;
  private launch: PrototypeLaunch = {
    islandId: "island_foam_bay",
    toolId: "tool_rod",
  };
  private layer!: Node;
  private player!: Node;
  private fishRoot!: Node;
  private aimLine!: Graphics;
  private reelBar!: Graphics;
  private hooked?: FishController;
  private carried?: FishController;
  private session!: RunSession;
  private hookedAt = 0;
  private lastFireAt = 0;
  // TODO: reelActive / 绿条是旧收杆模型残留；现战斗走砸晕→捡起→鱼箱，教学圈也不再指向绿区。
  private reelActive = false;
  private reelMarker = 0.08;
  private reelDir = 1;
  private aiming = false;
  private aimFrom = new Vec3();
  private aimTo = new Vec3();
  private moving = false;
  private moveTarget = new Vec3(-400, -90, 0);
  private tutorial = false;
  private tutorialStep: TutorialStep = "cast";
  private battleAt = 0;
  private reelReadyAt = 0;
  private settleAt = 0;
  private pickableSince = 0;
  private carriedSince = 0;
  private pickupHintShown = false;
  private carriedHintShown = false;
  private settleHintShown = false;
  private lastInputAt = 0;
  private castButton?: Node;
  private reelButton?: Node;
  private dropButton?: Node;
  private leaveButton?: Node;
  private lastCastTone?: ButtonTone;
  private lastPickTone?: ButtonTone;
  private guide!: Graphics;
  private hazard!: Graphics;
  private juiceGfx!: Graphics;
  private juice: JuiceParticle[] = [];
  private juiceFlash?: JuiceFlash;
  private punchKind: JuiceKind = "hit";
  private punchElapsed = 0;
  private punchLeft = 0;
  private cratePunchLeft = 0;
  private castFlashLeft = 0;
  private castFlashElapsed = 0;
  private castFlashDuration = 0;
  private hudPunchLeft = 0;
  private hudPunchElapsed = 0;
  private lastHudMultiplier = 1;
  private lastHudCombo = 0;
  private shakeLeft = 0;
  private shakePx = 0;
  private crateLabel?: Label;
  private crateGfx?: Graphics;
  private crateNode?: Node;
  private calloutBaseY = 188;
  private aimStartedAt = 0;
  private waveY = 0;
  private boatIFrame = 0;
  private lastTelegraph = false;
  private lastOutput = false;
  private clockLabel!: Label;
  private runElapsed = 0;
  private spawnWait = 0;
  private lastWaveIndex = -1;
  private shownBoss = false;
  private paused = false;
  private resumeLeft = 0;
  private pauseStartedAt = 0;
  private closing = false;
  private shots: Shot[] = [];
  private hitStopLeft = 0;
  private charging = false;
  private chargeBorn = 0;
  private chargeTarget?: FishController;
  private callout!: Label;
  private calloutUntil = 0;
  private lowPower = false;
  private vibration = true;
  private deck?: DeckStage;

  protected onLoad(): void {
    try {
      if (!RuntimePrototype.pending) return;
      this.launch = RuntimePrototype.pending;
      RuntimePrototype.pending = undefined;
      ConfigService.ensureBundled();
      playerSave.loadLocal();
      const save = playerSave.get();
      this.tutorial = isTutorialRun(this.launch.islandId, save.tutorialComplete);
      if (this.tutorial) Analytics.track("tutorial_start");
      this.lowPower = save.settings.lowPower;
      this.vibration = save.settings.vibration;
      SfxPlayer.setEnabled(save.settings.sfx);
      FishController.setLowPower(this.lowPower);
      game.frameRate = this.lowPower ? 30 : 60;
      const toolLevel =
        save.tools.find((entry) => entry.toolId === this.launch.toolId)
          ?.level ?? 1;
      this.session = new RunSession(
        `run_${Date.now()}`,
        this.launch.islandId,
        this.launch.toolId,
        toolLevel,
      );
      this.battleAt = Date.now();
      this.buildView();
      this.tickWave(0);
      this.renderHud();
    } catch (error) {
      console.error("Prototype bootstrap failed", error);
    }
  }

  protected onDestroy(): void {
    FishController.setPaused(false);
    FishController.setLowPower(false);
    game.frameRate = 60;
    this.deck?.dispose();
    this.deck = undefined;
    this.unbindPads();
  }

  protected update(dt: number): void {
    if (!this.layer?.isValid) return;
    if (this.tickHold(dt)) {
      this.renderHud();
      return;
    }
    if (this.tickHitStop(dt)) {
      this.tickJuiceFx(dt);
      this.drawAim();
      this.renderHud();
      return;
    }
    this.movePlayer(dt);
    this.tickCarry();
    this.tickPickupAssist();
    this.tickLandFx();
    this.tickCastCharge();
    this.tickCannon();
    this.tickShots(dt);
    if (this.hitStopLeft > 0) {
      this.drawAim();
      this.tickJuiceFx(dt);
      this.renderHud();
      return;
    }
    this.drawAim();
    this.tickReel(dt);
    this.tickEscape();
    this.tickTutorial();
    this.tickWave(dt);
    this.tickBoss(dt);
    this.sortByDepth();
    this.drawGuide();
    this.tickJuiceFx(dt);
    this.deck?.tickWater(dt, this.lowPower);
    this.renderHud();
  }

  private buildView(): void {
    this.layer = replacePlayLayer(this.node);
    this.layer.layer = this.node.layer;
    let deckOk = false;
    try {
      this.deck = DeckStage.mount(this.node, this.launch.islandId);
      deckOk = true;
    } catch (error) {
      console.error("DeckStage failed, using 2D seascape", error);
    }
    if (!deckOk) {
      drawOcean(this.layer, { islandId: this.launch.islandId });
      drawDock(this.layer);
    }
    const island = ConfigService.islandById(this.launch.islandId);
    makeLabel(this.layer, `${island.name} · 潮汐猎场`, 32, 0, 318);
    this.multiplier = makeLabel(this.layer, "精彩 ×1.00", 22, -470, 318, 280);
    this.coinsLabel = tintGold(makeLabel(this.layer, "本局 0", 24, 470, 318, 280));
    makePlate(this.layer, 0, 268, this.tutorial, 780, 52);
    this.status = makeLabel(
      this.layer,
      this.tutorial
        ? tutorialPrompt("cast")
        : "抛竿拽上岸。在甲板上砸晕，搬进左边鱼箱。空中打更值钱。",
      22,
      0,
      268,
      760,
    );
    this.status.color = new Color(255, 252, 236, 255);
    this.fishName = makeLabel(this.layer, "等待抛竿", 24, 0, 228);
    this.callout = makeLabel(this.layer, "", 28, 0, 188, 900);
    this.callout.color = new Color(255, 236, 120, 255);
    this.clockLabel = makeLabel(this.layer, "热身潮 1:40", 20, -470, 268, 280);
    this.crateNode = new Node("Crate");
    this.crateNode.layer = this.layer.layer;
    this.crateNode.parent = this.layer;
    this.crateNode.setPosition(-520, -150);
    this.crateNode.addComponent(UITransform).setContentSize(100, 70);
    this.crateGfx = this.crateNode.addComponent(Graphics);
    drawCrate(this.crateGfx);
    this.crateLabel = makeLabel(this.layer, "鱼箱", 20, -520, -96, 120);
    this.crateLabel.color = new Color(255, 236, 180, 255);

    this.bindPad("MovePad", -320, 0, 640, 420, {
      start: (event) => this.onMoveStart(event),
      move: (event) => this.onMove(event),
      end: () => {
        this.moving = false;
      },
    });
    this.bindPad("AimPad", 320, 0, 640, 420, {
      start: (event) => this.onAimStart(event),
      move: (event) => this.onAimMove(event),
      end: (event) => this.onAimEnd(event),
    });

    this.fishRoot = new Node("FishRoot");
    this.fishRoot.layer = this.layer.layer;
    this.fishRoot.parent = this.layer;

    this.player = new Node("Boat");
    this.player.layer = this.layer.layer;
    this.player.parent = this.layer;
    this.player.setPosition(this.moveTarget);
    this.player.addComponent(UITransform).setContentSize(90, 46);
    if (!deckFlag.live) {
      const boat = this.player.addComponent(Graphics);
      drawBoat(boat);
    }
    this.player.setScale(
      depthScale(this.moveTarget.y),
      depthScale(this.moveTarget.y),
      1,
    );

    const aimNode = new Node("AimLine");
    aimNode.layer = this.layer.layer;
    aimNode.parent = this.layer;
    this.aimLine = aimNode.addComponent(Graphics);

    const reelNode = new Node("ReelBar");
    reelNode.layer = this.layer.layer;
    reelNode.parent = this.layer;
    reelNode.setPosition(0, -188);
    this.reelBar = reelNode.addComponent(Graphics);

    const guideNode = new Node("GuideRing");
    guideNode.layer = this.layer.layer;
    guideNode.parent = this.layer;
    this.guide = guideNode.addComponent(Graphics);

    const hazardNode = new Node("Hazard");
    hazardNode.layer = this.layer.layer;
    hazardNode.parent = this.layer;
    this.hazard = hazardNode.addComponent(Graphics);

    const juiceNode = new Node("Juice");
    juiceNode.layer = this.layer.layer;
    juiceNode.parent = this.layer;
    this.juiceGfx = juiceNode.addComponent(Graphics);

    const castTone = this.barTone("cast");
    const pickTone = this.barTone("pickUp");
    this.castButton = makeButton(
      this.layer,
      "抛竿",
      -390,
      -292,
      () => this.cast(),
      200,
      86,
      28,
      castTone,
    );
    this.reelButton = makeButton(
      this.layer,
      "捡起",
      390,
      -292,
      () => this.pickUp(),
      200,
      86,
      28,
      pickTone,
    );
    this.dropButton = makeButton(
      this.layer,
      inboxBarCaption(),
      0,
      -292,
      () => this.dropInbox(),
      220,
      86,
      28,
      "primary",
    );
    this.dropButton.active = false;
    this.lastCastTone = castTone;
    this.lastPickTone = pickTone;
    makeButton(this.layer, "暂停", -530, 268, () => this.togglePause(), 150, 56, 22);
    this.leaveButton = makeButton(
      this.layer,
      "回港",
      530,
      268,
      () => this.returnHarbor(),
      150,
      56,
      22,
    );
  }

  private spawnFish(config: FishConfig, x: number, y: number, decoy = false): void {
    const node = new Node(decoy ? `${config.name}影` : config.name);
    node.layer = this.layer.layer;
    node.parent = this.fishRoot;
    node.setPosition(x, y);
    node.addComponent(UITransform).setContentSize(130, 70);
    const fish = node.addComponent(FishController);
    fish.initialize(config, decoy);
    if (!decoy && config.behavior === "split") {
      for (const offset of decoyOffsets()) {
        this.spawnFish(config, x + offset.x, y + offset.y, true);
      }
    }
  }

  private bindPad(
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    handlers: {
      start: (event: EventTouch) => void;
      move: (event: EventTouch) => void;
      end: (event: EventTouch) => void;
    },
  ): void {
    const pad = new Node(name);
    pad.layer = this.layer.layer;
    pad.parent = this.layer;
    pad.setPosition(x, y);
    pad.addComponent(UITransform).setContentSize(width, height);
    pad.on(
      Node.EventType.TOUCH_START,
      (event: EventTouch) => {
        SfxPlayer.unlock();
        handlers.start(event);
      },
      this,
    );
    pad.on(Node.EventType.TOUCH_MOVE, handlers.move, this);
    pad.on(Node.EventType.TOUCH_END, handlers.end, this);
    pad.on(Node.EventType.TOUCH_CANCEL, handlers.end, this);
  }

  private unbindPads(): void {
    if (!this.layer?.isValid) return;
    for (const name of ["MovePad", "AimPad"]) {
      const pad = this.layer.getChildByName(name);
      pad?.off(Node.EventType.TOUCH_START);
      pad?.off(Node.EventType.TOUCH_MOVE);
      pad?.off(Node.EventType.TOUCH_END);
      pad?.off(Node.EventType.TOUCH_CANCEL);
    }
  }

  private toLayer(event: EventTouch): Vec3 {
    const loc = event.getUILocation();
    return new Vec3(loc.x - 640, loc.y - 360, 0);
  }

  private onMoveStart(event: EventTouch): void {
    this.noteInput();
    if (this.held()) return;
    this.moving = true;
    this.onMove(event);
  }

  private onMove(event: EventTouch): void {
    if (!this.moving) return;
    this.noteInput();
    const pos = this.toLayer(event);
    this.moveTarget.set(
      Math.min(-180, Math.max(-540, pos.x)),
      Math.min(80, Math.max(-70, pos.y)),
      0,
    );
  }

  private onAimStart(event: EventTouch): void {
    this.noteInput();
    if (this.held()) return;
    this.aiming = true;
    this.aimStartedAt = Date.now();
    this.aimFrom.set(this.player.position);
    this.aimTo.set(this.toLayer(event));
  }

  private onAimMove(event: EventTouch): void {
    if (!this.aiming) return;
    this.aimTo.set(this.toLayer(event));
  }

  private onAimEnd(event: EventTouch): void {
    if (!this.aiming) return;
    this.aimTo.set(this.toLayer(event));
    this.aiming = false;
    if (this.currentKind() === "cannon") return;
    this.fire();
  }

  private movePlayer(dt: number): void {
    const current = this.player.position;
    const x = current.x + (this.moveTarget.x - current.x) * Math.min(1, dt * 8);
    const y = current.y + (this.moveTarget.y - current.y) * Math.min(1, dt * 8);
    this.player.setPosition(x, y, 0);
    const scale = depthScale(y);
    this.player.setScale(scale, scale, 1);
  }

  private sortByDepth(): void {
    if (!this.fishRoot?.isValid) return;
    const kids = this.fishRoot.children
      .slice()
      .sort((a, b) => b.position.y - a.position.y);
    for (let i = 0; i < kids.length; i++) {
      kids[i].setSiblingIndex(i);
    }
  }

  private currentKind(): ToolKind {
    return ConfigService.toolById(this.launch.toolId).kind;
  }

  private drawHookLine(flashing: boolean): void {
    if (!this.hooked?.node.active) return;
    const elapsed = this.castFlashElapsed;
    const duration = this.castFlashDuration;
    const width = flashing
      ? castLineWidth(elapsed, duration, this.lowPower)
      : 6;
    const nudge = flashing
      ? castTipNudgePx(elapsed, duration, this.lowPower)
      : 0;
    const sx = this.player.position.x + 28;
    const sy = this.player.position.y + 18;
    const tx = this.hooked.node.position.x;
    const ty = this.hooked.node.position.y;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    this.aimLine.strokeColor = new Color(255, 214, 70, flashing ? 255 : 250);
    this.aimLine.lineWidth = width;
    this.aimLine.moveTo(sx + (dx / len) * nudge, sy + (dy / len) * nudge);
    this.aimLine.lineTo(tx, ty);
    this.aimLine.stroke();
  }

  private drawCastCharge(): void {
    if (!this.charging || !this.chargeTarget?.node.active) return;
    const charge = castChargeAt(Date.now() - this.chargeBorn);
    const ox = this.player.position.x + 28;
    const oy = this.player.position.y + 18;
    const tx = this.chargeTarget.node.position.x;
    const ty = this.chargeTarget.node.position.y;
    const pts = castPreviewPts(ox, oy, tx, ty, charge);
    this.aimLine.strokeColor = new Color(255, 226, 96, 200);
    this.aimLine.lineWidth = 3 + charge * 4;
    this.aimLine.moveTo(ox, oy);
    for (const pt of pts) this.aimLine.lineTo(pt.x, pt.y);
    this.aimLine.stroke();
    for (const pt of pts) {
      this.aimLine.fillColor = new Color(255, 236, 140, 220);
      this.aimLine.circle(pt.x, pt.y, 3.2);
      this.aimLine.fill();
    }
    const spec = castBarSpec();
    const bx = 0;
    const by = -248;
    this.aimLine.fillColor = new Color(12, 22, 30, 210);
    this.aimLine.roundRect(bx - spec.width / 2, by, spec.width, spec.height, 7);
    this.aimLine.fill();
    this.aimLine.fillColor = new Color(86, 210, 132, 90);
    this.aimLine.rect(
      bx - spec.width / 2 + spec.width * spec.sweetLo,
      by + 2,
      spec.width * (spec.sweetHi - spec.sweetLo),
      spec.height - 4,
    );
    this.aimLine.fill();
    this.aimLine.fillColor = new Color(255, 168, 42, 255);
    this.aimLine.roundRect(
      bx - spec.width / 2,
      by + 2,
      Math.max(8, spec.width * charge),
      spec.height - 4,
      5,
    );
    this.aimLine.fill();
  }

  private drawAim(): void {
    this.aimLine.clear();
    this.drawCastCharge();
    const flashing = this.castFlashLeft > 0 && !!this.hooked?.node.active;
    if (flashing) this.drawHookLine(true);
    if (deckFlag.live) {
      drawShots(this.aimLine, this.shots);
      return;
    }
    if (!flashing && this.hooked?.yanking && this.hooked.node.active) {
      this.drawHookLine(false);
    }
    if (this.aiming) {
      const kind = this.currentKind();
      const charge = harpoonCharge(Date.now() - this.aimStartedAt);
      this.aimLine.strokeColor =
        kind === "harpoon"
          ? new Color(255, 180, 90, 240)
          : kind === "cannon"
            ? new Color(140, 230, 255, 220)
            : new Color(255, 236, 150, 230);
      this.aimLine.lineWidth = kind === "harpoon" ? 3 + charge * 5 : 4;
      this.aimLine.moveTo(this.player.position.x, this.player.position.y);
      this.aimLine.lineTo(this.aimTo.x, this.aimTo.y);
      this.aimLine.stroke();
    }
    drawShots(this.aimLine, this.shots);
  }

  private equippedTool(): ToolLevel {
    const save = playerSave.get();
    const owned = save.tools.find((entry) => entry.toolId === this.launch.toolId);
    const tool = ConfigService.toolById(owned?.toolId ?? this.launch.toolId);
    const level = owned?.level ?? 1;
    return tool.levels.find((item) => item.level === level) ?? tool.levels[0];
  }

  private noteInput(): void {
    this.lastInputAt = Date.now();
  }

  private recentInputMs(): number {
    return this.lastInputAt ? Date.now() - this.lastInputAt : Number.POSITIVE_INFINITY;
  }

  private barInput() {
    return {
      tutorial: this.tutorial,
      step: this.tutorialStep,
      carrying: !!this.carried?.node.active,
      pickable: !!this.nearestPickable(),
      hooked: !!this.hooked?.node.active,
    };
  }

  private barTone(button: "cast" | "pickUp") {
    return battleBarButtonTone(this.barInput(), button);
  }

  private dropInbox(): void {
    this.noteInput();
    if (this.held()) return;
    if (!this.carried) return;
    this.stashCarried();
  }

  private nearestCastTarget(): FishController | undefined {
    const origin = this.player.position;
    const candidates = this.fishRoot.getComponentsInChildren(FishController)
      .filter((fish) => fish.node.active && !fish.decoy)
      .sort(
        (a, b) =>
          Vec3.distance(a.node.position, origin) -
          Vec3.distance(b.node.position, origin),
      );
    return this.tutorial
      ? candidates.find((fish) => fish.id === TUTORIAL_FISH_ID) ?? candidates[0]
      : candidates.find(
          (fish) =>
            Vec3.distance(fish.node.position, origin) <=
            (this.shownBoss ? 780 : 560),
        );
  }

  private cast(): void {
    this.noteInput();
    if (this.held()) return;
    if (this.charging) return;
    if (this.hooked) {
      this.setStatus(
        this.tutorial
          ? tutorialPrompt(this.tutorialStep)
          : "已经锁鱼，用右半屏瞄准开火。",
      );
      return;
    }
    const target = this.nearestCastTarget();
    if (!target) {
      this.setStatus("附近没有鱼，把船再靠近一点。");
      return;
    }
    this.charging = true;
    this.chargeBorn = Date.now();
    this.chargeTarget = target;
    SfxPlayer.play("ui");
  }

  private tickCastCharge(): void {
    if (!this.charging) return;
    const hold = Date.now() - this.chargeBorn;
    if (hold >= castAutoReleaseMs(this.tutorial)) this.commitCast();
  }

  private commitCast(): void {
    if (!this.charging) return;
    this.charging = false;
    const charge = castChargeAt(Date.now() - this.chargeBorn);
    const target = this.chargeTarget;
    this.chargeTarget = undefined;
    if (!target?.node.active) return;
    if (this.tutorial && !tutorialCastAssists(charge) && !target.node.active) {
      return;
    }
    this.hooked = target;
    this.hooked.setHooked(true);
    this.hookedAt = Date.now();
    this.reelActive = false;
    this.session.resetStyle();
    this.lastHudMultiplier = 1;
    this.lastHudCombo = 0;
    this.playCastFeel(castQuality(charge));
    if (this.tutorial) {
      this.hooked.setAssist({
        freezeSeconds: TUTORIAL_WEAK_PAUSE_SECONDS,
        forceWeak: true,
        radiusScale: 1.8,
      });
      this.enterTutorial("hooked");
      return;
    }
    const name = target.fishConfig?.name ?? "目标";
    this.setStatus(`${castLockCaption(name)}钓线绷着，等它摔上甲板再砸。`);
  }

  private playCastFeel(quality: ReturnType<typeof castQuality> = "early"): void {
    const tipX = this.player.position.x + 28;
    const tipY = this.player.position.y + 18;
    this.castFlashDuration = castFlashSeconds(this.lowPower);
    this.castFlashElapsed = 0;
    this.castFlashLeft = this.castFlashDuration;
    this.burst("cast", tipX, tipY);
    this.showCallout(castChargeCaption(quality));
    SfxPlayer.play("cast");
  }

  private fire(): void {
    this.noteInput();
    if (this.held()) return;
    if (!this.hooked?.node.active) {
      this.setStatus(
        this.tutorial ? tutorialPrompt("cast") : "先点抛竿，锁最近的一条鱼。",
      );
      return;
    }
    const tool = this.equippedTool();
    const now = Date.now();
    if (now < this.lastFireAt + tool.cooldownMs) {
      this.setStatus("还在冷却。");
      return;
    }
    if (this.hooked.yanking) {
      this.setStatus("还在拽，等它摔上甲板。");
      return;
    }
    if (this.hooked.remainingToughness <= 0) {
      this.setStatus("砸晕了。点捡起，搬去左边鱼箱。");
      return;
    }
    const origin = this.player.position;
    const dirX = this.aimTo.x - origin.x;
    const dirY = this.aimTo.y - origin.y;
    const kind = this.currentKind();
    const charge = kind === "harpoon" ? harpoonCharge(now - this.aimStartedAt) : 1;
    const shot = spawnShot(
      origin.x,
      origin.y,
      dirX,
      dirY,
      kind,
      charge,
      this.lowPower,
    );
    if (!shot) {
      this.setStatus("瞄准拉得太短。");
      return;
    }
    this.shots = keepLiveShots(this.shots, shot);
    this.lastFireAt = now;
    SfxPlayer.play("shot");
  }

  private tickShots(dt: number): void {
    if (this.shots.length === 0) return;
    const next: Shot[] = [];
    for (const shot of this.shots) {
      const moved = tickShot(shot, dt);
      if (this.tryResolveShot(moved)) continue;
      if (shotExpired(moved)) {
        this.burst("miss", moved.x, moved.y);
        this.setStatus("擦过去了。跟着鱼的路线再拉一次。");
        continue;
      }
      next.push(moved);
    }
    this.shots = next;
  }

  private tryResolveShot(shot: Shot): boolean {
    if (!this.hooked?.node.active) {
      if (shotExpired(shot)) {
        this.burst("miss", shot.x, shot.y);
        return true;
      }
      return false;
    }
    const tx = this.hooked.node.position.x;
    const ty = this.hooked.node.position.y;
    const closest = projectShot(
      shot.ox,
      shot.oy,
      shot.nx,
      shot.ny,
      tx,
      ty,
      shot.maxRange,
    );
    if (shot.traveled + shot.radius < closest.along) return false;
    this.resolveImpact(shot);
    return true;
  }

  private resolveImpact(shot: Shot): void {
    if (!this.hooked) return;
    if (this.hooked.decoy) {
      this.burst("miss", shot.x, shot.y);
      this.setStatus("打到影了。找颜色更深、会亮黄点的那条。");
      return;
    }
    const weak = this.hooked.viewOffset();
    const tx = this.hooked.node.position.x;
    const ty = this.hooked.node.position.y;
    const body = projectShot(
      shot.ox,
      shot.oy,
      shot.nx,
      shot.ny,
      tx,
      ty,
      shot.maxRange,
    );
    const weakShot = projectShot(
      shot.ox,
      shot.oy,
      shot.nx,
      shot.ny,
      tx + weak.x,
      ty + weak.y,
      shot.maxRange,
    );
    const judged = classifyHit(
      body.distance,
      weakShot.distance,
      this.hooked.bodyRadius() + shot.radius,
      this.hooked.weakRadius(),
      this.hooked.weakOpen,
    );
    if (!judged.hit) {
      this.burst("miss", shot.x, shot.y);
      this.setStatus("擦过去了。跟着鱼的路线再拉一次。");
      return;
    }
    const tool = this.equippedTool();
    const now = Date.now();
    const airborne = this.hooked.airborne;
    const result = this.hooked.applyHit(
      tool,
      judged.accuracy,
      judged.weakPoint,
      shot.charge,
      {
        originX: shot.ox,
        toolKind: shot.kind,
        damageBonus: harpoonDashBonus(
          shot.kind,
          airborne,
          this.hooked.stunned,
        ),
      },
    );
    this.session.addStyle({
      action: judged.weakPoint ? "weakPoint" : "combo",
      atMs: now,
      quality: judged.accuracy,
    });
    if (airborne) {
      this.session.addStyle({ action: "airborne", atMs: now });
    }
    const snap = this.session.getStyleSnapshot();
    const parts = {
      weakPoint: judged.weakPoint,
      airborne,
      combo: snap.combo,
    };
    this.showCallout(styleCallout(parts));
    const juice: JuiceKind = judged.weakPoint ? "weak" : "hit";
    this.burst(juice, tx, ty);
    this.beginHitStop(hitStopSeconds(juice, this.lowPower));
    SfxPlayer.play(judged.weakPoint ? "weak" : "hit");
    if (shouldVibrate(this.vibration, parts)) WechatAdapter.vibrate();
    if (result.readyToReel) {
      this.setStatus("砸晕了！点捡起，搬去左边鱼箱。");
    } else if (
      this.hooked.fishConfig?.behavior === "shield" &&
      !judged.weakPoint &&
      !this.hooked.shieldOpen
    ) {
      this.setStatus(
        `甲壳挡住了。等它转身露出缝再打。韧性 ${result.remainingToughness}`,
      );
    } else     if (judged.weakPoint) {
      this.setStatus(`弱点击破！韧性 ${result.remainingToughness}`);
    } else {
      this.setStatus(`命中，韧性 ${result.remainingToughness}`);
    }
    if (this.tutorial) {
      if (judged.weakPoint) this.enterTutorial("weakHit");
      if (result.readyToReel) this.enterTutorial("reelReady");
    }
  }

  private tickReel(dt: number): void {
    this.reelBar.clear();
    if (!this.reelActive) return;
    this.reelMarker += dt * (this.tutorial ? 0.45 : 0.85) * this.reelDir;
    if (this.reelMarker >= 1) {
      this.reelMarker = 1;
      this.reelDir = -1;
    } else if (this.reelMarker <= 0) {
      this.reelMarker = 0;
      this.reelDir = 1;
    }
    const width = 360;
    const height = 28;
    this.reelBar.fillColor = new Color(18, 48, 62, 230);
    this.reelBar.roundRect(-width / 2, -height / 2, width, height, 10);
    this.reelBar.fill();
    this.reelBar.fillColor = new Color(86, 210, 132, 255);
    this.reelBar.rect(-width * 0.08, -height / 2 + 3, width * 0.16, height - 6);
    this.reelBar.fill();
    const x = -width / 2 + this.reelMarker * width;
    this.reelBar.fillColor = new Color(255, 245, 210, 255);
    this.reelBar.rect(x - 4, -height / 2 - 4, 8, height + 8);
    this.reelBar.fill();
  }

  private tickLandFx(): void {
    if (!this.fishRoot?.isValid) return;
    for (const fish of this.fishRoot.getComponentsInChildren(FishController)) {
      if (!fish.node.active) continue;
      const fx = fish.takeLandFx();
      if (fx.splash) {
        this.burst("splash", fish.node.position.x, fish.node.position.y + 24);
        SfxPlayer.play("splash");
      }
      if (fx.bounce) {
        this.burst("smash", fish.node.position.x, fish.node.position.y);
        this.juice = this.juice.concat(
          spawnLandingDust(fish.node.position.x, fish.node.position.y, this.lowPower),
        );
        this.beginHitStop(
          bounceFreezeSeconds(fx.bounceIndex ?? 0, this.lowPower),
        );
        SfxPlayer.play("smash");
      }
    }
  }

  private tickCarry(): void {
    if (!this.carried?.node.active) {
      this.carried = undefined;
      return;
    }
    const p = this.player.position;
    const bob = carryBobOffset(this.runElapsed);
    this.carried.followCarry(p.x + 40 + bob.x, p.y + 30 + bob.y);
    if (crateDrop(this.carried.node.position.x, this.carried.node.position.y)) {
      this.stashCarried();
    }
  }

  private nearestPickable(): FishController | undefined {
    return (
      (this.hooked?.pickable ? this.hooked : undefined) ??
      this.fishRoot
        ?.getComponentsInChildren(FishController)
        .find((fish) => fish.pickable && fish.node.active)
    );
  }

  private pickUp(): void {
    this.noteInput();
    if (this.held()) return;
    if (this.carried) {
      this.setStatus("已经扛着一条。走到左边鱼箱丢掉。");
      return;
    }
    const near = this.nearestPickable();
    if (!near) {
      this.setStatus("先砸晕甲板上的鱼，再捡起来。");
      return;
    }
    if (
      !canPickUp(
        this.player.position.x,
        this.player.position.y,
        near.node.position.x,
        near.node.position.y,
      )
    ) {
      this.setStatus("走近一点再捡。");
      return;
    }
    near.startCarry();
    this.carried = near;
    if (this.hooked === near) this.hooked = undefined;
    this.setStatus(
      this.tutorial
        ? tutorialPrompt("reel", { carrying: true })
        : "扛上了。搬去左边鱼箱。",
    );
  }

  private stashCarried(): void {
    const fish = this.carried;
    const captured = fish?.fishConfig;
    if (!fish || !captured) return;
    const atX = fish.node.position.x;
    const atY = fish.node.position.y;
    const airborneBag = fish.airborne;
    if (airborneBag) {
      this.session.addStyle({ action: "perfectReel", atMs: Date.now() });
    }
    const sold = this.session.capture(captured, 1);
    fish.node.active = false;
    fish.setHooked(false);
    this.carried = undefined;
    this.carriedSince = 0;
    this.carriedHintShown = false;
    this.reelActive = false;
    this.reelBar.clear();
    Analytics.track("fish_captured", {
      fishId: captured.id,
      price: sold.price,
      multiplier: sold.styleMultiplier,
    });
    const juice: JuiceKind = airborneBag ? "perfect" : "catch";
    this.burst(juice, atX, atY);
    this.beginHitStop(hitStopSeconds(juice, this.lowPower));
    this.showCallout(inboxPopup(sold.price));
    this.cratePunchLeft = juicePunchSeconds("catch", this.lowPower);
    SfxPlayer.play(airborneBag ? "perfect" : "catch");
    const first = isFirstCatch(captured.id, playerSave.get().discoveredFish);
    if (this.tutorial) {
      this.enterTutorial("captured");
    } else {
      this.setStatus(
        first
          ? `${discoveryToast(captured.name)} 入箱 ${sold.price}金。`
          : `${captured.name} ×${sold.styleMultiplier.toFixed(2)} → ${sold.price}金，丢进鱼箱。回港才卖。`,
      );
    }
    if (captured.tier === "boss") {
      this.setStatus("巨鲲入箱。收网回港。");
      this.returnHarbor();
    }
  }

  private reel(): void {
    this.pickUp();
  }

  private tickHold(dt: number): boolean {
    if (this.resumeLeft > 0) {
      this.resumeLeft = Math.max(0, this.resumeLeft - dt);
      const n = Math.ceil(this.resumeLeft);
      this.setStatus(n > 0 ? `恢复 ${n}` : "继续捕鱼。");
      if (this.resumeLeft <= 0) {
        this.paused = false;
        this.shiftClocks(Date.now() - this.pauseStartedAt);
        FishController.setPaused(false);
      }
      return true;
    }
    return this.paused;
  }

  private togglePause(): void {
    this.noteInput();
    if (this.closing || this.resumeLeft > 0) return;
    if (!this.paused) {
      this.paused = true;
      this.pauseStartedAt = Date.now();
      this.aiming = false;
      this.moving = false;
      FishController.setPaused(true);
      this.setStatus("已暂停。再点暂停，3秒后继续。");
      return;
    }
    this.resumeLeft = 3;
    this.setStatus("恢复 3");
  }

  private held(): boolean {
    return this.paused || this.resumeLeft > 0 || this.closing || this.hitStopLeft > 0;
  }

  private beginHitStop(seconds: number): void {
    if (seconds <= 0 || this.paused) return;
    this.hitStopLeft = Math.max(this.hitStopLeft, seconds);
    FishController.setPaused(true);
  }

  private tickHitStop(dt: number): boolean {
    if (this.hitStopLeft <= 0) return false;
    this.hitStopLeft = Math.max(0, this.hitStopLeft - dt);
    if (this.hitStopLeft <= 0 && !this.paused) FishController.setPaused(false);
    return this.hitStopLeft > 0;
  }

  private shiftClocks(ms: number): void {
    this.hookedAt += ms;
    this.lastFireAt += ms;
    this.aimStartedAt += ms;
    this.reelReadyAt += ms;
    this.settleAt += ms;
    if (this.pickableSince) this.pickableSince += ms;
    if (this.carriedSince) this.carriedSince += ms;
    this.calloutUntil += ms;
  }

  private liveCount(): number {
    return this.fishRoot
      .getComponentsInChildren(FishController)
      .filter((fish) => fish.node.active && !fish.decoy).length;
  }

  private liveBoss(): FishController | undefined {
    return this.fishRoot
      ?.getComponentsInChildren(FishController)
      .find((fish) => fish.fishConfig?.tier === "boss" && fish.node.active);
  }

  private clearUnhooked(): void {
    for (const fish of this.fishRoot.getComponentsInChildren(FishController)) {
      if (fish === this.hooked) continue;
      fish.node.active = false;
    }
  }

  private tickWave(dt: number): void {
    if (this.closing) return;
    const island = ConfigService.islandById(this.launch.islandId);
    this.runElapsed += dt;
    const snapshot = runPhase(this.runElapsed, island);
    if (this.clockLabel) {
      this.clockLabel.string = `${waveCaption(snapshot.phase, snapshot.waveIndex)} ${formatClock(snapshot.remaining)}`;
    }
    if (snapshot.phase === "over") {
      if (this.tutorial) {
        this.setStatus(tutorialPrompt(this.tutorialStep));
        return;
      }
      if (this.liveBoss()) {
        this.setStatus(
          this.hooked?.fishConfig?.tier === "boss"
            ? "潮汐将尽，快砸晕入箱。"
            : "潮汐将尽，抛竿把巨鲲拽上甲板。",
        );
        return;
      }
      this.setStatus("潮汐到时，收网回港。");
      this.returnHarbor();
      return;
    }
    if (snapshot.phase === "boss") {
      if (!this.shownBoss) {
        this.shownBoss = true;
        this.clearUnhooked();
        if (island.bossId) {
          this.spawnFish(ConfigService.fishById(island.bossId), 50, 18);
        }
        this.setStatus("潮鸣巨鲲进场。抛竿拽上甲板，空中砸更值钱。");
      }
      return;
    }
    const wave = island.waves[snapshot.waveIndex];
    if (!wave) return;
    if (snapshot.waveIndex !== this.lastWaveIndex) {
      this.lastWaveIndex = snapshot.waveIndex;
      this.setStatus(
        battleWaveNarration(
          this.tutorial,
          this.tutorialStep,
          waveStartNarration(snapshot.waveIndex),
          { carrying: !!this.carried?.node.active },
        ),
      );
      this.spawnWait = 999;
      while (
        shouldSpawn(
          this.liveCount(),
          wave.maxAlive,
          this.spawnWait,
          wave.spawnIntervalSeconds,
          spawnCap(this.lowPower),
        )
      ) {
        const id = wave.fishPool[Math.floor(Math.random() * wave.fishPool.length)];
        this.spawnFish(
          ConfigService.fishById(id),
          80 + Math.random() * 280,
          -20 + Math.random() * 90,
        );
      }
      this.spawnWait = 0;
      return;
    }
    this.spawnWait += dt;
    if (
      !shouldSpawn(
        this.liveCount(),
        wave.maxAlive,
        this.spawnWait,
        wave.spawnIntervalSeconds,
        spawnCap(this.lowPower),
      )
    ) {
      return;
    }
    this.spawnWait = 0;
    const id = wave.fishPool[Math.floor(Math.random() * wave.fishPool.length)];
    this.spawnFish(
      ConfigService.fishById(id),
      80 + Math.random() * 280,
      -20 + Math.random() * 90,
    );
  }

  private tickEscape(): void {
    if (this.tutorial) return;
    if (this.carried) return;
    if (this.hooked && !this.hooked.isHooked && !this.hooked.pickable) {
      this.hooked = undefined;
      this.setStatus("跳回海里了。再抛竿拽上来。");
      return;
    }
    if (!this.hooked?.fishConfig || this.hooked.pickable) return;
    const limit = this.hooked.fishConfig.escapeSeconds * 1000;
    if (Date.now() - this.hookedAt <= limit) return;
    this.hooked.setHooked(false);
    this.hooked = undefined;
    this.setStatus("鱼挣脱了。再抛竿拽一条。");
  }

  private tickPickupAssist(): void {
    if (this.held() || this.closing) return;
    if (this.carried?.node.active) {
      this.pickableSince = 0;
      this.pickupHintShown = false;
      if (!this.carriedSince) this.carriedSince = Date.now();
      const action = pickupAssistDecision(
        "carried",
        Date.now() - this.carriedSince,
        this.recentInputMs(),
      );
      if (action === "hint" && !this.carriedHintShown) {
        this.carriedHintShown = true;
        this.setStatus("鱼箱在左边。太久不送会自动入箱。");
      }
      if (action === "auto") this.stashCarried();
      return;
    }
    this.carriedSince = 0;
    this.carriedHintShown = false;
    const near = this.nearestPickable();
    if (!near) {
      this.pickableSince = 0;
      this.pickupHintShown = false;
      return;
    }
    if (!this.pickableSince) this.pickableSince = Date.now();
    const action = pickupAssistDecision(
      "pickable",
      Date.now() - this.pickableSince,
      this.recentInputMs(),
    );
    if (action === "hint" && !this.pickupHintShown) {
      this.pickupHintShown = true;
      this.setStatus(
        this.tutorial
          ? "点捡起，搬进左边鱼箱。等太久会自动帮忙。"
          : "砸晕的鱼可以捡了。点捡起，或再等一会会自动捡起。",
      );
    }
    if (action === "auto") this.autoPickUp(near);
  }

  private autoPickUp(near: FishController): void {
    this.player.setPosition(
      near.node.position.x - 40,
      near.node.position.y,
      0,
    );
    this.moveTarget.set(
      this.player.position.x,
      this.player.position.y,
      0,
    );
    this.pickUp();
    if (this.carried === near || this.held()) return;
    if (!near.pickable || !near.node.active || this.carried) return;
    near.startCarry();
    this.carried = near;
    if (this.hooked === near) this.hooked = undefined;
    this.setStatus(
      this.tutorial
        ? tutorialPrompt("reel", { carrying: true })
        : "扛上了。搬去左边鱼箱。",
    );
  }

  private tickTutorial(): void {
    if (!this.tutorial || this.tutorialStep === "complete") return;
    if (this.tutorialStep === "settle" && this.settleAt > 0) {
      const action = settleLeaveDecision(
        Date.now() - this.settleAt,
        this.recentInputMs(),
      );
      if (action === "hint" && !this.settleHintShown) {
        this.settleHintShown = true;
        this.setStatus(tutorialPrompt("settle"));
      }
      if (action === "auto") {
        this.tutorialStep = "complete";
        this.returnHarbor();
      }
      return;
    }
    if (
      !shouldAutoReel(this.tutorialStep, 0, Date.now() - this.battleAt)
    ) {
      return;
    }
    const near = this.nearestPickable();
    if (near) this.autoPickUp(near);
  }

  private enterTutorial(event: "hooked" | "weakHit" | "reelReady" | "captured"): void {
    this.tutorialStep = advanceTutorial(this.tutorialStep, event);
    this.setStatus(tutorialPrompt(this.tutorialStep));
    if (this.tutorialStep === "settle") {
      this.settleAt = Date.now();
      this.settleHintShown = false;
      Analytics.track("tutorial_finish", { islandId: TUTORIAL_ISLAND_ID });
    }
  }

  private tickCannon(): void {
    if (!this.aiming || this.currentKind() !== "cannon") return;
    const tool = this.equippedTool();
    if (cannonHoldFire(true, Date.now() - this.lastFireAt, tool.cooldownMs)) {
      this.fire();
    }
  }

  private tickBoss(dt: number): void {
    this.boatIFrame = Math.max(0, this.boatIFrame - dt);
    if (!this.hazard) return;
    this.hazard.clear();
    const boss = this.liveBoss();
    if (!boss) return;
    const phases =
      ConfigService.islandById(this.launch.islandId).bossPhases ?? [];
    if (phases.length === 0) return;
    const phase = bossPhaseIndex(boss.toughnessRatio, phases);
    const move = bossMoveForPhase(phase);
    const interval = phaseInterval(phases, phase);
    const elapsed = this.runElapsed;
    const boat = this.player.position;
    if (move === "wave") {
      const beat = patternBeat(elapsed, interval);
      if (beat.telegraph && !this.lastTelegraph) this.waveY = boat.y;
      this.lastTelegraph = beat.telegraph;
      this.hazard.fillColor = new Color(
        255,
        beat.telegraph ? 210 : 70,
        80,
        beat.active ? 90 : beat.telegraph ? 55 : 28,
      );
      this.hazard.rect(-640, this.waveY - 36, 1240, 72);
      this.hazard.fill();
      this.hazard.strokeColor = new Color(
        255,
        beat.telegraph ? 220 : 90,
        90,
        beat.telegraph ? 200 : 230,
      );
      this.hazard.lineWidth = beat.active ? 10 : 5;
      this.hazard.moveTo(-620, this.waveY);
      this.hazard.lineTo(620, this.waveY);
      this.hazard.stroke();
      if (
        beat.active &&
        this.boatIFrame <= 0 &&
        waveHits(boat.y, this.waveY)
      ) {
        this.boatIFrame = 0.85;
        this.moveTarget.y = Math.max(
          -70,
          Math.min(80, boat.y + (boat.y >= this.waveY ? 48 : -48)),
        );
        this.burst("miss", boat.x, boat.y);
        this.setStatus("声浪擦过。左拖上下躲开。");
      }
      return;
    }
    if (move === "vortex") {
      boss.setPatternStun(0.35);
      const centers = [
        { x: -60, y: 36 },
        { x: 150, y: 64 },
      ];
      this.hazard.fillColor = new Color(80, 190, 230, 46);
      this.hazard.strokeColor = new Color(120, 210, 255, 220);
      this.hazard.lineWidth = 5;
      for (const center of centers) {
        this.hazard.circle(center.x, center.y, 72);
        this.hazard.fill();
        this.hazard.circle(center.x, center.y, 72);
        this.hazard.stroke();
      }
      if (
        this.boatIFrame <= 0 &&
        vortexHits(boat.x, boat.y, centers)
      ) {
        this.boatIFrame = 0.35;
        this.moveTarget.x = Math.min(-180, Math.max(-480, boat.x - 36));
        this.burst("miss", boat.x, boat.y);
        this.setStatus("旋涡拖船。横移离开圈，弱点更大。");
      }
      return;
    }
    const windows = rushWindows(elapsed, interval);
    if (windows.rushing) {
      this.hazard.strokeColor = new Color(255, 120, 80, 210);
      this.hazard.lineWidth = 8;
      this.hazard.moveTo(boss.node.position.x, boss.node.position.y);
      this.hazard.lineTo(this.player.position.x, boss.node.position.y);
      this.hazard.stroke();
      if (
        this.boatIFrame <= 0 &&
        Math.abs(boat.y - boss.node.position.y) < 52
      ) {
        this.boatIFrame = 0.7;
        this.moveTarget.set(-480, Math.max(-70, boat.y - 40), 0);
        this.burst("miss", boat.x, boat.y);
        this.setStatus("冲刺过来了。先躲开。");
      }
      this.lastOutput = false;
      return;
    }
    if (windows.output) {
      boss.setPatternStun(0.6);
      if (!this.lastOutput) this.setStatus("硬直窗口！弱点全开，快打。");
      this.lastOutput = true;
    } else {
      this.lastOutput = false;
    }
  }

  private syncBarButtons(): void {
    const input = this.barInput();
    const showCast = battleBarButtonVisible(input, "cast");
    const showPick = battleBarButtonVisible(input, "pickUp");
    const showDrop = battleInboxCtaVisible(input);
    if (this.castButton) this.castButton.active = showCast;
    if (this.reelButton) this.reelButton.active = showPick;
    if (this.dropButton) this.dropButton.active = showDrop;
    const castTone = this.barTone("cast");
    const pickTone = this.barTone("pickUp");
    if (this.castButton && showCast && castTone !== this.lastCastTone) {
      this.lastCastTone = castTone;
      paintButtonTone(this.castButton, castTone);
    }
    if (this.reelButton && showPick && pickTone !== this.lastPickTone) {
      this.lastPickTone = pickTone;
      paintButtonTone(this.reelButton, pickTone);
    }
  }

  private drawGuide(): void {
    this.syncBarButtons();
    this.guide.clear();
    if (!this.tutorial) return;
    const focus = tutorialGuideTarget(this.tutorialStep, {
      carrying: !!this.carried?.node.active,
    });
    const live =
      focus === "cast"
        ? this.castButton
        : focus === "pickUp"
          ? this.reelButton
          : focus === "return"
            ? this.leaveButton
            : undefined;
    const fallback = tutorialGuideAnchor(focus);
    const hooked = this.hooked?.node?.position;
    const x = live
      ? live.position.x
      : focus === "weakPoint" && hooked
        ? hooked.x
        : fallback?.x;
    const y = live
      ? live.position.y
      : focus === "weakPoint" && hooked
        ? hooked.y
        : fallback?.y;
    if (x == null || y == null) return;
    const ring = tutorialGuideRing(Date.now());
    const hole = (fallback?.radius ?? 78) + ring.pulse * 0.35;
    drawGuideHole(this.guide, x, y, hole, ring);
  }

  private returnHarbor(): void {
    this.noteInput();
    if (this.closing) return;
    if (this.tutorial && !tutorialCanLeave(this.tutorialStep)) {
      this.setStatus("先抛竿、打中、入箱，再回港卖。");
      return;
    }
    this.closing = true;
    this.deck?.dispose();
    this.deck = undefined;
    this.shots = [];
    this.hitStopLeft = 0;
    this.charging = false;
    this.chargeTarget = undefined;
    this.unbindPads();
    FishController.setPaused(false);
    const summary = this.session.finish();
    Analytics.track("run_finish", {
      coins: summary.totalCoins,
      count: summary.fish.length,
      multiplier: summary.bestMultiplier,
    });
    if (this.launch.onHarbor) {
      this.launch.onHarbor(summary);
      return;
    }
    this.setStatus("这局没有港口入口。");
  }

  private renderHud(): void {
    this.deck?.sync(
      this.player,
      this.fishRoot,
      this.hooked,
      this.aiming ? this.aimTo : undefined,
      {
        smashElapsed:
          this.shakeLeft > 0
            ? juiceShakeSeconds(this.lowPower) - this.shakeLeft
            : 1,
        lowPower: this.lowPower,
      },
    );
    if (!this.status) return;
    const preview = this.session.preview();
    const style = this.session.getStyleSnapshot();
    this.coinsLabel.string = `本局 ${preview.coins}`;
    this.multiplier.string = comboHud(style.multiplier, style.combo);
    if (
      styleHudShouldPunch(
        { multiplier: this.lastHudMultiplier, combo: this.lastHudCombo },
        { multiplier: style.multiplier, combo: style.combo },
      )
    ) {
      this.hudPunchElapsed = 0;
      this.hudPunchLeft = styleHudPunchSeconds(this.lowPower);
    }
    this.lastHudMultiplier = style.multiplier;
    this.lastHudCombo = style.combo;
    if (this.callout) {
      this.callout.string = Date.now() < this.calloutUntil ? this.callout.string : "";
    }
    if (this.hooked?.fishConfig) {
      const fish = this.hooked.fishConfig;
      const bits = [
        liveQuote(fish, style.multiplier),
        `韧性 ${this.hooked.remainingToughness}`,
        this.hooked.weakOpen ? "弱点亮" : "",
        fish.behavior === "shield"
          ? this.hooked.shieldOpen
            ? "甲缝开"
            : "甲壳闭"
          : "",
        fish.tier === "boss"
          ? `阶段${bossPhaseIndex(
              this.hooked.toughnessRatio,
              ConfigService.islandById(this.launch.islandId).bossPhases ?? [],
            ) + 1}`
          : "",
      ].filter(Boolean);
      this.fishName.string = bits.join(" · ");
    } else {
      this.fishName.string = this.hooked?.decoy ? "影子，换一条" : "等待抛竿";
    }
  }

  private burst(kind: JuiceKind, x: number, y: number): void {
    this.juice = this.juice.concat(spawnJuice(kind, x, y, this.lowPower));
    const flash = spawnJuiceFlash(kind, x, y, this.lowPower);
    if (flash) this.juiceFlash = flash;
    const punch = juicePunchSeconds(kind, this.lowPower);
    if (punch > 0) {
      this.punchKind = kind;
      this.punchElapsed = 0;
      this.punchLeft = punch;
    }
    const shake = juiceShakePx(kind, this.lowPower);
    if (shake > 0) {
      this.shakePx = shake;
      this.shakeLeft = juiceShakeSeconds(this.lowPower);
    }
    this.drawJuiceFx();
  }

  private tickJuiceFx(dt: number): void {
    this.juiceFlash = tickJuiceFlash(this.juiceFlash, dt);
    if (this.juice.length > 0) this.juice = tickJuice(this.juice, dt);
    this.tickCastFlash(dt);
    this.tickPunch(dt);
    this.tickShake(dt);
    if (
      this.juice.length === 0 &&
      !this.juiceFlash &&
      this.punchLeft <= 0 &&
      this.shakeLeft <= 0 &&
      this.cratePunchLeft <= 0 &&
      this.castFlashLeft <= 0 &&
      this.hudPunchLeft <= 0
    ) {
      if (this.juiceGfx) this.juiceGfx.clear();
      return;
    }
    this.drawJuiceFx();
  }

  private tickCastFlash(dt: number): void {
    if (this.castFlashLeft <= 0) {
      this.castFlashLeft = 0;
      return;
    }
    this.castFlashElapsed += dt;
    this.castFlashLeft = Math.max(0, this.castFlashLeft - dt);
    if (!this.player?.isValid) return;
    const scale =
      depthScale(this.player.position.y) *
      castRodScaleAt(
        this.castFlashElapsed,
        this.castFlashDuration,
        this.lowPower,
      );
    this.player.setScale(scale, scale, 1);
  }

  private tickPunch(dt: number): void {
    if (this.punchLeft > 0) {
      this.punchElapsed += dt;
      this.punchLeft = Math.max(0, this.punchLeft - dt);
      const scale = juicePunchScaleAt(
        this.punchKind,
        this.punchElapsed,
        this.lowPower,
      );
      this.callout?.node.setScale(scale, scale, 1);
      this.callout?.node.setPosition(0, this.calloutBaseY + popupLiftPx(this.punchElapsed));
    } else {
      this.callout?.node.setScale(1, 1, 1);
    }
    if (this.cratePunchLeft > 0) {
      this.cratePunchLeft = Math.max(0, this.cratePunchLeft - dt);
      const duration = juicePunchSeconds("catch", this.lowPower) || 0.16;
      const elapsed = duration - this.cratePunchLeft;
      const scale = crateBounceScaleAt(elapsed, this.lowPower);
      this.crateLabel?.node.setScale(scale, scale, 1);
      this.crateNode?.setScale(scale, scale, 1);
    } else if (this.crateLabel) {
      this.crateLabel.node.setScale(1, 1, 1);
      this.crateNode?.setScale(1, 1, 1);
    }
    if (this.hudPunchLeft > 0) {
      this.hudPunchElapsed += dt;
      this.hudPunchLeft = Math.max(0, this.hudPunchLeft - dt);
      const scale = styleHudPunchScaleAt(this.hudPunchElapsed, this.lowPower);
      const rgb = styleHudPunchRgb(this.hudPunchElapsed, this.lowPower);
      this.multiplier?.node.setScale(scale, scale, 1);
      if (this.multiplier) {
        this.multiplier.color = new Color(rgb[0], rgb[1], rgb[2], 255);
      }
    } else if (this.multiplier) {
      this.multiplier.node.setScale(1, 1, 1);
      this.multiplier.color = new Color(240, 250, 255, 255);
    }
  }

  private tickShake(dt: number): void {
    if (!this.layer?.isValid) return;
    if (this.shakeLeft <= 0) {
      this.layer.setPosition(0, 0, 0);
      return;
    }
    this.shakeLeft = Math.max(0, this.shakeLeft - dt);
    const shakeDur = juiceShakeSeconds(this.lowPower) || 0.08;
    const mag = this.shakePx * (this.shakeLeft / shakeDur);
    this.layer.setPosition((Math.random() - 0.5) * 2 * mag, (Math.random() - 0.5) * 2 * mag, 0);
  }

  private drawJuiceFx(): void {
    if (this.juiceGfx) {
      drawJuice(this.juiceGfx, this.juice, this.juiceFlash ? [this.juiceFlash] : []);
    }
  }

  private showCallout(value: string): void {
    if (!this.callout) return;
    this.callout.string = value;
    this.calloutUntil = Date.now() + calloutHoldMs();
    this.callout.node.setPosition(0, this.calloutBaseY);
  }

  private setStatus(value: string): void {
    if (this.status) this.status.string = value;
    this.renderHud();
  }
}
