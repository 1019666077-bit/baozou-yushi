import { Analytics } from "../analytics/Analytics";
import type { PlayerSave } from "../data/types";
import {
  canRewardSettlement,
  canReviveBoss,
  canShowInterstitial,
  createGrantId,
  hasGrant,
  localDayKey,
  settlementReward,
  type MonetizationContext,
} from "../domain/MonetizationPolicy";
import { platformAdapter } from "../platform/PlatformRuntime";
import { playerSave, type SaveService } from "../save/SaveService";
import { hasActiveEntitlement } from "./ProductCatalog";

export class AdGrantService {
  constructor(private readonly saves: SaveService = playerSave) {}

  async showInterstitial(weeklyChallenge = false): Promise<void> {
    const save = this.saves.get();
    const now = Date.now();
    if (!canShowInterstitial(this.context(save, now, weeklyChallenge, 0))) return;
    const result = await platformAdapter().monetization.show("interstitial");
    Analytics.track("ad_result", { placement: "interstitial", status: result.status });
    if (result.status !== "completed") return;
    await this.saves.save({
      ...save,
      adGrants: { ...this.today(save, now), lastInterstitialAt: now },
    });
  }

  async rewardSettlement(
    runId: string,
    baseCoins: number,
    weeklyChallenge = false,
  ): Promise<number> {
    const save = this.saves.get();
    const now = Date.now();
    const today = this.today(save, now);
    const grantId = createGrantId("settlement", runId);
    const context = this.context(save, now, weeklyChallenge, 0);
    if (!canRewardSettlement(context) || hasGrant(today.grantIds, grantId)) return 0;
    Analytics.track("ad_offer", { placement: "settlement", runId });
    const result = await platformAdapter().monetization.show("rewarded");
    Analytics.track("ad_result", { placement: "settlement", status: result.status });
    if (result.status !== "completed") return 0;
    const amount = settlementReward(baseCoins);
    const latest = this.saves.get();
    const latestToday = this.today(latest, now);
    if (hasGrant(latestToday.grantIds, grantId)) return 0;
    await this.saves.save({
      ...latest,
      coins: latest.coins + amount,
      adGrants: {
        ...latestToday,
        settlementRewards: latestToday.settlementRewards + 1,
        grantIds: [...latestToday.grantIds, grantId],
      },
    });
    Analytics.track("ad_grant", { placement: "settlement", grantId, amount });
    return amount;
  }

  async reviveBoss(runId: string, alreadyRevived: number, weekly: boolean): Promise<boolean> {
    const save = this.saves.get();
    const now = Date.now();
    const grantId = createGrantId("boss_revive", runId);
    if (
      !canReviveBoss(this.context(save, now, weekly, alreadyRevived)) ||
      hasGrant(save.adGrants.grantIds, grantId)
    ) return false;
    Analytics.track("ad_offer", { placement: "boss_revive", runId });
    const result = await platformAdapter().monetization.show("rewarded");
    Analytics.track("ad_result", { placement: "boss_revive", status: result.status });
    if (result.status !== "completed") return false;
    const latest = this.saves.get();
    const today = this.today(latest, now);
    if (hasGrant(today.grantIds, grantId)) return false;
    await this.saves.save({
      ...latest,
      adGrants: { ...today, grantIds: [...today.grantIds, grantId] },
    });
    Analytics.track("ad_grant", { placement: "boss_revive", grantId });
    return true;
  }

  private today(save: PlayerSave, now: number): PlayerSave["adGrants"] {
    const key = localDayKey(now);
    return save.adGrants.dayKey === key
      ? save.adGrants
      : {
          dayKey: key,
          lastInterstitialAt: save.adGrants.lastInterstitialAt,
          settlementRewards: 0,
          reliefGrants: 0,
          grantIds: save.adGrants.grantIds.slice(-100),
        };
  }

  private context(
    save: PlayerSave,
    now: number,
    weeklyChallenge: boolean,
    bossRevivesThisRun: number,
  ): MonetizationContext {
    const today = this.today(save, now);
    return {
      tutorialComplete: save.tutorialComplete,
      completedRuns: save.completedRuns,
      now,
      lastInterstitialAt: today.lastInterstitialAt,
      removeAds: hasActiveEntitlement(save, "remove_ads", now),
      weeklyChallenge,
      rewardedSettlementGrantsToday: today.settlementRewards,
      reliefGrantsToday: today.reliefGrants,
      bossRevivesThisRun,
    };
  }
}

export const adGrants = new AdGrantService();
