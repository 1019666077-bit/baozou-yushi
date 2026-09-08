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
  toolFreshness,
  toolWeakRadiusScale,
} from "./domain/ToolFeel";
import {
  TUTORIAL_FISH_ID,
  TUTORIAL_WEAK_PAUSE_SECONDS,
  advanceTutorial,
  isTutorialRun,
  tutorialPrompt,
  type TutorialStep,
} from "./domain/TutorialFlow";
import { freshnessForDeckTime } from "./domain/Freshness";
import { freshnessHud } from "./domain/Freshness";
import {
  behaviorCue,
  bossPhaseIndex,
  decoyOffsets,
} from "./domain/FishBehavior";
import {
  comboHud,
  styleCallout,
} from "./domain/StyleCallout";
import {
  formatClock,
  runPhase,
  shouldSpawn,
  waveCaption,
} from "./domain/IslandClock";
import { canPickUp, crateDrop } from "./domain/FlopPhysics";
import { depthScale } from "./domain/DepthScale";
import { hitStopSeconds, spawnCap, shouldVibrate } from "./domain/GameFeel";
import {
  keepLiveShots,
  spawnShot,
  shotExpired,
  tickShot,
  type Shot,
} from "./domain/ShotFlight";
import {
  spawnJuice,
  tickJuice,
  type JuiceKind,
  type JuiceParticle,
} from "./domain/HitJuice";
import { SfxPlayer } from "./platform/SfxPlayer";
import { VISUAL_LIMITS } from "./domain/MarketArtStyle";
import { ensureCocosPlatform } from "./platform/CocosPlatformBootstrap";
import { platformAdapter } from "./platform/PlatformRuntime";
import { playerSave } from "./save/SaveService";
import {
  drawOcean,
  drawBoat,
  drawDock,
  makeButton,
  makeLabel,
  makePriceTag,
  replacePlayLayer,
} from "./ui/RuntimeUi";
import { drawJuice, drawShots } from "./ui/GrayArt";
import { DeckStage } from "./world/DeckStage";
import { deckFlag } from "./world/deckFlag";
import { DesktopBattleInput } from "./input/DesktopBattleInput";
import { styleGradeFor } from "./domain/StyleGrade";
import { PriceCalculator } from "./domain/PriceCalculator";
import {
  ENDLESS_ROUND_SECONDS,
  addEndlessEarnings,
  completeEndlessRound,
  createEndlessRun,
  endlessDifficulty,
  failEndlessRound,
  withdrawEndless,
  type EndlessRunState,
} from "./domain/EndlessTide";
import { adGrants } from "./monetization/AdGrantService";
import type { WeeklyRules } from "./domain/WeeklyChallenge";
import { SeededRandom } from "./domain/SeededRandom";

const { ccclass } = _decorator;

export interface PrototypeLaunch {
  islandId: string;
  toolId: string;
  challenge?: "weekly" | "endless";
  weeklyRules?: WeeklyRules;
  onHarbor?: (summary: RunSummary) => void;
}

@ccclass("RuntimePrototype")
export class RuntimePrototype extends Component {
  static pending?: PrototypeLaunch;

  private status!: Label;
  private multiplier!: Label;
  private coinsLabel!: Label;
  private fishName!: Label;
  private gradeTag!: Label;
  private quoteTag!: Label;
  private freshTag!: Label;
  private targetTag!: Label;
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
  private castButton?: Node;
  private reelButton?: Node;
  private guide!: Graphics;
  private hazard!: Graphics;
  private juiceGfx!: Graphics;
  private juice: JuiceParticle[] = [];
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
  private callout!: Label;
  private calloutUntil = 0;
  private lowPower = false;
  private vibration = true;
  private deck?: DeckStage;
  private desktopInput?: DesktopBattleInput;
  private desktopInputTracked = false;
  private desktopMoveX: -1 | 0 | 1 = 0;
  private desktopMoveY: -1 | 0 | 1 = 0;
  private endlessRound = 1;
  private endlessState: EndlessRunState = createEndlessRun();
  private endlessObservedCoins = 0;
  private weeklyRandom?: SeededRandom;
  private disposePlatformHidden?: () => void;
  private disposePlatformShown?: () => void;
  private runId = "";
  private bossRevives = 0;
  private bossReviveOffered = false;

  protected onLoad(): void {
    try {
      ensureCocosPlatform();
      if (!RuntimePrototype.pending) return;
      this.launch = RuntimePrototype.pending;
      RuntimePrototype.pending = undefined;
      ConfigService.ensureBundled();
      playerSave.loadLocal();
      const save = playerSave.get();
      this.tutorial = isTutorialRun(
        this.launch.islandId,
        save.tutorialComplete,
      );
      this.lowPower = save.settings.lowPower;
      this.vibration = save.settings.vibration;
      SfxPlayer.setEnabled(save.settings.sfx);
      FishController.setLowPower(this.lowPower);
      game.frameRate = this.lowPower ? 30 : 60;
      const toolLevel =
        this.launch.challenge === "weekly"
          ? 1
          : save.tools.find((entry) => entry.toolId === this.launch.toolId)
              ?.level ?? 1;
      this.runId = `run_${Date.now()}`;
      this.session = new RunSession(
        this.runId,
        this.launch.islandId,
        this.launch.toolId,
        toolLevel,
        Date.now(),
        {
          tutorial: this.tutorial,
          stylePointScale: ConfigService.remoteConfig().stylePointScale,
          economyScale: ConfigService.remoteConfig().economyScale,
        },
      );
      if (this.launch.weeklyRules) {
        this.weeklyRandom = new SeededRandom(this.launch.weeklyRules.seed);
      }
      this.buildView();
      this.bindDesktopInput();
      const platform = platformAdapter();
      this.disposePlatformHidden = platform.lifecycle.onHidden(() => {
        platform.gameplayStop();
        this.pauseForBlur();
        void Analytics.flush();
      });
      this.disposePlatformShown = platform.lifecycle.onShown(() => {
        platform.gameplayStart();
      });
      platform.gameplayStart();
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
    this.desktopInput?.unbind();
    this.desktopInput = undefined;
    this.disposePlatformHidden?.();
    this.disposePlatformShown?.();
    platformAdapter().gameplayStop();
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
    this.tickLandFx();
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
    this.tickWave(dt);
    this.tickBoss(dt);
    this.sortByDepth();
    this.drawGuide();
    this.tickJuiceFx(dt);
    this.renderHud();
  }

  private buildView(): void {
    this.layer = replacePlayLayer(this.node);
    this.layer.layer = this.node.layer;
    let deckOk = false;
    try {
      this.deck = DeckStage.mount(
        this.node,
        this.launch.islandId,
        playerSave.get().selectedCosmetics.boat,
      );
      deckOk = true;
    } catch (error) {
      console.error("DeckStage failed, using 2D seascape", error);
    }
    if (!deckOk) {
      drawOcean(this.layer, { islandId: this.launch.islandId });
      drawDock(this.layer, playerSave.get().selectedCosmetics.boat);
    }
    const island = ConfigService.islandById(this.launch.islandId);
    makeLabel(
      this.layer,
      this.launch.challenge === "endless"
        ? `${island.name} · 无尽潮`
        : this.launch.challenge === "weekly"
          ? `${island.name} · 周挑战`
          : `${island.name} · 潮汐猎场`,
      32,
      0,
      318,
    );
    this.multiplier = makeLabel(this.layer, "精彩 ×1.00", 22, -470, 318, 280);
    this.coinsLabel = makeLabel(this.layer, "本局 0", 22, 470, 318, 280);
    this.status = makeLabel(
      this.layer,
      this.tutorial
        ? tutorialPrompt("cast")
        : "抛竿拽上岸。在甲板上砸晕，搬进左边鱼箱。空中打更值钱。",
      20,
      0,
      268,
      1100,
    );
    this.fishName = makeLabel(this.layer, "等待抛竿", 24, 0, 228);
    this.callout = makeLabel(this.layer, "", 28, 0, 188, 900);
    this.callout.color = new Color(255, 236, 120, 255);
    this.clockLabel = makeLabel(this.layer, "热身潮 1:40", 20, -470, 268, 280);
    this.gradeTag = makePriceTag(this.layer, "C级", -490, 220, "level");
    this.quoteTag = makePriceTag(this.layer, "估价 --", 490, 220, "quote");
    this.freshTag = makePriceTag(this.layer, "新鲜度 --", 490, 158, "freshness");
    this.targetTag = makePriceTag(this.layer, "目标：等待鱼群", -490, 158, "target");
    makeLabel(this.layer, "鱼箱", 18, -520, -118, 120);

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
      drawBoat(boat, playerSave.get().selectedCosmetics.boat);
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

    this.castButton = makeButton(this.layer, "抛竿", -390, -292, () => this.cast());
    this.reelButton = makeButton(this.layer, "捡起", 390, -292, () => this.pickUp());
    makeButton(this.layer, "暂停", -530, 268, () => this.togglePause(), 150, 56, 22);
    makeButton(
      this.layer,
      this.launch.challenge === "endless" ? "撤离" : "回港",
      530,
      268,
      () => this.returnHarbor(),
      150,
      56,
      22,
    );
    if (this.launch.challenge === "endless") {
      makeButton(
        this.layer,
        "放弃本轮",
        360,
        268,
        () => this.returnHarbor(true),
        150,
        56,
        19,
      );
    }
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
      for (const offset of decoyOffsets(this.lowPower ? 1 : 2)) {
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
    return this.screenToLayer(loc.x, loc.y);
  }

  private screenToLayer(x: number, y: number): Vec3 {
    return new Vec3(x - 640, y - 360, 0);
  }

  private bindDesktopInput(): void {
    this.desktopInput = new DesktopBattleInput({
      aim: (x, y) => {
        this.trackDesktopInput();
        this.aimTo.set(this.screenToLayer(x, y));
      },
      aimStart: (x, y) => {
        this.trackDesktopInput();
        if (this.held()) return;
        this.aiming = true;
        this.aimStartedAt = Date.now();
        this.aimFrom.set(this.player.position);
        this.aimTo.set(this.screenToLayer(x, y));
      },
      aimEnd: (x, y) => {
        this.aimTo.set(this.screenToLayer(x, y));
        if (!this.aiming) return;
        this.aiming = false;
        if (this.currentKind() !== "cannon") this.fire();
      },
      cast: () => {
        this.trackDesktopInput();
        this.cast();
      },
      pickUp: () => {
        this.trackDesktopInput();
        this.pickUp();
      },
      move: (x, y) => {
        if (x !== 0 || y !== 0) this.trackDesktopInput();
        this.desktopMoveX = x;
        this.desktopMoveY = y;
      },
      pauseForBlur: () => this.pauseForBlur(),
    });
    this.desktopInput.bind();
  }

  private trackDesktopInput(): void {
    if (this.desktopInputTracked) return;
    this.desktopInputTracked = true;
    Analytics.track("input_scheme", { scheme: "desktop" });
  }

  private onMoveStart(event: EventTouch): void {
    if (this.held()) return;
    this.moving = true;
    this.onMove(event);
  }

  private onMove(event: EventTouch): void {
    if (!this.moving) return;
    const pos = this.toLayer(event);
    this.moveTarget.set(
      Math.min(-180, Math.max(-540, pos.x)),
      Math.min(80, Math.max(-70, pos.y)),
      0,
    );
  }

  private onAimStart(event: EventTouch): void {
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
    if (!this.held() && (this.desktopMoveX !== 0 || this.desktopMoveY !== 0)) {
      this.moveTarget.set(
        Math.min(-180, Math.max(-540, this.moveTarget.x + this.desktopMoveX * 260 * dt)),
        Math.min(80, Math.max(-70, this.moveTarget.y + this.desktopMoveY * 190 * dt)),
        0,
      );
    }
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

  private drawAim(): void {
    this.aimLine.clear();
    if (deckFlag.live) {
      drawShots(this.aimLine, this.shots, playerSave.get().selectedCosmetics.trail);
      return;
    }
    if (this.hooked?.yanking && this.hooked.node.active) {
      this.aimLine.strokeColor = new Color(255, 214, 70, 250);
      this.aimLine.lineWidth = 6;
      this.aimLine.moveTo(this.player.position.x + 28, this.player.position.y + 18);
      this.aimLine.lineTo(this.hooked.node.position.x, this.hooked.node.position.y);
      this.aimLine.stroke();
    }
    if (this.aiming) {
      const kind = this.currentKind();
      const charge = harpoonCharge(
        Date.now() - this.aimStartedAt,
        this.equippedTool(),
      );
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
    drawShots(this.aimLine, this.shots, playerSave.get().selectedCosmetics.trail);
  }

  private equippedTool(): ToolLevel {
    const save = playerSave.get();
    const owned = save.tools.find((entry) => entry.toolId === this.launch.toolId);
    const tool = ConfigService.toolById(owned?.toolId ?? this.launch.toolId);
    const level = this.launch.challenge === "weekly" ? 1 : owned?.level ?? 1;
    return tool.levels.find((item) => item.level === level) ?? tool.levels[0];
  }

  private cast(): void {
    if (this.held()) return;
    if (this.hooked) {
      this.setStatus(
        this.tutorial
          ? tutorialPrompt(this.tutorialStep)
          : "已经锁鱼，用右半屏瞄准开火。",
      );
      return;
    }
    const origin = this.player.position;
    const candidates = this.fishRoot.getComponentsInChildren(FishController)
      .filter((fish) => fish.node.active && !fish.decoy)
      .sort(
        (a, b) =>
          Vec3.distance(a.node.position, origin) -
          Vec3.distance(b.node.position, origin),
      );
    const target = this.tutorial
      ? candidates.find((fish) => fish.id === TUTORIAL_FISH_ID) ?? candidates[0]
      : candidates.find(
          (fish) =>
            Vec3.distance(fish.node.position, origin) <=
            (this.shownBoss ? 780 : 560),
        );
    if (!target) {
      this.setStatus("附近没有鱼，把船再靠近一点。");
      return;
    }
    this.hooked = target;
    this.hooked.setHooked(true);
    this.hookedAt = Date.now();
    Analytics.track("cast", {
      fishId: target.id,
      input: this.desktopInputTracked ? "desktop" : "touch",
    });
    this.reelActive = false;
    this.session.resetStyle();
    if (this.tutorial) {
      this.hooked.setAssist({
        freezeSeconds: TUTORIAL_WEAK_PAUSE_SECONDS,
        forceWeak: true,
        radiusScale: 1.8,
        damageScale: 1.5,
      });
      this.enterTutorial("hooked");
      return;
    }
    const name = target.fishConfig?.name ?? "目标";
    SfxPlayer.play("cast");
    this.setStatus(`拽住${name}。钓线绷着，等它摔上甲板再砸。`);
  }

  private fire(): void {
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
    const charge =
      kind === "harpoon"
        ? harpoonCharge(now - this.aimStartedAt, this.equippedTool())
        : 1;
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
      this.hooked.weakRadius() * toolWeakRadiusScale(this.equippedTool()),
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
          tool,
        ),
      },
    );
    this.session.addStyle({
      action: judged.weakPoint ? "weakPoint" : "combo",
      atMs: now,
      quality: judged.accuracy,
    });
    Analytics.track("style_action", {
      action: judged.weakPoint ? "weakPoint" : "combo",
      accuracy: judged.accuracy,
    });
    if (airborne) {
      this.session.addStyle({ action: "airborne", atMs: now });
      Analytics.track("style_action", { action: "airborne" });
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
    if (shouldVibrate(this.vibration, parts)) platformAdapter().vibrate();
    if (result.readyToReel) {
      if (this.tutorial && judged.weakPoint) this.enterTutorial("weakHit");
      else this.setStatus("砸晕了！点捡起，搬去左边鱼箱。");
    } else if (
      this.hooked.fishConfig?.behavior === "shield" &&
      !judged.weakPoint &&
      !this.hooked.shieldOpen
    ) {
      this.setStatus(
        `甲壳挡住了。等它转身露出缝再打。韧性 ${result.remainingToughness}`,
      );
    } else if (judged.weakPoint) {
      this.setStatus(`弱点击破！韧性 ${result.remainingToughness}`);
    } else {
      this.setStatus(`命中，韧性 ${result.remainingToughness}`);
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
      }
      if (fx.bounce) {
        this.burst("hit", fish.node.position.x, fish.node.position.y);
      }
    }
  }

  private tickCarry(): void {
    if (!this.carried?.node.active) {
      this.carried = undefined;
      return;
    }
    const p = this.player.position;
    this.carried.followCarry(p.x + 40, p.y + 30);
    if (crateDrop(this.carried.node.position.x, this.carried.node.position.y)) {
      this.stashCarried();
    }
  }

  private pickUp(): void {
    if (this.held()) return;
    if (this.carried) {
      this.setStatus("已经扛着一条。走到左边鱼箱丢掉。");
      return;
    }
    const near =
      (this.hooked?.pickable ? this.hooked : undefined) ??
      this.fishRoot
        .getComponentsInChildren(FishController)
        .find((fish) => fish.pickable && fish.node.active);
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
    if (this.tutorial) this.enterTutorial("pickedUp");
    else this.setStatus("扛上了。搬去左边鱼箱。");
  }

  private stashCarried(): void {
    const fish = this.carried;
    const captured = fish?.fishConfig;
    if (!fish || !captured) return;
    const atX = fish.node.position.x;
    const atY = fish.node.position.y;
    const airborneBag = fish.capturedFromAir;
    if (airborneBag) {
      this.session.addStyle({ action: "perfectReel", atMs: Date.now() });
      Analytics.track("style_action", { action: "perfectReel" });
    }
    const freshness = toolFreshness(
      freshnessForDeckTime(fish.deckSeconds, captured.escapeSeconds),
      this.equippedTool(),
    );
    const sold = this.session.capture(
      captured,
      freshness,
      Date.now(),
      ConfigService.remoteConfig().economyScale,
      { airborneCapture: airborneBag },
    );
    fish.node.active = false;
    fish.setHooked(false);
    this.carried = undefined;
    this.reelActive = false;
    this.reelBar.clear();
    Analytics.track("fish_captured", {
      fishId: captured.id,
      price: sold.price,
      multiplier: sold.styleMultiplier,
      stylePoints: sold.stylePoints,
      styleGrade: sold.styleGrade,
      captureChain: sold.captureChain,
      freshness: sold.freshness,
      deckSeconds: fish.deckSeconds,
    });
    Analytics.track("style_grade", {
      fishId: captured.id,
      grade: sold.styleGrade,
      points: sold.stylePoints,
      multiplier: sold.styleMultiplier,
    });
    Analytics.track("capture_chain_update", {
      grade: sold.styleGrade,
      chain: sold.captureChain,
    });
    Analytics.track("freshness_decision", {
      fishId: captured.id,
      band: sold.freshness >= 1 ? "fresh" : sold.freshness >= 0.75 ? "mid" : "urgent",
      freshness: sold.freshness,
      deckSeconds: fish.deckSeconds,
      price: sold.price,
    });
    this.burst(airborneBag ? "perfect" : "catch", atX, atY);
    this.showCallout(
      styleCallout({
        weakPoint: false,
        airborne: airborneBag,
        combo: 1,
        perfect: airborneBag,
      }),
    );
    SfxPlayer.play(airborneBag ? "perfect" : "catch");
    this.setStatus(
      `${captured.name} 鲜度×${sold.freshness.toFixed(2)} · 精彩×${sold.styleMultiplier.toFixed(2)} → ${sold.price}金，回港才卖。`,
    );
    if (this.tutorial) {
      this.enterTutorial("stored");
      this.returnHarbor();
      return;
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

  private pauseForBlur(): void {
    if (this.closing || this.paused || this.resumeLeft > 0) return;
    this.paused = true;
    this.pauseStartedAt = Date.now();
    this.aiming = false;
    this.moving = false;
    FishController.setPaused(true);
    this.setStatus("窗口失焦，已自动暂停。点暂停后3秒继续。");
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
    if (this.launch.challenge === "endless") {
      this.tickEndlessWave(dt, island);
      return;
    }
    if (this.launch.challenge === "weekly") {
      this.tickWeeklyWave(dt);
      return;
    }
    if (this.tutorial) {
      this.runElapsed += dt;
      if (this.clockLabel) this.clockLabel.string = "泡沫湾教学";
      if (this.liveCount() === 0 && this.tutorialStep !== "complete") {
        this.spawnFish(ConfigService.fishById(TUTORIAL_FISH_ID), 80, 10);
      }
      return;
    }
    this.runElapsed += dt;
    const snapshot = runPhase(this.runElapsed, island);
    if (this.clockLabel) {
      this.clockLabel.string = `${waveCaption(snapshot.phase, snapshot.waveIndex)} ${formatClock(snapshot.remaining)}`;
    }
    if (snapshot.phase === "over") {
      if (this.liveBoss()) {
        if (!this.bossReviveOffered && this.launch.challenge !== "weekly") {
          this.bossReviveOffered = true;
          makeButton(
            this.layer,
            "看广告延长Boss战",
            0,
            -250,
            () => void this.tryBossRevive(),
            300,
            62,
            21,
          );
        }
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
        SfxPlayer.play("bossWarn");
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
        snapshot.waveIndex === 0 ? "热身潮。拽上岸，砸晕，搬进鱼箱。" : "精英潮来了。",
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

  private async tryBossRevive(): Promise<void> {
    if (this.closing) return;
    const granted = await adGrants.reviveBoss(
      this.runId,
      this.bossRevives,
      this.launch.challenge === "weekly",
    );
    if (!granted) {
      this.setStatus("广告未完成，Boss战保持当前状态。");
      return;
    }
    this.bossRevives += 1;
    this.runElapsed = Math.max(0, this.runElapsed - 30);
    this.layer.getChildByName("看广告延长Boss战")?.destroy();
    this.setStatus("Boss战延长30秒。本局不会再次提供复活。");
  }

  private tickEndlessWave(
    dt: number,
    island: ReturnType<typeof ConfigService.islandById>,
  ): void {
    this.runElapsed += dt;
    const roundElapsed = this.runElapsed % ENDLESS_ROUND_SECONDS;
    const nextRound = Math.floor(this.runElapsed / ENDLESS_ROUND_SECONDS) + 1;
    if (nextRound > this.endlessRound) {
      this.captureEndlessEarnings();
      this.endlessState = completeEndlessRound(this.endlessState);
      this.endlessRound = nextRound;
      Analytics.track("endless_round", {
        round: this.endlessRound - 1,
        coins: this.session.preview().coins,
      });
      this.setStatus(`第${this.endlessRound - 1}轮收益已入箱。可继续或随时撤离。`);
    }
    const difficulty = endlessDifficulty(this.endlessRound);
    if (this.clockLabel) {
      this.clockLabel.string = `无尽第${this.endlessRound}轮 ${formatClock(
        ENDLESS_ROUND_SECONDS - roundElapsed,
      )}`;
    }
    const ids = island.waves.flatMap((wave) => wave.fishPool);
    const pool = Array.from(new Set(ids));
    this.spawnWait += dt;
    const interval = 3 * difficulty.spawnIntervalScale;
    if (
      pool.length === 0 ||
      !shouldSpawn(
        this.liveCount(),
        8,
        this.spawnWait,
        interval,
        spawnCap(this.lowPower),
      )
    ) return;
    this.spawnWait = 0;
    const id = pool[Math.floor(Math.random() * pool.length)];
    const config = ConfigService.fishById(id);
    this.spawnFish(
      {
        ...config,
        toughness: Math.round(config.toughness * difficulty.toughnessScale),
        speed: Math.round(config.speed * difficulty.speedScale),
      },
      80 + Math.random() * 280,
      -20 + Math.random() * 90,
    );
  }

  private tickWeeklyWave(dt: number): void {
    const rules = this.launch.weeklyRules;
    if (!rules || !this.weeklyRandom) {
      this.setStatus("周挑战规则缺失，已安全退出。");
      this.returnHarbor();
      return;
    }
    this.runElapsed += dt;
    const remaining = Math.max(0, rules.durationSeconds - this.runElapsed);
    if (this.clockLabel) {
      this.clockLabel.string = `周挑战 ${formatClock(remaining)}`;
    }
    if (remaining <= 0) {
      this.setStatus("周挑战结束，成绩已封存。");
      this.returnHarbor();
      return;
    }
    this.spawnWait += dt;
    if (
      rules.fishPool.length === 0 ||
      !shouldSpawn(
        this.liveCount(),
        7,
        this.spawnWait,
        2.8,
        spawnCap(this.lowPower),
      )
    ) return;
    this.spawnWait = 0;
    const id = this.weeklyRandom.pick(rules.fishPool);
    this.spawnFish(
      ConfigService.fishById(id),
      80 + this.weeklyRandom.next() * 280,
      -20 + this.weeklyRandom.next() * 90,
    );
  }

  private captureEndlessEarnings(): void {
    const total = this.session.preview().coins;
    const delta = Math.max(0, total - this.endlessObservedCoins);
    this.endlessObservedCoins = total;
    this.endlessState = addEndlessEarnings(this.endlessState, delta);
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

  private enterTutorial(event: "hooked" | "weakHit" | "pickedUp" | "stored"): void {
    this.tutorialStep = advanceTutorial(this.tutorialStep, event);
    this.setStatus(tutorialPrompt(this.tutorialStep));
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

  private drawGuide(): void {
    this.guide.clear();
    if (!this.tutorial) return;
    const target =
      this.tutorialStep === "cast"
        ? this.castButton
        : this.tutorialStep === "pickUp"
          ? this.reelButton
          : undefined;
    const pulse = 18 + Math.sin(Date.now() / 180) * 8;
    this.guide.strokeColor = new Color(255, 236, 120, 230);
    this.guide.lineWidth = 6;
    if (this.tutorialStep === "weakPoint" && this.hooked) {
      const weak = this.hooked.viewOffset();
      this.guide.circle(
        this.hooked.node.position.x + weak.x,
        this.hooked.node.position.y + weak.y,
        38 + pulse,
      );
      this.guide.stroke();
      return;
    }
    if (this.tutorialStep === "crate") {
      this.guide.circle(-520, -118, 74 + pulse);
      this.guide.stroke();
      return;
    }
    if (!target) return;
    this.guide.circle(target.position.x, target.position.y, 70 + pulse);
    this.guide.stroke();
  }

  private returnHarbor(endlessFailed = false): void {
    if (this.closing) return;
    this.closing = true;
    this.deck?.dispose();
    this.deck = undefined;
    this.shots = [];
    this.hitStopLeft = 0;
    this.unbindPads();
    this.desktopInput?.unbind();
    FishController.setPaused(false);
    let summary = this.session.finish();
    if (this.launch.challenge === "endless") {
      this.captureEndlessEarnings();
      this.endlessState = endlessFailed
        ? failEndlessRound(this.endlessState)
        : withdrawEndless(this.endlessState);
      summary = {
        ...summary,
        totalCoins: this.endlessState.bankedCoins,
        endlessRound: this.endlessState.round,
        endlessFailed,
      };
    }
    Analytics.track("run_finish", {
      coins: summary.totalCoins,
      count: summary.fish.length,
      multiplier: summary.bestMultiplier,
      bestGrade: summary.bestStyleGrade,
      bestCaptureChain: summary.bestCaptureChain,
      input: this.desktopInputTracked ? "desktop" : "touch",
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
    );
    if (!this.status) return;
    const preview = this.session.preview();
    const style = this.session.getStyleSnapshot();
    this.coinsLabel.string = `本局 ${preview.coins}`;
    this.multiplier.string = `${styleGradeFor(style.points)}级 · ${comboHud(style.multiplier, style.combo)}${preview.captureChain > 0 ? ` · 高光链${preview.captureChain}` : ""}`;
    this.gradeTag.string = `${styleGradeFor(style.points)}级`;
    if (this.callout) {
      this.callout.string = Date.now() < this.calloutUntil ? this.callout.string : "";
    }
    if (this.hooked?.fishConfig) {
      const fish = this.hooked.fishConfig;
      const freshness = freshnessForDeckTime(
        this.hooked.deckSeconds,
        fish.escapeSeconds,
      );
      const economyScale = ConfigService.remoteConfig().economyScale;
      const currentPrice = PriceCalculator.calculate(
        fish,
        freshness,
        style.multiplier,
        economyScale,
      ).total;
      const maxFreshPrice = PriceCalculator.calculate(
        fish,
        1.2,
        style.multiplier,
        economyScale,
      ).total;
      const bits = [
        behaviorCue(fish.behavior, {
          shieldOpen: this.hooked.shieldOpen,
          stunned: this.hooked.stunned,
        }),
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
      this.quoteTag.string = `实时估价 ${currentPrice}金`;
      this.freshTag.string = this.hooked.onDeck || this.hooked.carrying
        ? freshnessHud(
            this.hooked.deckSeconds,
            fish.escapeSeconds,
            currentPrice,
            maxFreshPrice,
          ).split(" · ")[0]
        : "新鲜度：入甲板后计时";
      this.targetTag.string = `目标：${fish.name} · 韧性${this.hooked.remainingToughness}`;
    } else {
      this.fishName.string = this.hooked?.decoy ? "影子，换一条" : "等待抛竿";
      this.quoteTag.string = "实时估价 --";
      this.freshTag.string = "新鲜度 --";
      this.targetTag.string = "目标：等待鱼群";
    }
  }

  private burst(kind: JuiceKind, x: number, y: number): void {
    const cap = this.lowPower
      ? VISUAL_LIMITS.maxJuiceParticles.lowPower
      : VISUAL_LIMITS.maxJuiceParticles.standard;
    this.juice = this.juice
      .concat(spawnJuice(kind, x, y, this.lowPower))
      .slice(-cap);
    this.drawJuiceFx();
  }

  private tickJuiceFx(dt: number): void {
    if (this.juice.length === 0) return;
    this.juice = tickJuice(this.juice, dt);
    this.drawJuiceFx();
  }

  private drawJuiceFx(): void {
    if (this.juiceGfx) {
      drawJuice(
        this.juiceGfx,
        this.juice,
        playerSave.get().selectedCosmetics.trail,
      );
    }
  }

  private showCallout(value: string): void {
    if (!this.callout) return;
    this.callout.string = value;
    this.calloutUntil = Date.now() + 1_400;
  }

  private setStatus(value: string): void {
    if (this.status) this.status.string = value;
    this.renderHud();
  }
}
