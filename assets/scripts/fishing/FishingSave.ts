/**
 * 把 GameState 接到 PlayerSave。
 * 金币只用 PlayerSave.coins（和港口、教学、11/90 同一钱包）。
 * 鱼舱、图鉴、升级写在 save.fishing，旧档缺字段时补默认，不升 schema。
 */
import type { PlayerSave } from "../data/types";
import { GameState } from "./GameState";
import { defaultUpgrades } from "./Gear";
import type { FishingPersist } from "./persist";

export function defaultFishingPersist(): FishingPersist {
  return {
    v: 1,
    inventory: [],
    log: {},
    upgrades: defaultUpgrades(),
    fuel: null,
    nextId: 1,
  };
}

export function normalizeFishing(raw: unknown): FishingPersist {
  const state = new GameState();
  if (!raw || typeof raw !== "object") return state.toPersist();
  const source = raw as Partial<FishingPersist>;
  if (!state.fromJSON({ ...source, v: 1 })) return defaultFishingPersist();
  return state.toPersist();
}

export function gameStateFromSave(save: PlayerSave): GameState {
  const state = new GameState();
  state.fromJSON(normalizeFishing(save.fishing));
  state.money = Math.max(0, save.coins);
  return state;
}

export function applyFishingState(save: PlayerSave, state: GameState): PlayerSave {
  return {
    ...save,
    coins: Math.max(0, state.money),
    fishing: state.toPersist(),
  };
}
