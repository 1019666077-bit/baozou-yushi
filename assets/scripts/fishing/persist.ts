/**
 * 钓鱼存档字段。钱币不在这里，走 PlayerSave.coins。
 * 结构对应 tidewater `src/game/GameState.js` 的 toJSON（去掉独立钱包）。
 */

export interface HeldFish {
  id: number;
  species: string;
  kg: number;
  cm: number;
  value: number;
  caughtAt: number;
  record: boolean;
}

export interface FishLogEntry {
  count: number;
  bestKg: number;
  bestCm?: number;
}

export interface FishingPersist {
  v: 1;
  inventory: HeldFish[];
  log: Record<string, FishLogEntry>;
  upgrades: Record<string, number>;
  fuel: number | null;
  nextId: number;
}
