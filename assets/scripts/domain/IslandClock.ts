import type { IslandConfig, WaveConfig } from "../data/types";

export type RunPhase = "wave" | "boss" | "over";

export interface PhaseSnapshot {
  phase: RunPhase;
  waveIndex: number;
  remaining: number;
}

export const BOSS_SECONDS = 120;

export function wavesTotalSeconds(waves: WaveConfig[]): number {
  return waves.reduce((sum, wave) => sum + wave.durationSeconds, 0);
}

export function waveAt(
  elapsedSeconds: number,
  waves: WaveConfig[],
): { index: number; wave: WaveConfig; localElapsed: number } | undefined {
  let t = elapsedSeconds;
  for (let index = 0; index < waves.length; index += 1) {
    const wave = waves[index];
    if (t < wave.durationSeconds) {
      return { index, wave, localElapsed: t };
    }
    t -= wave.durationSeconds;
  }
  return undefined;
}

export function runPhase(
  elapsedSeconds: number,
  island: Pick<IslandConfig, "waves" | "bossId">,
  bossSeconds = BOSS_SECONDS,
): PhaseSnapshot {
  const current = waveAt(elapsedSeconds, island.waves);
  if (current) {
    const rest = island.waves
      .slice(current.index)
      .reduce(
        (sum, wave, offset) =>
          sum +
          (offset === 0
            ? wave.durationSeconds - current.localElapsed
            : wave.durationSeconds),
        0,
      );
    return {
      phase: "wave",
      waveIndex: current.index,
      remaining: rest + (island.bossId ? bossSeconds : 0),
    };
  }
  const waveEnd = wavesTotalSeconds(island.waves);
  if (island.bossId && elapsedSeconds < waveEnd + bossSeconds) {
    return {
      phase: "boss",
      waveIndex: island.waves.length,
      remaining: waveEnd + bossSeconds - elapsedSeconds,
    };
  }
  return {
    phase: "over",
    waveIndex: island.waves.length,
    remaining: 0,
  };
}

export function waveCaption(phase: RunPhase, waveIndex: number): string {
  if (phase === "over") return "收网";
  if (phase === "boss") return "巨鲲潮";
  if (waveIndex <= 0) return "热身潮";
  return "精英潮";
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function shouldSpawn(
  alive: number,
  maxAlive: number,
  sinceSpawnSeconds: number,
  intervalSeconds: number,
  cap = 3,
): boolean {
  return (
    alive < Math.min(maxAlive, cap) && sinceSpawnSeconds >= intervalSeconds
  );
}
