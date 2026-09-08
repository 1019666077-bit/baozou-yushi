import type {
  FishConfig,
  ToolKind,
  WeeklyChallengeState,
} from "../data/types";
import { SeededRandom } from "./SeededRandom";

export interface WeeklyRules {
  weekKey: string;
  seed: number;
  islandId: string;
  fishPool: string[];
  toolKind: ToolKind;
  durationSeconds: number;
  scoreRule: "styleCoins";
}

export interface WeeklyAttempt {
  score: number;
  usedPaidBoost?: boolean;
  usedAdBoost?: boolean;
  /** Cosmetic-only loadout is recorded for diagnostics and never affects eligibility. */
  cosmeticsUsed?: readonly string[];
}

function hash(value: string): number {
  let result = 0x811c9dc5;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

export function isoWeekKey(now = Date.now()): string {
  const date = new Date(now);
  const utc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function generateWeeklyRules(
  weekKey: string,
  fish: FishConfig[],
): WeeklyRules {
  if (!fish.length) throw new Error("Weekly challenge needs fish content");
  const seed = hash(`weekly:${weekKey}`);
  const rng = new SeededRandom(seed);
  const islands = Array.from(new Set(fish.map((item) => item.islandId)));
  const islandId = rng.pick(islands);
  const candidates = fish.filter(
    (item) => item.islandId === islandId && item.tier !== "boss",
  );
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return {
    weekKey,
    seed,
    islandId,
    fishPool: shuffled.slice(0, Math.min(4, shuffled.length)).map((item) => item.id),
    toolKind: rng.pick<ToolKind>(["rod", "cannon", "harpoon"]),
    durationSeconds: 180,
    scoreRule: "styleCoins",
  };
}

export function createWeeklyState(now = Date.now()): WeeklyChallengeState {
  return {
    weekKey: isoWeekKey(now),
    score: 0,
    bestRun: 0,
    attempts: 0,
    leaderboardEligible: true,
  };
}

export function recordWeeklyAttempt(
  previous: WeeklyChallengeState | null,
  attempt: WeeklyAttempt,
  now = Date.now(),
): WeeklyChallengeState {
  const key = isoWeekKey(now);
  const state = previous?.weekKey === key ? previous : createWeeklyState(now);
  const eligible = !attempt.usedPaidBoost && !attempt.usedAdBoost;
  return {
    ...state,
    score: state.score + Math.max(0, Math.round(attempt.score)),
    bestRun: Math.max(state.bestRun, Math.max(0, Math.round(attempt.score))),
    attempts: state.attempts + 1,
    leaderboardEligible: state.leaderboardEligible && eligible,
  };
}

export function canSubmitWeeklyAttempt(attempt: WeeklyAttempt): boolean {
  return !attempt.usedPaidBoost && !attempt.usedAdBoost;
}
