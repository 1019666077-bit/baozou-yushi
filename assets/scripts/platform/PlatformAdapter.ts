export type PlatformKind = "wechat" | "web-local" | "crazygames" | "android";

export interface PlatformCapabilities {
  readonly localSave: boolean;
  readonly dataSave: boolean;
  readonly cloudSave: boolean;
  readonly analytics: boolean;
  readonly leaderboard: boolean;
  readonly friendLeaderboard: boolean;
  readonly vibration: boolean;
  readonly ads: boolean;
  readonly billing: boolean;
  readonly lifecycle: boolean;
}

export interface LocalSavePort {
  get<T>(key: string): T | null;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}

export interface CloudSavePort {
  load<T>(): Promise<T | null>;
  save<T>(value: T): Promise<void>;
  delete(): Promise<void>;
}

export interface AnalyticsPort {
  send(events: readonly unknown[]): Promise<void>;
}

export interface LeaderboardPort {
  submit<T>(run: T): Promise<{ ok: boolean; score?: number; reasons?: string[] }>;
  submitStyleScore(score: number): void;
}

export interface RemoteConfigPort {
  load<T>(): Promise<T>;
}

export interface DailyClaimPort {
  serverNow(): Promise<number>;
  recordRun(
    run: unknown,
    orderIds: readonly string[],
  ): Promise<void>;
  claim(orderId: string): Promise<{
    status: "granted" | "already_claimed";
    serverNow: number;
    reward: { kind: "coins" | "cosmeticShards"; amount: number };
  }>;
}

export interface PlatformLifecycle {
  onHidden(listener: () => void): () => void;
  onShown(listener: () => void): () => void;
}

export type AdPlacement = "rewarded" | "interstitial";
export type AdResult =
  | { status: "completed" }
  | { status: "cancelled" }
  | { status: "unavailable" }
  | { status: "timeout" }
  | { status: "error"; message: string };

export interface MonetizationAdapter {
  readonly enabled: boolean;
  show(placement: AdPlacement, timeoutMs?: number): Promise<AdResult>;
}

export interface StoreProduct {
  id: string;
  formattedPrice: string;
  currencyCode?: string;
}

export interface StorePurchase {
  productId: string;
  purchaseToken: string;
  transactionId?: string;
}

export type StoreResult<T> =
  | { status: "success"; value: T }
  | { status: "cancelled" }
  | { status: "unavailable" }
  | { status: "timeout" }
  | { status: "error"; message: string };

export interface BillingAdapter {
  readonly enabled: boolean;
  queryProducts(ids: readonly string[]): Promise<StoreResult<StoreProduct[]>>;
  purchase(productId: string): Promise<StoreResult<StorePurchase>>;
  acknowledge(purchaseToken: string): Promise<StoreResult<true>>;
  consume(purchaseToken: string): Promise<StoreResult<true>>;
  restore(): Promise<StoreResult<StorePurchase[]>>;
}

export interface PlatformAdapter {
  readonly kind: PlatformKind;
  readonly capabilities: PlatformCapabilities;
  readonly localSave: LocalSavePort;
  readonly cloudSave?: CloudSavePort;
  readonly analytics?: AnalyticsPort;
  readonly leaderboard?: LeaderboardPort;
  readonly remoteConfig?: RemoteConfigPort;
  readonly dailyClaims?: DailyClaimPort;
  readonly monetization: MonetizationAdapter;
  readonly billing?: BillingAdapter;
  readonly lifecycle: PlatformLifecycle;
  initialize(): Promise<void>;
  gameplayStart(): void;
  gameplayStop(): void;
  vibrate(): void;
  isLowEndDevice(): boolean;
}

export class DisabledMonetization implements MonetizationAdapter {
  readonly enabled = false;

  show(): Promise<AdResult> {
    return Promise.resolve({ status: "unavailable" });
  }
}

export class NoopLifecycle implements PlatformLifecycle {
  onHidden(): () => void {
    return () => undefined;
  }

  onShown(): () => void {
    return () => undefined;
  }
}
