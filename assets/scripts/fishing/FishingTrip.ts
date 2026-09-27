/**
 * 一趟出海的状态机。规则调用 Bites / BiteController / Cast / CatchMinigame / GameState，
 * 本身不画画面。预览页和 Cocos 的 FishingSession 都只读 `view`。
 *
 * 和 tidewater 的差别（见 docs/FISHING_CORE.md）：
 * - 试饵时提竿会跑鱼（源逻辑只提示）
 * - 体力耗尽也上岸（源逻辑只在距离 < 1.2m 时上岸）
 * - 鱼竿等级加宽绿区（0 级仍是 [0.3, 0.85]）
 */
import { BiteController } from "./BiteController";
import { castReach, chargePower } from "./Cast";
import { CatchMinigame } from "./CatchMinigame";
import { GameState } from "./GameState";
import { nextLevel, UPGRADES, type NextLevel } from "./Gear";
import { displayName, levelLabel, rarityLabel, shopName, SHOP_KEYS, type ShopKey } from "./present";
import { greenBand } from "./RodBand";
import { PERIODS, spotAlong, WATERS, type PeriodId, type WaterId } from "./Waters";
import { habitatAt } from "./Bites";

export type TripPhase =
  | "dock"
  | "ready"
  | "charging"
  | "waiting"
  | "nibbling"
  | "hook"
  | "fighting"
  | "card"
  | "miss";

export interface TripView {
  phase: TripPhase;
  waterId: WaterId;
  waterName: string;
  periodId: PeriodId;
  periodName: string;
  power: number;
  reach: number;
  depth: number;
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
  coins: number;
  holdKg: number;
  holdCap: number;
  holdCount: number;
  lineKg: number;
  reelSpeed: number;
  castM: number;
  rodLevel: number;
  hint: string;
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

function blankView(): TripView {
  return {
    phase: "dock",
    waterId: "pier",
    waterName: "码头",
    periodId: "day",
    periodName: "白天",
    power: 0,
    reach: 0,
    depth: 0,
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
    coins: 0,
    holdKg: 0,
    holdCap: 30,
    holdCount: 0,
    lineKg: 7,
    reelSpeed: 1.1,
    castM: 22,
    rodLevel: 0,
    hint: "",
  };
}

export class FishingTrip {
  readonly state: GameState;
  readonly view: TripView = blankView();
  private readonly rng: () => number;
  private readonly bites: BiteController;
  private phase: TripPhase = "dock";
  private water: WaterId = "pier";
  private period: PeriodId = "day";
  private held = false;
  private power = 0;
  private reach = 0;
  private depth = 0;
  private notice = "";
  private noticeLeft = 0;
  private fight: CatchMinigame | null = null;
  private landedDistance = 0;
  private landedStamina = 1;
  private dirty = false;

  constructor(opts: { state?: GameState; rng?: () => number; money?: number } = {}) {
    this.rng = opts.rng ?? Math.random;
    this.state = opts.state ?? new GameState();
    if (opts.money !== undefined) this.state.money = Math.max(0, opts.money);
    this.bites = new BiteController(this.rng, "spook");
    this.publish();
  }

  consumeDirty(): boolean {
    const dirty = this.dirty;
    this.dirty = false;
    return dirty;
  }

  uiKey(): string {
    const upgrades = this.state.upgrades;
    const card = this.state.lastCatch;
    return [
      this.phase,
      this.water,
      this.period,
      this.notice,
      card?.species ?? "",
      card?.kept ? 1 : 0,
      upgrades.line,
      upgrades.reel,
      upgrades.rod,
      upgrades.hold,
      this.state.inventory.length,
      this.state.money,
    ].join("|");
  }

  setWater(id: WaterId): void {
    if (this.phase !== "dock" && this.phase !== "ready") return;
    this.water = id;
    this.publish();
  }

  setPeriod(id: PeriodId): void {
    if (this.phase !== "dock" && this.phase !== "ready") return;
    this.period = id;
    this.publish();
  }

  toDock(): void {
    this.phase = "dock";
    this.fight = null;
    this.bites.reset();
    this.held = false;
    this.publish();
  }

  toReady(): void {
    this.phase = "ready";
    this.fight = null;
    this.bites.reset();
    this.power = 0;
    this.held = false;
    this.notice = "";
    this.noticeLeft = 0;
    this.publish();
  }

  setHeld(next: boolean): void {
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

  sellAll(): { total: number; count: number } {
    const result = this.state.sell(null);
    if (result.count > 0) {
      this.dirty = true;
      this.flash(`卖出 ${result.count} 条，+${result.total} 金`);
    } else {
      this.flash("冷藏箱是空的");
    }
    this.publish();
    return result;
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

  private onPress(): void {
    if (this.phase === "ready") {
      this.phase = "charging";
      this.power = 0;
      return;
    }
    if (this.phase === "waiting") {
      if (this.bites.strike() === "ignore") this.flash("还没咬钩");
      return;
    }
    if (this.phase === "nibbling") {
      const result = this.bites.strike();
      if (result === "spook") this.fail("提竿太早，鱼跑了");
      else if (result === "hint") this.flash("先别提，等它拉下去");
      return;
    }
    if (this.phase === "hook") this.hookSet();
  }

  private onRelease(): void {
    if (this.phase === "charging") this.cast();
  }

  private cast(): void {
    const stats = this.state.stats;
    this.reach = castReach(stats.castM, this.power);
    const spot = spotAlong(this.water, this.power);
    this.depth = spot.depth;
    const delay = this.bites.start(habitatAt(spot), PERIODS[this.period].hour);
    if (!Number.isFinite(delay)) {
      this.fail("这片水里没有鱼");
      return;
    }
    this.phase = "waiting";
  }

  private hookSet(): void {
    const hooked = this.bites.consumeHook();
    if (!hooked) return;
    const stats = this.state.stats;
    const fight = new CatchMinigame({
      species: hooked.species,
      kg: hooked.kg,
      lineKg: stats.lineKg,
      reelSpeed: stats.reelSpeed,
      distance: Math.max(3, this.reach),
      rng: this.rng,
    });
    fight.band = greenBand(this.state.upgrades.rod | 0);
    this.fight = fight;
    this.phase = "fighting";
  }

  private step(dt: number): void {
    if (this.noticeLeft > 0 && this.phase !== "miss" && this.phase !== "card") {
      this.noticeLeft = Math.max(0, this.noticeLeft - dt);
      if (this.noticeLeft === 0) this.notice = "";
    }
    if (this.phase === "charging" && this.held) {
      this.power = chargePower(this.power, dt);
    }
    if (this.phase === "waiting" || this.phase === "nibbling" || this.phase === "hook") {
      const event = this.bites.update(dt);
      if (event === "nibble") this.phase = "nibbling";
      else if (event === "take") this.phase = "hook";
      else if (event === "wait") this.phase = "waiting";
      else if (event === "ran") this.fail("太晚了，鱼跑了");
      else if (event === "empty") this.flash("这里暂时没有鱼");
    }
    const fight = this.fight;
    if (this.phase === "fighting" && fight) {
      let outcome = fight.update(dt, this.held);
      if (outcome === "fighting" && fight.stamina <= 0) outcome = "caught";
      if (outcome === "caught") this.land(fight);
      else if (outcome === "snapped") this.fail("线断了");
      else if (outcome === "escaped") this.fail("脱钩了");
    }
  }

  private land(fight: CatchMinigame): void {
    this.landedDistance = fight.distance;
    this.landedStamina = fight.stamina;
    this.state.addFish(fight.species, fight.kg, PERIODS[this.period].hour);
    this.fight = null;
    this.held = false;
    this.phase = "card";
    this.dirty = true;
    const card = this.state.lastCatch;
    this.notice = card?.kept ? "进冷藏箱了" : "鱼舱满了，已放生（图鉴记下了）";
    this.noticeLeft = 0;
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

  private publish(): void {
    const stats = this.state.stats;
    const card = this.phase === "card" ? this.state.lastCatch : null;
    const species = card?.species || this.fight?.species || this.bites.species || "";
    const band = this.fight?.band ?? greenBand(this.state.upgrades.rod | 0);
    const view = this.view;
    view.phase = this.phase;
    view.waterId = this.water;
    view.waterName = WATERS[this.water].name;
    view.periodId = this.period;
    view.periodName = PERIODS[this.period].name;
    view.power = this.power;
    view.reach = this.reach;
    view.depth = this.depth;
    view.dip = this.bites.dip;
    view.notice = this.notice;
    view.tension = this.fight?.tension ?? 0.3;
    view.bandLo = band[0];
    view.bandHi = band[1];
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
    view.coins = this.state.money;
    view.holdKg = this.state.holdKg;
    view.holdCap = stats.holdKg;
    view.holdCount = this.state.inventory.length;
    view.lineKg = stats.lineKg;
    view.reelSpeed = stats.reelSpeed;
    view.castM = stats.castM;
    view.rodLevel = this.state.upgrades.rod | 0;
    view.hint = this.hintFor();
  }

  private hintFor(): string {
    if (this.notice && (this.phase === "miss" || this.phase === "card" || this.noticeLeft > 0)) {
      return this.notice;
    }
    switch (this.phase) {
      case "dock": return "卖鱼、升级，再出海";
      case "ready": return "按住蓄力，松手抛竿。蓄力越足，抛得越远、落点越深";
      case "charging": return "松手抛出";
      case "waiting": return "等浮标下沉再提竿";
      case "nibbling": return "鱼在试饵，先别提";
      case "hook": return "提竿！";
      case "fighting":
        return this.view.surge > 0.55 ? "鱼在冲刺，松手放线" : "按住收线，拉力停在绿区";
      case "card": return this.view.kept ? "进冷藏箱了" : "鱼舱满了";
      case "miss": return this.notice;
      default: return "";
    }
  }
}
