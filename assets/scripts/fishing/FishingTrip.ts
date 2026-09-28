/**
 * 一趟出海的状态机。规则调用 Bites / BiteController / Cast / CatchMinigame / GameState / SpotQuery。
 * 本身不画画面。预览页和 Cocos 的 FishingSession 都只读 `view`。
 *
 * 试饵提竿只提示。绿区固定 [0.3, 0.85]。只有收到 1.2 米以内才上鱼。
 */
import { BiteController } from "./BiteController";
import { chargePower } from "./Cast";
import { CatchMinigame } from "./CatchMinigame";
import { GameState } from "./GameState";
import { FUEL_PRICE, nextLevel, UPGRADES, type NextLevel } from "./Gear";
import {
  displayName,
  GUIDE_TIPS,
  levelLabel,
  rarityLabel,
  shopName,
  SHOP_KEYS,
  type ShopKey,
} from "./present";
import { habitatAt, type HabitatWeights } from "./Bites";
import {
  depthAt,
  pierDistance,
  reefDistance,
  sampleCast,
  SPOT_EYE,
  onFooting,
  STROLL_M,
  type SpotId,
  type WaypointId,
} from "./SpotQuery";
import { PERIODS, type PeriodId } from "./Waters";

export type TripPhase =
  | "dock"
  | "ready"
  | "charging"
  | "flying"
  | "waiting"
  | "nibbling"
  | "hook"
  | "fighting"
  | "card"
  | "miss";

const SPOT_NAME: { [id in SpotId]: string } = {
  beach: "沙滩",
  pier: "码头",
  boat: "船",
};

const WAYPOINT_NAME: { [id in WaypointId]: string } = {
  bay: "海湾",
  reef: "礁缘",
  deep: "深海",
};

export interface TripView {
  phase: TripPhase;
  spot: SpotId;
  spotName: string;
  waypoint: WaypointId;
  waypointName: string;
  periodId: PeriodId;
  periodName: string;
  power: number;
  reach: number;
  depth: number;
  bobX: number;
  bobZ: number;
  eyeX: number;
  eyeY: number;
  eyeZ: number;
  dip: number;
  notice: string;
  tension: number;
  bandLo: number;
  bandHi: number;
  distance: number;
  stamina: number;
  surge: number;
  reeling: boolean;
  species: string;
  speciesName: string;
  kg: number;
  cm: number;
  value: number;
  rarity: string;
  kept: boolean;
  isNew: boolean;
  isRecord: boolean;
  prevBestKg: number;
  prevBestCm: number;
  coins: number;
  holdKg: number;
  holdCap: number;
  holdCount: number;
  holdValue: number;
  lineKg: number;
  reelSpeed: number;
  castM: number;
  rodLevel: number;
  fuelL: number;
  fuelCap: number;
  finder: boolean;
  deckLights: boolean;
  hour: number;
  cardLeft: number;
  finderDepth: number;
  finderSignal: number;
  hint: string;
  fightCall: string;
  guideOpen: boolean;
  guideStep: number;
  tip: string;
}

export interface ShopRow {
  key: ShopKey;
  name: string;
  level: number;
  maxLevel: number;
  currentLabel: string;
  nextLabel: string | null;
  nextCost: number | null;
  affordable: boolean;
}

export interface LogRow {
  id: string;
  name: string;
  count: number;
  bestKg: number;
  bestCm: number;
  rarity: string;
}

export interface HoldRow {
  id: number;
  species: string;
  name: string;
  kg: number;
  cm: number;
  value: number;
  record: boolean;
}

function blankView(): TripView {
  return {
    phase: "dock",
    spot: "pier",
    spotName: "码头",
    waypoint: "bay",
    waypointName: "海湾",
    periodId: "dusk",
    periodName: "黄昏",
    power: 0,
    reach: 0,
    depth: 0,
    bobX: 55,
    bobZ: 42,
    eyeX: SPOT_EYE.pier.x,
    eyeY: SPOT_EYE.pier.y,
    eyeZ: SPOT_EYE.pier.z,
    dip: 0,
    notice: "",
    tension: 0,
    bandLo: 0.3,
    bandHi: 0.85,
    distance: 0,
    stamina: 1,
    surge: 0,
    reeling: false,
    species: "",
    speciesName: "",
    kg: 0,
    cm: 0,
    value: 0,
    rarity: "",
    kept: false,
    isNew: false,
    isRecord: false,
    prevBestKg: 0,
    prevBestCm: 0,
    coins: 0,
    holdKg: 0,
    holdCap: 30,
    holdCount: 0,
    holdValue: 0,
    lineKg: 7,
    reelSpeed: 1.1,
    castM: 22,
    rodLevel: 0,
    fuelL: 40,
    fuelCap: 40,
    finder: false,
    deckLights: false,
    hour: 16.2,
    cardLeft: 0,
    finderDepth: 0,
    finderSignal: 0,
    hint: "",
    fightCall: "",
    guideOpen: false,
    guideStep: 0,
    tip: "",
  };
}

export class FishingTrip {
  readonly state: GameState;
  readonly view: TripView = blankView();
  private readonly rng: () => number;
  private readonly bites: BiteController;
  private phase: TripPhase = "dock";
  private spot: SpotId = "pier";
  private waypoint: WaypointId = "bay";
  private period: PeriodId = "dusk";
  private hour = 16.2;
  private aimYaw = 0;
  private splashLine = 0;
  private cardLeft = 0;
  private finderClock = 0;
  private finderDepth = 0;
  private finderSignal = 0;
  private held = false;
  private power = 0;
  private reach = 0;
  private depth = 0;
  private bobX = 55;
  private bobZ = 42;
  private notice = "";
  private noticeLeft = 0;
  private fight: CatchMinigame | null = null;
  private landedDistance = 0;
  private landedStamina = 1;
  private dirty = false;
  private guideStep = 0;
  private tip = "";
  private tipLeft = 0;
  private feetX = SPOT_EYE.pier.x;
  private feetZ = SPOT_EYE.pier.z;

  constructor(opts: { state?: GameState; rng?: () => number; money?: number } = {}) {
    this.rng = opts.rng ?? Math.random;
    this.state = opts.state ?? new GameState();
    if (opts.money !== undefined) this.state.money = Math.max(0, opts.money);
    this.bites = new BiteController(this.rng, "hint");
    this.publish();
  }

  consumeDirty(): boolean {
    const dirty = this.dirty;
    this.dirty = false;
    return dirty;
  }

  uiKey(): string {
    const card = this.state.lastCatch;
    return [
      this.phase,
      this.spot,
      this.waypoint,
      this.period,
      this.notice,
      this.tip,
      this.state.guideIntro ? 1 : 0,
      this.guideStep,
      card?.species ?? "",
      card?.kept ? 1 : 0,
      this.state.inventory.length,
      this.state.money,
      this.state.upgrades.line,
      this.state.upgrades.hold,
    ].join("|");
  }

  setSpot(id: SpotId): void {
    if (this.phase !== "dock" && this.phase !== "ready" && this.phase !== "miss") return;
    this.spot = id;
    this.feetX = SPOT_EYE[id].x;
    this.feetZ = SPOT_EYE[id].z;
    if (this.phase === "miss") this.phase = "ready";
    if (id === "boat" && this.state.markTip("boat")) this.showTip("boat");
    this.publish();
  }

  setWaypoint(id: WaypointId): void {
    if (this.spot !== "boat") return;
    if (this.phase !== "dock" && this.phase !== "ready" && this.phase !== "miss") return;
    if (id !== this.waypoint) {
      const burned = this.state.burn(2);
      if (burned <= 0 && this.state.fuelL <= 0) this.flash("没油了，去玛塔那里加柴油");
    }
    this.waypoint = id;
    if (this.phase === "miss") this.phase = "ready";
    this.publish();
  }

  setPeriod(id: PeriodId): void {
    if (this.phase !== "dock" && this.phase !== "ready" && this.phase !== "miss") return;
    this.period = id;
    this.hour = PERIODS[id].hour;
    if (this.phase === "miss") this.phase = "ready";
    this.publish();
  }

  /**
   * 沙滩和码头上走。船不走。只能踩干沙或木面，离开锚点太远就停。
   * 缩小后的岛上，从码头可以走到乔和玛塔。
   */
  moveFeet(dx: number, dz: number): void {
    if (this.spot === "boat") return;
    if (this.phase !== "dock" && this.phase !== "ready" && this.phase !== "miss") return;
    if (!Number.isFinite(dx) || !Number.isFinite(dz)) return;
    const anchor = SPOT_EYE[this.spot];
    let x = this.feetX + dx;
    let z = this.feetZ + dz;
    const ox = x - anchor.x;
    const oz = z - anchor.z;
    const dist = Math.hypot(ox, oz);
    if (dist > STROLL_M) {
      x = anchor.x + (ox / dist) * STROLL_M;
      z = anchor.z + (oz / dist) * STROLL_M;
    }
    if (!onFooting(x, z)) return;
    this.feetX = x;
    this.feetZ = z;
    this.publish();
  }

  /** 左右滑动，大约 ±25°。抛投方向跟着镜头转。 */
  setAimYaw(yaw: number): void {
    const limit = 25 * Math.PI / 180;
    this.aimYaw = Math.min(limit, Math.max(-limit, yaw));
  }

  toDock(): void {
    this.phase = "dock";
    this.fight = null;
    this.bites.reset();
    this.held = false;
    this.publish();
  }

  toReady(): void {
    if (!this.state.guideIntro) {
      this.guideStep = 0;
      this.publish();
      return;
    }
    this.phase = "ready";
    this.fight = null;
    this.bites.reset();
    this.power = 0;
    this.held = false;
    this.notice = "";
    this.noticeLeft = 0;
    if (this.state.markTip("rodOut")) this.showTip("rodOut");
    this.publish();
  }

  nextGuide(): void {
    if (this.state.guideIntro) return;
    this.guideStep += 1;
    if (this.guideStep >= 3) {
      this.state.guideIntro = true;
      this.dirty = true;
      this.guideStep = 0;
    }
    this.publish();
  }

  skipGuide(): void {
    if (this.state.guideIntro) return;
    this.state.guideIntro = true;
    this.dirty = true;
    this.guideStep = 0;
    this.publish();
  }

  replayGuide(): void {
    this.state.guideIntro = false;
    this.state.guideTips = [];
    this.guideStep = 0;
    this.tip = "";
    this.dirty = true;
    this.publish();
  }

  setHeld(next: boolean): void {
    if (!this.state.guideIntro) return;
    if (next === this.held) return;
    this.held = next;
    if (next) this.onPress();
    else this.onRelease();
    this.publish();
  }

  tick(dt: number): void {
    let left = Math.max(0, dt);
    while (left > 1e-8) {
      const step = Math.min(left, 0.05);
      this.step(step);
      left -= step;
    }
    this.publish();
  }

  sellOne(id: number): { total: number; count: number } {
    return this.finishSale(this.state.sell([id]));
  }

  sellAll(): { total: number; count: number } {
    return this.finishSale(this.state.sell(null));
  }

  releaseFish(id: number): void {
    this.state.release(id);
    this.dirty = true;
    this.publish();
  }

  buy(key: ShopKey): NextLevel | null {
    const next = this.state.buy(key);
    if (!next) this.flash("金币不够，或已经满级");
    else {
      this.dirty = true;
      this.flash(`${shopName(key)} → ${levelLabel(key, next.index)}`);
    }
    this.publish();
    return next;
  }

  refuel(): number {
    const litres = this.state.refuel();
    if (litres > 0) {
      this.dirty = true;
      this.flash(`加了 ${litres.toFixed(0)} 升柴油`);
    } else this.flash("油是满的，或金币不够");
    this.publish();
    return litres;
  }

  shopRows(): ShopRow[] {
    return SHOP_KEYS.map((key) => {
      const level = this.state.upgrades[key] | 0;
      const next = nextLevel(this.state.upgrades, key);
      return {
        key,
        name: shopName(key),
        level,
        maxLevel: UPGRADES[key].levels.length - 1,
        currentLabel: levelLabel(key, level),
        nextLabel: next ? levelLabel(key, next.index) : null,
        nextCost: next ? next.cost : null,
        affordable: !!next && next.cost <= this.state.money,
      };
    });
  }

  holdRows(): HoldRow[] {
    return this.state.inventory.map((fish) => ({
      id: fish.id,
      species: fish.species,
      name: displayName(fish.species),
      kg: fish.kg,
      cm: fish.cm,
      value: fish.value,
      record: fish.record,
    }));
  }

  logRows(): LogRow[] {
    const rows: LogRow[] = [];
    for (const id of Object.keys(this.state.log)) {
      const entry = this.state.log[id];
      rows.push({
        id,
        name: displayName(id),
        count: entry.count,
        bestKg: entry.bestKg,
        bestCm: entry.bestCm ?? 0,
        rarity: rarityLabel(id),
      });
    }
    return rows;
  }

  fuelPrice(): number {
    return FUEL_PRICE;
  }

  private finishSale(result: { total: number; count: number }): { total: number; count: number } {
    if (result.count > 0) {
      this.dirty = true;
      this.flash(`卖出 ${result.count} 条，+${result.total} 金`);
    } else this.flash("冷藏箱是空的");
    this.publish();
    return result;
  }

  private showTip(id: string): void {
    this.tip = GUIDE_TIPS[id] ?? "";
    this.tipLeft = 7;
  }

  private onPress(): void {
    if (this.phase === "card") {
      this.toReady();
      return;
    }
    if (this.phase === "ready") {
      this.phase = "charging";
      this.power = 0;
      return;
    }
    if (this.phase === "waiting") {
      this.flash("还没咬钩");
      return;
    }
    if (this.phase === "nibbling") {
      this.flash("还没到，等它拉下去");
      return;
    }
    if (this.phase === "hook") this.hookSet();
  }

  private onRelease(): void {
    if (this.phase === "charging") this.cast();
  }

  private cast(): void {
    const stats = this.state.stats;
    const eye = this.eye();
    const sample = sampleCast(this.spot, this.waypoint, this.power, stats.castM, this.aimYaw, { x: eye.x, z: eye.z });
    this.reach = sample.reach;
    this.depth = sample.depth;
    this.bobX = sample.x;
    this.bobZ = sample.z;
    this.splashLine = 0;
    this.phase = "flying";
  }

  /** 浮标落水后才开始计咬钩。落在干沙滩、码头木面或水深不到 0.25 米就收回。 */
  bobberLanded(lineOut: number, depth: number, x?: number, z?: number): void {
    if (this.phase !== "flying") return;
    this.splashLine = Math.max(0, lineOut);
    const placed = x !== undefined && z !== undefined;
    const landDepth = placed ? depthAt(x, z) : depth;
    if (placed) {
      this.bobX = x;
      this.bobZ = z;
    }
    this.depth = landDepth;
    if (landDepth < 0.25) {
      this.fail("落到沙滩上了");
      this.publish();
      return;
    }
    const habitat = placed ? this.habitatAtSplash(x, z, landDepth) : this.castHabitat();
    const delay = this.bites.start(habitat, this.hour);
    if (!Number.isFinite(delay)) {
      this.fail("这片水里没有鱼");
      this.publish();
      return;
    }
    this.phase = "waiting";
    this.publish();
  }

  private castHabitat() {
    const eye = this.eye();
    return sampleCast(this.spot, this.waypoint, this.power, this.state.stats.castM, this.aimYaw, { x: eye.x, z: eye.z }).habitat;
  }

  private habitatAtSplash(x: number, z: number, depth: number): HabitatWeights {
    if (this.spot === "boat") return this.castHabitat();
    return habitatAt({ depth, reefDist: reefDistance(x, z), pierDist: pierDistance(x, z) });
  }

  private hookSet(): void {
    const hooked = this.bites.consumeHook();
    if (!hooked) return;
    const stats = this.state.stats;
    this.fight = new CatchMinigame({
      species: hooked.species,
      kg: hooked.kg,
      lineKg: stats.lineKg,
      reelSpeed: stats.reelSpeed,
      distance: Math.max(3, this.splashLine),
      rng: this.rng,
    });
    this.phase = "fighting";
    if (this.state.markTip("fishOn")) this.showTip("fishOn");
  }

  private step(dt: number): void {
    if (this.tipLeft > 0) {
      this.tipLeft = Math.max(0, this.tipLeft - dt);
      if (this.tipLeft === 0) this.tip = "";
    }
    if (this.noticeLeft > 0 && this.phase !== "miss" && this.phase !== "card") {
      this.noticeLeft = Math.max(0, this.noticeLeft - dt);
      if (this.noticeLeft === 0) this.notice = "";
    }
    if (this.phase === "charging" && this.held) this.power = chargePower(this.power, dt);
    if (this.phase === "card") {
      this.cardLeft = Math.max(0, this.cardLeft - dt);
      if (this.cardLeft === 0) this.toReady();
    }
    if (this.spot === "boat" && this.state.stats.finder) {
      this.finderClock += dt;
      if (this.finderClock >= 0.5) {
        this.finderClock = 0;
        const sample = sampleCast("boat", this.waypoint, 0, this.state.stats.castM);
        this.finderDepth = sample.depth;
        let rich = 0;
        for (const key of Object.keys(sample.habitat)) rich += sample.habitat[key as keyof typeof sample.habitat];
        this.finderSignal = Math.min(1, rich / 1.4);
      }
    }
    if (this.phase === "waiting" || this.phase === "nibbling" || this.phase === "hook") {
      const event = this.bites.update(dt);
      if (event === "nibble") {
        this.phase = "nibbling";
        if (this.state.markTip("nibble")) this.showTip("nibble");
      } else if (event === "take") this.phase = "hook";
      else if (event === "wait") this.phase = "waiting";
      else if (event === "ran") this.fail("太晚了，鱼跑了");
      else if (event === "empty") this.flash("这里暂时没有鱼");
    }
    const fight = this.fight;
    if (this.phase === "fighting" && fight) {
      const outcome = fight.update(dt, this.held);
      if (outcome === "caught") this.land(fight);
      else if (outcome === "snapped") this.fail("线断了");
      else if (outcome === "escaped") this.fail("脱钩了");
    }
  }

  private land(fight: CatchMinigame): void {
    this.landedDistance = fight.distance;
    this.landedStamina = fight.stamina;
    this.state.addFish(fight.species, fight.kg, this.hour);
    this.fight = null;
    this.held = false;
    this.phase = "card";
    this.cardLeft = 9;
    this.dirty = true;
    const card = this.state.lastCatch;
    this.notice = card?.kept ? "进冷藏箱了" : "鱼舱满了，已放生（图鉴记下了）";
    this.noticeLeft = 0;
    if (card?.kept && this.state.markTip("caught")) this.showTip("caught");
    if (!card?.kept && this.state.markTip("full")) this.showTip("full");
  }

  private fail(message: string): void {
    this.fight = null;
    this.bites.reset();
    this.held = false;
    this.phase = "miss";
    this.notice = message;
    this.noticeLeft = 0;
  }

  private flash(message: string): void {
    this.notice = message;
    this.noticeLeft = 1.6;
  }

  private eye(): { x: number; y: number; z: number } {
    if (this.spot === "boat") {
      const sample = sampleCast("boat", this.waypoint, 0, 22);
      return { x: sample.x, y: 2.2, z: sample.z - 6 };
    }
    const stand = SPOT_EYE[this.spot];
    return { x: this.feetX, y: stand.y, z: this.feetZ };
  }

  private publish(): void {
    const stats = this.state.stats;
    const card = this.phase === "card" ? this.state.lastCatch : null;
    const species = card?.species || this.fight?.species || this.bites.species || "";
    const eye = this.eye();
    const view = this.view;
    view.phase = this.phase;
    view.spot = this.spot;
    view.spotName = SPOT_NAME[this.spot];
    view.waypoint = this.waypoint;
    view.waypointName = WAYPOINT_NAME[this.waypoint];
    view.periodId = this.period;
    view.periodName = PERIODS[this.period].name;
    view.power = this.power;
    view.reach = this.reach;
    view.depth = this.depth;
    view.bobX = this.bobX;
    view.bobZ = this.bobZ;
    view.eyeX = eye.x;
    view.eyeY = eye.y;
    view.eyeZ = eye.z;
    view.dip = this.bites.dip;
    view.notice = this.notice;
    view.tension = this.fight?.tension ?? 0.3;
    view.bandLo = this.fight?.band[0] ?? 0.3;
    view.bandHi = this.fight?.band[1] ?? 0.85;
    view.distance = this.fight?.distance ?? this.landedDistance;
    view.stamina = this.fight?.stamina ?? this.landedStamina;
    view.surge = this.fight?.surge ?? 0;
    view.reeling = this.phase === "fighting" && this.held;
    view.species = species;
    view.speciesName = species ? displayName(species) : "";
    view.kg = card?.kg ?? this.fight?.kg ?? this.bites.kg ?? 0;
    view.cm = card?.cm ?? 0;
    view.value = card?.value ?? 0;
    view.rarity = species ? rarityLabel(species) : "";
    view.kept = !!card?.kept;
    view.isNew = !!card?.newSpecies;
    view.isRecord = !!card?.record;
    view.prevBestKg = card?.prevBestKg ?? 0;
    view.prevBestCm = card?.prevBestCm ?? 0;
    view.coins = this.state.money;
    view.holdKg = this.state.holdKg;
    view.holdCap = stats.holdKg;
    view.holdCount = this.state.inventory.length;
    view.holdValue = this.state.holdValue;
    view.lineKg = stats.lineKg;
    view.reelSpeed = stats.reelSpeed;
    view.castM = stats.castM;
    view.rodLevel = this.state.upgrades.rod | 0;
    view.fuelL = this.state.fuelL;
    view.fuelCap = stats.fuelL;
    view.finder = !!stats.finder;
    view.deckLights = !!stats.deckLights;
    view.hour = this.hour;
    view.cardLeft = this.phase === "card" ? this.cardLeft : 0;
    view.finderDepth = this.finderDepth;
    view.finderSignal = this.finderSignal;
    view.hint = this.hintFor();
    view.fightCall = this.fightCall();
    view.guideOpen = !this.state.guideIntro;
    view.guideStep = this.guideStep;
    view.tip = this.tip;
  }

  private fightCall(): string {
    const fight = this.fight;
    if (!fight || this.phase !== "fighting") return "";
    if (fight.tension > 0.88) return "松手！";
    if (fight.surge > 0.55) return "它在冲！";
    if (fight.tension < 0.15) return "线松了！";
    if (fight.tension >= fight.band[0] && fight.tension <= fight.band[1]) return "力度正好";
    return "收线";
  }

  private hintFor(): string {
    if (!this.state.guideIntro) return "点下一步，或跳过";
    if (this.notice && (this.phase === "miss" || this.noticeLeft > 0) && this.phase !== "card") return this.notice;
    switch (this.phase) {
      case "dock": return "卖鱼、升级，再拿出鱼竿";
      case "ready": return "按住蓄力，松手抛投";
      case "charging": return "松手抛出，按越久越远";
      case "flying": return "浮标还在飞";
      case "waiting": return "等浮标被拉下去";
      case "nibbling": return "有东西在碰饵，先别提竿";
      case "hook": return "提竿！";
      case "fighting": return this.view.tension > 0.88 ? "拉力太大，松手" : "按住收线，变红就松手";
      case "card": return "点一下继续，或等它自己收起";
      case "miss": return this.notice;
      default: return "";
    }
  }
}
