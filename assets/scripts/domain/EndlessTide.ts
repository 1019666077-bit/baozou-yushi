export const ENDLESS_ROUND_SECONDS = 180;

export interface EndlessRunState {
  round: number;
  roundElapsedSeconds: number;
  bankedCoins: number;
  unbankedCoins: number;
  active: boolean;
}

export interface EndlessDifficulty {
  toughnessScale: number;
  speedScale: number;
  spawnIntervalScale: number;
}

export function endlessUnlocked(defeatedBossIds: readonly string[]): boolean {
  return defeatedBossIds.length > 0;
}

export function createEndlessRun(): EndlessRunState {
  return {
    round: 1,
    roundElapsedSeconds: 0,
    bankedCoins: 0,
    unbankedCoins: 0,
    active: true,
  };
}

export function endlessDifficulty(round: number): EndlessDifficulty {
  const step = Math.max(0, Math.min(20, Math.floor(round) - 1));
  return {
    toughnessScale: 1 + step * 0.09,
    speedScale: 1 + step * 0.025,
    spawnIntervalScale: Math.max(0.65, 1 - step * 0.018),
  };
}

export function addEndlessEarnings(
  state: EndlessRunState,
  baseCoins: number,
): EndlessRunState {
  if (!state.active) return state;
  const linearRoundBonus = 1 + Math.min(20, state.round - 1) * 0.04;
  return {
    ...state,
    unbankedCoins:
      state.unbankedCoins +
      Math.max(0, Math.round(baseCoins * linearRoundBonus)),
  };
}

export function completeEndlessRound(
  state: EndlessRunState,
): EndlessRunState {
  if (!state.active) return state;
  return {
    ...state,
    round: state.round + 1,
    roundElapsedSeconds: 0,
    bankedCoins: state.bankedCoins + state.unbankedCoins,
    unbankedCoins: 0,
  };
}

export function withdrawEndless(state: EndlessRunState): EndlessRunState {
  return {
    ...state,
    active: false,
    bankedCoins: state.bankedCoins + state.unbankedCoins,
    unbankedCoins: 0,
  };
}

export function failEndlessRound(state: EndlessRunState): EndlessRunState {
  return { ...state, active: false, unbankedCoins: 0 };
}
