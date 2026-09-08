export interface MonetizationContext {
  tutorialComplete: boolean;
  completedRuns: number;
  now: number;
  lastInterstitialAt: number;
  removeAds: boolean;
  weeklyChallenge: boolean;
  rewardedSettlementGrantsToday: number;
  reliefGrantsToday: number;
  bossRevivesThisRun: number;
}

export const INTERSTITIAL_COOLDOWN_MS = 180_000;
export const MAX_SETTLEMENT_REWARDS_PER_DAY = 3;
export const MAX_RELIEF_GRANTS_PER_DAY = 2;

export function canShowInterstitial(context: MonetizationContext): boolean {
  return (
    context.tutorialComplete &&
    context.completedRuns >= 3 &&
    !context.removeAds &&
    !context.weeklyChallenge &&
    context.now - context.lastInterstitialAt >= INTERSTITIAL_COOLDOWN_MS
  );
}

export function canRewardSettlement(context: MonetizationContext): boolean {
  return (
    !context.weeklyChallenge &&
    context.rewardedSettlementGrantsToday < MAX_SETTLEMENT_REWARDS_PER_DAY
  );
}

export function settlementReward(baseCoins: number): number {
  return Math.max(0, Math.floor(baseCoins * 0.5));
}

export function canReviveBoss(context: MonetizationContext): boolean {
  return !context.weeklyChallenge && context.bossRevivesThisRun < 1;
}

export function canGrantRelief(context: MonetizationContext): boolean {
  return (
    !context.weeklyChallenge &&
    context.reliefGrantsToday < MAX_RELIEF_GRANTS_PER_DAY
  );
}

export function createGrantId(
  kind: "settlement" | "boss_revive" | "relief",
  subjectId: string,
  slot = 0,
): string {
  return `${kind}:${subjectId}:${slot}`;
}

export function hasGrant(grants: readonly string[], grantId: string): boolean {
  return grants.includes(grantId);
}

export function localDayKey(now: number): string {
  const date = new Date(now);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
