/**
 * Ported from tidewater `src/game/GameState.js`
 * https://github.com/dgreenheck/tidewater (MIT, Copyright (c) 2026 DRG Software Solutions LLC)
 *
 * 冷藏箱 / 鱼舱、图鉴、升级购买、卖鱼。
 * 源文件把钱写进 localStorage。这里钱包是 `money` 字段，由 FishingSave 和 PlayerSave.coins 同步，
 * 不碰浏览器存储，避免和港口存档各记一套钱。
 */
import { FISH, fishLengthCm, fishValue } from "./FishTable";
import {
  defaultUpgrades,
  FUEL_PRICE,
  gearStats,
  nextLevel,
  UPGRADES,
  type GearStats,
  type NextLevel,
} from "./Gear";
import type { FishingPersist, FishLogEntry, HeldFish } from "./persist";

export interface LastCatch {
  species: string;
  kg: number;
  cm: number;
  value: number;
  newSpecies: boolean;
  record: boolean;
  prevBestKg: number;
  prevBestCm: number;
  kept: boolean;
}

export interface SellResult {
  total: number;
  count: number;
}

export class GameState {
  money = 0;
  inventory: HeldFish[] = [];
  log: { [species: string]: FishLogEntry } = {};
  lastCatch: LastCatch | null = null;
  upgrades: { [key: string]: number } = defaultUpgrades();
  fuel: number | null = null;
  private nextId = 1;
  private listeners = new Set<(state: GameState) => void>();

  get stats(): GearStats {
    return gearStats(this.upgrades);
  }

  get holdKg(): number {
    let kg = 0;
    for (const fish of this.inventory) kg += fish.kg;
    return kg;
  }

  get holdValue(): number {
    let value = 0;
    for (const fish of this.inventory) value += fish.value;
    return value;
  }

  fits(kg: number): boolean {
    return this.holdKg + kg <= this.stats.holdKg + 1e-6;
  }

  /**
   * 入库。满舱返回 null，但图鉴照记。
   * 第一条是新鱼种；更重的一条是新纪录。
   */
  addFish(species: string, kg: number, timeOfDay = 12): HeldFish | null {
    kg = Math.round(kg * 100) / 100;
    const cm = Math.round(fishLengthCm(species, kg));
    const logEntry = this.log[species] || (this.log[species] = { count: 0, bestKg: 0 });
    const newSpecies = logEntry.count === 0;
    const prevBestKg = logEntry.bestKg;
    const prevBestCm = logEntry.bestCm ?? (prevBestKg > 0 ? Math.round(fishLengthCm(species, prevBestKg)) : 0);
    const record = !newSpecies && kg > prevBestKg;
    logEntry.count++;
    if (kg > prevBestKg) {
      logEntry.bestKg = kg;
      logEntry.bestCm = cm;
    }
    const value = fishValue(species, kg);
    const kept = this.fits(kg);
    this.lastCatch = {
      species, kg, cm, value, newSpecies, record, prevBestKg, prevBestCm, kept,
    };
    if (!kept) {
      this.emit();
      return null;
    }
    const fish: HeldFish = {
      id: this.nextId++,
      species,
      kg,
      cm,
      value,
      caughtAt: timeOfDay,
      record,
    };
    this.inventory.push(fish);
    this.emit();
    return fish;
  }

  sell(ids: number[] | null = null): SellResult {
    const keep: HeldFish[] = [];
    const sold: HeldFish[] = [];
    for (const fish of this.inventory) {
      (ids === null || ids.indexOf(fish.id) >= 0 ? sold : keep).push(fish);
    }
    let total = 0;
    for (const fish of sold) total += fish.value;
    this.inventory = keep;
    this.money += total;
    this.emit();
    return { total, count: sold.length };
  }

  release(id: number): void {
    this.inventory = this.inventory.filter((fish) => fish.id !== id);
    this.emit();
  }

  spend(amount: number): boolean {
    if (amount > this.money) return false;
    this.money -= amount;
    this.emit();
    return true;
  }

  buy(key: string): NextLevel | null {
    if (!UPGRADES[key]) return null;
    const next = nextLevel(this.upgrades, key);
    if (!next || next.cost > this.money) return null;
    this.money -= next.cost;
    this.upgrades[key] = next.index;
    if (key === "fuel") this.fuel = null;
    this.emit();
    return next;
  }

  get fuelL(): number {
    return this.fuel === null ? this.stats.fuelL : Math.min(this.fuel, this.stats.fuelL);
  }

  burn(litres: number): number {
    this.fuel = Math.max(0, this.fuelL - litres);
    return this.fuel;
  }

  refuelCost(): number {
    return Math.ceil((this.stats.fuelL - this.fuelL) * FUEL_PRICE);
  }

  refuel(): number {
    const missing = this.stats.fuelL - this.fuelL;
    const litres = Math.min(missing, Math.floor(this.money / FUEL_PRICE));
    if (litres <= 0) return 0;
    this.money -= Math.ceil(litres * FUEL_PRICE);
    this.fuel = this.fuelL + litres;
    if (this.fuel >= this.stats.fuelL - 1e-3) this.fuel = null;
    this.emit();
    return litres;
  }

  onChange(fn: (state: GameState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(): void {
    for (const fn of this.listeners) fn(this);
  }

  toPersist(): FishingPersist {
    return {
      v: 1,
      inventory: this.inventory.map((fish) => ({ ...fish })),
      log: JSON.parse(JSON.stringify(this.log)) as FishingPersist["log"],
      upgrades: { ...this.upgrades },
      fuel: this.fuel,
      nextId: this.nextId,
    };
  }

  fromJSON(raw: Partial<FishingPersist> | null | undefined): boolean {
    if (!raw || (raw.v !== undefined && raw.v !== 1)) return false;
    this.inventory = Array.isArray(raw.inventory)
      ? raw.inventory.filter((fish) => fish && FISH[fish.species] && Number.isFinite(fish.kg))
      : [];
    for (const fish of this.inventory) {
      if (!Number.isFinite(fish.cm)) fish.cm = Math.round(fishLengthCm(fish.species, fish.kg));
      fish.kg = Math.round(fish.kg * 100) / 100;
      fish.value = Math.max(1, Math.round(fish.value || fishValue(fish.species, fish.kg)));
      fish.record = !!fish.record;
      fish.caughtAt = Number.isFinite(fish.caughtAt) ? fish.caughtAt : 12;
    }
    this.log = {};
    if (raw.log && typeof raw.log === "object") {
      for (const key of Object.keys(raw.log)) {
        const entry = raw.log[key];
        if (!FISH[key] || !entry) continue;
        const bestKg = Math.max(0, entry.bestKg || 0);
        this.log[key] = {
          count: Math.max(0, Math.floor(entry.count || 0)),
          bestKg,
          bestCm: Number.isFinite(entry.bestCm)
            ? entry.bestCm
            : bestKg > 0
              ? Math.round(fishLengthCm(key, bestKg))
              : 0,
        };
      }
    }
    this.upgrades = { ...defaultUpgrades(), ...(raw.upgrades || {}) };
    for (const key of Object.keys(UPGRADES)) {
      const max = UPGRADES[key].levels.length - 1;
      this.upgrades[key] = Math.max(0, Math.min(max, this.upgrades[key] | 0));
    }
    this.fuel = Number.isFinite(raw.fuel) ? (raw.fuel as number) : null;
    const maxId = this.inventory.reduce((max, fish) => Math.max(max, fish.id + 1), 1);
    this.nextId = Math.max(raw.nextId || 0, maxId, 1);
    return true;
  }

  reset(): void {
    this.money = 0;
    this.inventory = [];
    this.log = {};
    this.upgrades = defaultUpgrades();
    this.fuel = null;
    this.nextId = 1;
    this.lastCatch = null;
    this.emit();
  }
}
