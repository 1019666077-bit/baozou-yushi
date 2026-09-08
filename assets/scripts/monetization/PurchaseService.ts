import type { PlayerSave, PendingTransaction } from "../data/types";
import { Analytics } from "../analytics/Analytics";
import type {
  BillingAdapter,
  StoreProduct,
  StorePurchase,
  StoreResult,
} from "../platform/PlatformAdapter";
import { platformAdapter } from "../platform/PlatformRuntime";
import { playerSave, type SaveService } from "../save/SaveService";
import { catalogProduct, PRODUCT_CATALOG } from "./ProductCatalog";

export interface VerificationResult {
  status: "verified" | "rejected" | "unavailable";
  productId?: string;
  purchaseToken?: string;
  alreadyProcessed?: boolean;
  authenticatedUserId?: string;
  entitlementActive?: boolean;
  verifiedAt?: number;
  authorityExpiresAt?: number;
  authorityToken?: string;
  message?: string;
}

export interface ReceiptAuthProvider {
  getIdToken(): Promise<string | null>;
}

export interface ReceiptVerifier {
  verify(purchase: StorePurchase): Promise<VerificationResult>;
  syncRevocations?(): Promise<{
    revokedProductIds: string[];
    entitlements: Array<{
      productId: string;
      verifiedAt: number;
      authorityExpiresAt: number;
      authorityToken: string;
    }>;
  }>;
}

export class DisabledReceiptVerifier implements ReceiptVerifier {
  verify(): Promise<VerificationResult> {
    return Promise.resolve({
      status: "unavailable",
      message: "Receipt verification endpoint is not configured",
    });
  }
}

export class HttpReceiptVerifier implements ReceiptVerifier {
  constructor(
    private readonly endpoint: string,
    private readonly auth: ReceiptAuthProvider,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async verify(purchase: StorePurchase): Promise<VerificationResult> {
    if (!this.endpoint.startsWith("https://")) {
      return { status: "unavailable", message: "HTTPS verifier required" };
    }
    try {
      const token = await this.auth.getIdToken();
      if (!token) return { status: "unavailable", message: "Authentication required" };
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(purchase),
      });
      if (!response.ok) return { status: "rejected", message: `HTTP ${response.status}` };
      const result = (await response.json()) as VerificationResult;
      return result.status === "verified"
        ? result
        : { status: "rejected", message: result.message ?? "Receipt rejected" };
    } catch {
      return { status: "unavailable", message: "Receipt verifier unreachable" };
    }
  }

  async syncRevocations(): Promise<{
    revokedProductIds: string[];
    entitlements: Array<{
      productId: string;
      verifiedAt: number;
      authorityExpiresAt: number;
      authorityToken: string;
    }>;
  }> {
    const token = await this.auth.getIdToken();
    if (!token) throw new Error("Authentication required");
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "sync_entitlements" }),
    });
    if (!response.ok) throw new Error(`Entitlement sync HTTP ${response.status}`);
    return response.json();
  }
}

export type PurchaseOutcome =
  | { status: "granted"; productId: string }
  | { status: "cancelled" | "unavailable" | "failed"; message?: string };

export class PurchaseService {
  private prices = new Map<string, string>();

  constructor(
    private readonly billing: () => BillingAdapter | undefined = () =>
      platformAdapter().billing,
    private readonly verifier: ReceiptVerifier = new DisabledReceiptVerifier(),
    private readonly saves: SaveService = playerSave,
  ) {}

  async loadPrices(): Promise<readonly StoreProduct[]> {
    const result = await this.billing()?.queryProducts(
      PRODUCT_CATALOG.map((item) => item.id),
    );
    if (result?.status !== "success") return [];
    for (const item of result.value) this.prices.set(item.id, item.formattedPrice);
    return result.value;
  }

  displayPrice(productId: string): string {
    return this.prices.get(productId) ?? catalogProduct(productId).displayPriceFallback;
  }

  async purchase(productId: string): Promise<PurchaseOutcome> {
    const billing = this.billing();
    if (!billing?.enabled) return { status: "unavailable", message: "商店尚未接线" };
    const transactionId = `purchase:${productId}:${Date.now()}`;
    await this.upsertPending({
      id: transactionId,
      productId,
      platform: "android",
      state: "purchasing",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    Analytics.track("purchase_start", { productId });
    const purchased = await billing.purchase(productId);
    if (purchased.status === "cancelled") {
      await this.removePending(transactionId);
      Analytics.track("purchase_cancel", { productId });
      return { status: "cancelled" };
    }
    if (purchased.status !== "success") {
      await this.failPending(transactionId);
      Analytics.track("purchase_fail", { productId, reason: purchased.status });
      return { status: purchased.status === "unavailable" ? "unavailable" : "failed" };
    }
    await this.upsertPending({
      id: transactionId,
      productId,
      platform: "android",
      purchaseToken: purchased.value.purchaseToken,
      state: "awaiting_verification",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return this.verifyAndGrant(transactionId, purchased.value);
  }

  async restore(): Promise<number> {
    const billing = this.billing();
    if (!billing?.enabled) return 0;
    const restored = await billing.restore();
    if (restored.status !== "success") return 0;
    let count = 0;
    for (const purchase of restored.value) {
      const product = catalogProduct(purchase.productId);
      if (product.kind === "coins") continue;
      const outcome = await this.verifyAndGrant(
        `restore:${purchase.purchaseToken}`,
        purchase,
      );
      if (outcome.status === "granted") count += 1;
    }
    Analytics.track("purchase_restore", { count });
    return count;
  }

  async syncRevocations(): Promise<void> {
    if (!this.verifier.syncRevocations) return;
    const result = await this.verifier.syncRevocations();
    const save = this.saves.get();
    const entitlements: PlayerSave["entitlements"] = {};
    const activeIds = new Set(result.entitlements.map((item) => item.productId));
    const revokedProductIds = Array.from(
      new Set([
        ...result.revokedProductIds,
        ...Object.keys(save.entitlements).filter((id) => !activeIds.has(id)),
      ]),
    );
    const paidCosmeticIds = PRODUCT_CATALOG.flatMap((product) =>
      product.cosmeticId ? [product.cosmeticId] : [],
    );
    const cosmetics = save.cosmetics.filter(
      (id) => !paidCosmeticIds.includes(id),
    );
    for (const item of result.entitlements) {
      entitlements[item.productId] = {
        productId: item.productId,
        source: "google-play",
        verifiedAt: item.verifiedAt,
        authorityExpiresAt: item.authorityExpiresAt,
        authorityToken: item.authorityToken,
      };
      const product = catalogProduct(item.productId);
      if (product.cosmeticId && !cosmetics.includes(product.cosmeticId)) {
        cosmetics.push(product.cosmeticId);
      }
    }
    await this.saves.save({ ...save, entitlements, cosmetics });
    Analytics.track("entitlement_sync", {
      revoked: revokedProductIds.length,
      active: result.entitlements.length,
    });
  }

  async retryPendingFinalizations(): Promise<number> {
    const billing = this.billing();
    if (!billing?.enabled) return 0;
    let completed = 0;
    for (const pending of this.saves.get().pendingTransactions) {
      if (
        pending.state !== "finalize_pending" ||
        !pending.purchaseToken ||
        !pending.verifiedAt ||
        !pending.authorityExpiresAt ||
        !pending.authorityToken
      ) continue;
      const product = catalogProduct(pending.productId);
      const finalized = await this.finalize(product.kind, pending.purchaseToken);
      if (finalized.status !== "success") continue;
      await this.grantVerified(
        pending.id,
        { productId: pending.productId, purchaseToken: pending.purchaseToken },
        {
          verifiedAt: pending.verifiedAt,
          authorityExpiresAt: pending.authorityExpiresAt,
          authorityToken: pending.authorityToken,
        },
      );
      completed += 1;
    }
    return completed;
  }

  private async verifyAndGrant(
    pendingId: string,
    purchase: StorePurchase,
  ): Promise<PurchaseOutcome> {
    const verified = await this.verifier.verify(purchase);
    if (
      verified.status !== "verified" ||
      verified.productId !== purchase.productId ||
      verified.purchaseToken !== purchase.purchaseToken ||
      !verified.authenticatedUserId ||
      !verified.verifiedAt ||
      !verified.authorityExpiresAt ||
      !verified.authorityToken
    ) {
      await this.failPending(pendingId);
      Analytics.track("receipt_verify", {
        productId: purchase.productId,
        status: verified.status,
      });
      return { status: verified.status === "unavailable" ? "unavailable" : "failed" };
    }
    const product = catalogProduct(purchase.productId);
    if (verified.alreadyProcessed) {
      await this.removePending(pendingId);
      if (
        product.kind !== "coins" &&
        verified.entitlementActive === true
      ) {
        await this.grantVerified(pendingId, purchase, {
          verifiedAt: verified.verifiedAt,
          authorityExpiresAt: verified.authorityExpiresAt,
          authorityToken: verified.authorityToken,
        });
        return { status: "granted", productId: product.id };
      }
      return { status: "failed", message: "票据已处理，未重复发奖" };
    }
    await this.upsertPending({
      id: pendingId,
      productId: purchase.productId,
      platform: "android",
      purchaseToken: purchase.purchaseToken,
      state: "finalize_pending",
      verifiedAt: verified.verifiedAt,
      authorityExpiresAt: verified.authorityExpiresAt,
      authorityToken: verified.authorityToken,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const finalized = await this.finalize(product.kind, purchase.purchaseToken);
    if (finalized.status !== "success") {
      return { status: "failed", message: "购买已验证，等待平台完成确认" };
    }
    await this.grantVerified(pendingId, purchase, {
      verifiedAt: verified.verifiedAt,
      authorityExpiresAt: verified.authorityExpiresAt,
      authorityToken: verified.authorityToken,
    });
    return { status: "granted", productId: product.id };
  }

  private async grantVerified(
    pendingId: string,
    purchase: StorePurchase,
    authority: {
      verifiedAt: number;
      authorityExpiresAt: number;
      authorityToken: string;
    },
  ): Promise<void> {
    const product = catalogProduct(purchase.productId);
    const save = this.saves.get();
    const next: PlayerSave = {
      ...save,
      coins: save.coins + (product.coinAmount ?? 0),
      entitlements:
        product.kind === "permanent"
          ? {
              ...save.entitlements,
              [product.id]: {
                productId: product.id,
                source: "google-play",
                ...authority,
              },
            }
          : save.entitlements,
      cosmetics:
        product.kind === "cosmetic" && product.cosmeticId
          ? Array.from(new Set([...save.cosmetics, product.cosmeticId]))
          : save.cosmetics,
      pendingTransactions: save.pendingTransactions.filter(
        (item) => item.id !== pendingId,
      ),
    };
    await this.saves.save(next);
    Analytics.track("purchase_grant", { productId: product.id, kind: product.kind });
  }

  private async finalize(
    kind: ReturnType<typeof catalogProduct>["kind"],
    purchaseToken: string,
  ): Promise<StoreResult<true>> {
    const billing = this.billing();
    if (!billing?.enabled) return { status: "unavailable" };
    return kind === "coins"
      ? billing.consume(purchaseToken)
      : billing.acknowledge(purchaseToken);
  }

  private async upsertPending(transaction: PendingTransaction): Promise<void> {
    const save = this.saves.get();
    await this.saves.save({
      ...save,
      pendingTransactions: [
        ...save.pendingTransactions.filter((item) => item.id !== transaction.id),
        transaction,
      ].slice(-20),
    });
  }

  private async failPending(id: string): Promise<void> {
    const save = this.saves.get();
    await this.saves.save({
      ...save,
      pendingTransactions: save.pendingTransactions.map((item) =>
        item.id === id
          ? { ...item, state: "verification_failed", updatedAt: Date.now() }
          : item,
      ),
    });
  }

  private async removePending(id: string): Promise<void> {
    const save = this.saves.get();
    await this.saves.save({
      ...save,
      pendingTransactions: save.pendingTransactions.filter((item) => item.id !== id),
    });
  }
}
