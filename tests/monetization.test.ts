import { describe, expect, it, vi } from "vitest";
import {
  canRewardSettlement,
  canReviveBoss,
  canShowInterstitial,
  createGrantId,
  settlementReward,
  type MonetizationContext,
} from "../assets/scripts/domain/MonetizationPolicy";
import { AndroidBilling } from "../assets/scripts/platform/AndroidAdapter";
import type {
  BillingAdapter,
  PlatformAdapter,
  StorePurchase,
  StoreResult,
} from "../assets/scripts/platform/PlatformAdapter";
import { DisabledMonetization, NoopLifecycle } from "../assets/scripts/platform/PlatformAdapter";
import { PurchaseService, type ReceiptVerifier } from "../assets/scripts/monetization/PurchaseService";
import { SaveService } from "../assets/scripts/save/SaveService";
import { createDefaultSave } from "../assets/scripts/domain/SaveMerge";
import { WebLocalAdapter } from "../assets/scripts/platform/WebLocalAdapter";
import {
  hasActiveEntitlement,
  visibleProducts,
} from "../assets/scripts/monetization/ProductCatalog";

const context: MonetizationContext = {
  tutorialComplete: true,
  completedRuns: 3,
  now: 1_000_000,
  lastInterstitialAt: 0,
  removeAds: false,
  weeklyChallenge: false,
  rewardedSettlementGrantsToday: 0,
  reliefGrantsToday: 0,
  bossRevivesThisRun: 0,
};

function billing(
  purchaseResult: StoreResult<StorePurchase>,
  restored: StorePurchase[] = [],
): BillingAdapter {
  return {
    enabled: true,
    queryProducts: async () => ({ status: "success", value: [] }),
    purchase: async () => purchaseResult,
    acknowledge: async () => ({ status: "success", value: true }),
    consume: async () => ({ status: "success", value: true }),
    restore: async () => ({ status: "success", value: restored }),
  };
}

function saveService(): SaveService {
  const local = new WebLocalAdapter();
  const adapter: PlatformAdapter = {
    ...local,
    kind: "web-local",
    monetization: new DisabledMonetization(),
    lifecycle: new NoopLifecycle(),
    initialize: async () => undefined,
    gameplayStart: () => undefined,
    gameplayStop: () => undefined,
    vibrate: () => undefined,
    isLowEndDevice: () => false,
  };
  return new SaveService(() => adapter);
}

const token = "purchase-token-123";
const authority = {
  authenticatedUserId: "user-1",
  verifiedAt: 1_000,
  authorityExpiresAt: Date.now() + 86_400_000,
  authorityToken: "signed-authority-token",
};

describe("MonetizationPolicy", () => {
  it("hides every coin pack until the first boss defeat marker", () => {
    expect(visibleProducts(false).some((item) => item.kind === "coins")).toBe(false);
    expect(visibleProducts(true).filter((item) => item.kind === "coins")).toHaveLength(3);
  });

  it("expires cached server authority instead of trusting it forever", () => {
    const save = createDefaultSave();
    save.entitlements.remove_ads = {
      productId: "remove_ads",
      source: "google-play",
      verifiedAt: 1,
      authorityExpiresAt: 100,
      authorityToken: "signed-authority-token",
    };
    expect(hasActiveEntitlement(save, "remove_ads", 99)).toBe(true);
    expect(hasActiveEntitlement(save, "remove_ads", 100)).toBe(false);
  });

  it("blocks tutorial, first two runs, cooldown, remove_ads, and weekly boosts", () => {
    expect(canShowInterstitial(context)).toBe(true);
    expect(canShowInterstitial({ ...context, completedRuns: 2 })).toBe(false);
    expect(canShowInterstitial({ ...context, removeAds: true })).toBe(false);
    expect(canShowInterstitial({ ...context, weeklyChallenge: true })).toBe(false);
    expect(canShowInterstitial({ ...context, lastInterstitialAt: 900_000 })).toBe(false);
    expect(canRewardSettlement({ ...context, rewardedSettlementGrantsToday: 3 })).toBe(false);
    expect(canRewardSettlement({ ...context, weeklyChallenge: true })).toBe(false);
    expect(canReviveBoss({ ...context, bossRevivesThisRun: 1 })).toBe(false);
    expect(settlementReward(101)).toBe(50);
    expect(createGrantId("settlement", "run-1")).toBe("settlement:run-1:0");
  });
});

describe("Android billing state machine", () => {
  it("accepts one matching callback and ignores duplicate callbacks", async () => {
    const native = {
      billingRequest: vi.fn((raw: string, callback: (value: string) => void) => {
        const request = JSON.parse(raw) as { requestId: string };
        const response = JSON.stringify({
          requestId: request.requestId,
          status: "success",
          purchase: { productId: "remove_ads", purchaseToken: token },
        });
        callback(response);
        callback(response);
      }),
    };
    const result = await new AndroidBilling(() => native).purchase("remove_ads");
    expect(result).toEqual({
      status: "success",
      value: { productId: "remove_ads", purchaseToken: token },
    });
  });

  it("times out safely when the native bridge drops the callback", async () => {
    vi.useFakeTimers();
    const bridge = new AndroidBilling(
      () => ({ billingRequest: () => undefined }),
      20,
    );
    const pending = bridge.restore();
    await vi.advanceTimersByTimeAsync(20);
    await expect(pending).resolves.toEqual({ status: "timeout" });
    vi.useRealTimers();
  });
});

describe("verified purchase grants", () => {
  const purchase: StorePurchase = { productId: "remove_ads", purchaseToken: token };

  it("grants permanent rights only after a matching verified response", async () => {
    const saves = saveService();
    const verifier: ReceiptVerifier = {
      verify: async () => ({
        status: "verified",
        productId: "remove_ads",
        purchaseToken: token,
        ...authority,
      }),
    };
    const service = new PurchaseService(() => billing({
      status: "success",
      value: purchase,
    }), verifier, saves);
    await expect(service.purchase("remove_ads")).resolves.toMatchObject({ status: "granted" });
    expect(saves.get().entitlements.remove_ads?.source).toBe("google-play");
  });

  it("does not grant on cancellation, network outage, rejection, or duplicate consumable", async () => {
    const cancelledSave = saveService();
    await new PurchaseService(
      () => billing({ status: "cancelled" }),
      { verify: async () => ({ status: "verified" }) },
      cancelledSave,
    ).purchase("remove_ads");
    expect(cancelledSave.get().entitlements.remove_ads).toBeUndefined();

    for (const result of [
      { status: "unavailable" as const },
      { status: "rejected" as const },
    ]) {
      const saves = saveService();
      const service = new PurchaseService(
        () => billing({
          status: "success",
          value: { productId: "coins_300", purchaseToken: token },
        }),
        { verify: async () => result },
        saves,
      );
      await service.purchase("coins_300");
      expect(saves.get().coins).toBe(0);
    }

    const duplicateSave = saveService();
    await new PurchaseService(
      () => billing({
        status: "success",
        value: { productId: "coins_300", purchaseToken: token },
      }),
      {
        verify: async () => ({
          status: "verified",
          productId: "coins_300",
          purchaseToken: token,
          alreadyProcessed: true,
          ...authority,
        }),
      },
      duplicateSave,
    ).purchase("coins_300");
    expect(duplicateSave.get().coins).toBe(0);
  });

  it("restores verified permanent products and applies revocation sync", async () => {
    const saves = saveService();
    const verifier: ReceiptVerifier = {
      verify: async (item) => ({
        status: "verified",
        productId: item.productId,
        purchaseToken: item.purchaseToken,
        ...authority,
      }),
      syncRevocations: async () => ({
        revokedProductIds: ["remove_ads"],
        entitlements: [],
      }),
    };
    const service = new PurchaseService(
      () => billing({ status: "cancelled" }, [purchase]),
      verifier,
      saves,
    );
    expect(await service.restore()).toBe(1);
    expect(saves.get().entitlements.remove_ads).toBeDefined();
    await service.syncRevocations();
    expect(saves.get().entitlements.remove_ads).toBeUndefined();
  });

  it("treats duplicate permanent receipts as idempotent server authority", async () => {
    const saves = saveService();
    const service = new PurchaseService(
      () => billing({ status: "success", value: purchase }),
      {
        verify: async () => ({
          status: "verified",
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          alreadyProcessed: true,
          entitlementActive: true,
          ...authority,
        }),
      },
      saves,
    );
    await expect(service.purchase("remove_ads")).resolves.toMatchObject({
      status: "granted",
    });
    expect(saves.get().entitlements.remove_ads?.authorityToken).toBe(
      authority.authorityToken,
    );
  });

  it("keeps finalize failures pending and grants once after retry", async () => {
    const saves = saveService();
    let finalizeSucceeds = false;
    const adapter: BillingAdapter = {
      ...billing({ status: "success", value: purchase }),
      acknowledge: async () =>
        finalizeSucceeds
          ? { status: "success", value: true }
          : { status: "unavailable" },
    };
    const service = new PurchaseService(
      () => adapter,
      {
        verify: async () => ({
          status: "verified",
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          ...authority,
        }),
      },
      saves,
    );
    await expect(service.purchase("remove_ads")).resolves.toMatchObject({
      status: "failed",
    });
    expect(saves.get().entitlements.remove_ads).toBeUndefined();
    expect(saves.get().pendingTransactions[0]?.state).toBe("finalize_pending");
    finalizeSucceeds = true;
    await expect(service.retryPendingFinalizations()).resolves.toBe(1);
    expect(saves.get().entitlements.remove_ads).toBeDefined();
    expect(saves.get().pendingTransactions).toHaveLength(0);
  });
});
