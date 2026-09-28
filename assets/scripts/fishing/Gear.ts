/**
 * Ported from tidewater `src/game/Gear.js`
 * https://github.com/dgreenheck/tidewater (MIT, Copyright (c) 2026 DRG Software Solutions LLC)
 *
 * 升级轨。levels[0] 是初始装备，cost 是买到该级的价格。
 * 灰盒商店露出鱼线 / 卷线器 / 鱼竿 / 鱼舱。燃油、引擎、探鱼器、灯光的数据一并保留，界面不做。
 */

export interface GearLevel {
  cost: number;
  label: string;
  lineKg?: number;
  reelSpeed?: number;
  castM?: number;
  holdKg?: number;
  fuelL?: number;
  speedMul?: number;
  finder?: boolean;
  deckLights?: boolean;
}

export interface UpgradeTrack {
  name: string;
  levels: GearLevel[];
}

export const UPGRADES: { [key: string]: UpgradeTrack } = {
  line: { name: "Fishing line", levels: [
    { cost: 0, label: "8 lb mono", lineKg: 7 },
    { cost: 60, label: "15 lb mono", lineKg: 13 },
    { cost: 180, label: "30 lb braid", lineKg: 26 },
    { cost: 450, label: "60 lb braid", lineKg: 50 },
  ] },
  reel: { name: "Reel", levels: [
    { cost: 0, label: "Old spinning reel", reelSpeed: 1.1 },
    { cost: 90, label: "Smooth spinning reel", reelSpeed: 1.6 },
    { cost: 320, label: "Conventional reel", reelSpeed: 2.2 },
  ] },
  rod: { name: "Rod", levels: [
    { cost: 0, label: "Hand-me-down rod", castM: 22 },
    { cost: 75, label: "7 ft graphite rod", castM: 32 },
    { cost: 260, label: "9 ft surf rod", castM: 45 },
  ] },
  hold: { name: "Fish hold", levels: [
    { cost: 0, label: "Cooler", holdKg: 30 },
    { cost: 120, label: "Ice chest", holdKg: 70 },
    { cost: 400, label: "Insulated fish hold", holdKg: 160 },
  ] },
  fuel: { name: "Fuel tank", levels: [
    { cost: 0, label: "40 L tank", fuelL: 40 },
    { cost: 150, label: "80 L tank", fuelL: 80 },
    { cost: 380, label: "150 L tank", fuelL: 150 },
  ] },
  engine: { name: "Engine", levels: [
    { cost: 0, label: "Tired diesel", speedMul: 1 },
    { cost: 300, label: "Rebuilt diesel", speedMul: 1.15 },
    { cost: 700, label: "Turbo diesel", speedMul: 1.3 },
  ] },
  fishFinder: { name: "Fish finder", levels: [
    { cost: 0, label: "None", finder: false },
    { cost: 250, label: "Fish finder (depth and fish on the HUD)", finder: true },
  ] },
  lights: { name: "Boat lights", levels: [
    { cost: 0, label: "Nav lights only", deckLights: false },
    { cost: 140, label: "Deck floodlights for night fishing", deckLights: true },
  ] },
};

export const FUEL_PRICE = 1.5;

export function fuelBurn(rpm: number): number {
  return 0.0025 + 0.024 * rpm * rpm;
}

export interface NextLevel extends GearLevel {
  index: number;
}

export function nextLevel(
  upgrades: { [key: string]: number },
  key: string,
): NextLevel | null {
  const levels = UPGRADES[key].levels;
  const index = (upgrades[key] | 0) + 1;
  if (index >= levels.length) return null;
  return { index, ...levels[index] };
}

export function defaultUpgrades(): { [key: string]: number } {
  const upgrades: { [key: string]: number } = {};
  for (const key in UPGRADES) upgrades[key] = 0;
  return upgrades;
}

export interface GearStats {
  lineKg: number;
  reelSpeed: number;
  castM: number;
  holdKg: number;
  fuelL: number;
  speedMul: number;
  finder: boolean;
  deckLights: boolean;
}

export function gearStats(upgrades: { [key: string]: number }): GearStats {
  const stats: { [key: string]: number | boolean } = {};
  for (const key in UPGRADES) {
    const levels = UPGRADES[key].levels;
    const index = Math.max(0, Math.min(levels.length - 1, upgrades[key] | 0));
    const level = levels[index];
    for (const field of Object.keys(level) as (keyof GearLevel)[]) {
      if (field === "cost" || field === "label") continue;
      const value = level[field];
      if (value !== undefined) stats[field] = value;
    }
  }
  return stats as unknown as GearStats;
}
