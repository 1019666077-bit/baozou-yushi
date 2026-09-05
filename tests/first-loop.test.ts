import { describe, expect, it } from "vitest";
import {
  FIRST_ROD_UPGRADE_COST,
  foamBayTypicalRunCoins,
  tutorialFirstSaleCoins,
  tripsToFillUpgrade,
  upgradeGapRemaining,
} from "../assets/scripts/domain/PriceCalculator";
import {
  FIRST_CRATE_BUDGET_MS,
  TUTORIAL_BATTLE_FALLBACK_MS,
  canAffordNextUpgrade,
  firstCrateFallbackBudgetMs,
  firstCrateTaughtBudgetMs,
  harborGoalPrompt,
  harborNextCta,
  harborSailCaption,
  harborSellBridgeLine,
  harborUpgradeBarVisible,
  harborUpgradeCtaLabel,
  harborUpgradeProgressLine,
  shouldAutoReel,
  upgradeProgressRatio,
} from "../assets/scripts/domain/TutorialFlow";
import { sellGoalBridge } from "../assets/scripts/domain/StyleCallout";

describe("first-loop economy C", () => {
  it("keeps the taught crate path and late-stun fallback inside 60s", () => {
    expect(firstCrateTaughtBudgetMs()).toBeLessThanOrEqual(FIRST_CRATE_BUDGET_MS);
    expect(firstCrateFallbackBudgetMs()).toBeLessThanOrEqual(FIRST_CRATE_BUDGET_MS);
    expect(FIRST_CRATE_BUDGET_MS).toBe(60_000);
    expect(TUTORIAL_BATTLE_FALLBACK_MS).toBe(40_000);
    expect(shouldAutoReel("reel", 0, 39_999)).toBe(false);
    expect(shouldAutoReel("reel", 0, 40_000)).toBe(true);
    expect(shouldAutoReel("weakPoint", 8_000, 60_000)).toBe(false);
  });

  it("keeps 11/90 so the first sale cannot steal the sail CTA", () => {
    const firstSale = tutorialFirstSaleCoins();
    expect(firstSale).toBe(11);
    expect(FIRST_ROD_UPGRADE_COST).toBe(90);
    expect(firstSale).toBeLessThan(FIRST_ROD_UPGRADE_COST);
    expect(upgradeGapRemaining(firstSale)).toBe(79);
    expect(
      harborNextCta({
        tutorialComplete: true,
        completedRuns: 1,
        pendingSell: false,
        upgradeUnlocked: true,
        coins: firstSale,
        nextUpgradeCost: FIRST_ROD_UPGRADE_COST,
      }),
    ).toBe("sail");
    expect(canAffordNextUpgrade(firstSale, FIRST_ROD_UPGRADE_COST)).toBe(false);
    expect(harborSailCaption(true)).toBe("出海捕鱼");
  });

  it("tells the player the remaining coins and that another sail can fill it", () => {
    const firstSale = tutorialFirstSaleCoins();
    const line = harborUpgradeProgressLine(firstSale, FIRST_ROD_UPGRADE_COST);
    expect(line).toContain("还差 79");
    expect(line).toContain("11/90");
    expect(line).toContain("再出海能补");
    expect(
      harborGoalPrompt({
        tutorialComplete: true,
        completedRuns: 1,
        coins: firstSale,
        nextUpgradeCost: FIRST_ROD_UPGRADE_COST,
        upgradeUnlocked: true,
      }),
    ).toBe(line);
    expect(harborSellBridgeLine(firstSale, FIRST_ROD_UPGRADE_COST)).toBe(
      "卖出已入账 · 11/90 · 还差 79",
    );
    expect(sellGoalBridge(firstSale, firstSale, FIRST_ROD_UPGRADE_COST)).toBe(
      "卖出 +11金 · 11/90",
    );
    expect(upgradeProgressRatio(firstSale, FIRST_ROD_UPGRADE_COST)).toBeCloseTo(
      11 / 90,
    );
  });

  it("lets a conservative foam-bay trip close the 11/90 gap in at most two sails", () => {
    const firstSale = tutorialFirstSaleCoins();
    const typical = foamBayTypicalRunCoins();
    expect(typical).toBeGreaterThanOrEqual(40);
    expect(typical).toBeLessThan(90);
    expect(tripsToFillUpgrade(firstSale)).toBeLessThanOrEqual(2);
    expect(tripsToFillUpgrade(firstSale + typical)).toBeLessThanOrEqual(1);
    expect(tripsToFillUpgrade(FIRST_ROD_UPGRADE_COST)).toBe(0);
  });

  it("keeps the unaffordable upgrade button secondary-sized copy, not the hero CTA", () => {
    const firstSale = tutorialFirstSaleCoins();
    expect(
      harborUpgradeCtaLabel({
        tutorialComplete: true,
        completedRuns: 1,
        coins: firstSale,
        nextUpgradeCost: FIRST_ROD_UPGRADE_COST,
        toolName: "弹力鱼竿",
      }),
    ).toBe("还差79");
    expect(
      harborUpgradeCtaLabel({
        tutorialComplete: true,
        completedRuns: 1,
        coins: 90,
        nextUpgradeCost: 90,
        toolName: "弹力鱼竿",
      }),
    ).toBe("升级弹力鱼竿");
    expect(
      harborUpgradeCtaLabel({
        tutorialComplete: false,
        completedRuns: 0,
        coins: 0,
        nextUpgradeCost: 90,
        toolName: "弹力鱼竿",
      }),
    ).toBe("教学后升级");
    expect(
      harborUpgradeBarVisible({
        tutorialComplete: true,
        coins: firstSale,
        nextUpgradeCost: 90,
      }),
    ).toBe(true);
    expect(
      harborUpgradeBarVisible({
        tutorialComplete: true,
        coins: 90,
        nextUpgradeCost: 90,
      }),
    ).toBe(false);
    expect(
      harborUpgradeBarVisible({
        tutorialComplete: false,
        coins: 11,
        nextUpgradeCost: 90,
      }),
    ).toBe(false);
  });
});
