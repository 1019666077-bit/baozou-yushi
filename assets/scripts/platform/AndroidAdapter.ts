import {
  DisabledMonetization,
  NoopLifecycle,
  type AdPlacement,
  type AdResult,
  type BillingAdapter,
  type MonetizationAdapter,
  type PlatformAdapter,
  type PlatformCapabilities,
  type PlatformLifecycle,
  type StoreProduct,
  type StorePurchase,
  type StoreResult,
} from "./PlatformAdapter";
import { JsonLocalSave, type WebStorageLike } from "./WebLocalAdapter";

export interface AndroidJsbBridge {
  vibrate?(milliseconds: number): void;
  trackEvents?(json: string): void;
  submitScore?(json: string): void;
  showAd?(
    placement: AdPlacement,
    callback: (status: "completed" | "cancelled" | "error") => void,
  ): void;
  billingRequest?(
    requestJson: string,
    callback: (responseJson: string) => void,
  ): void;
}

declare global {
  var __BAOZOU_ANDROID_BRIDGE__: AndroidJsbBridge | undefined;
}

export interface CocosSysLike {
  readonly isNative: boolean;
  readonly os: string;
  readonly OS?: { readonly ANDROID?: string };
  readonly localStorage: WebStorageLike;
}

function androidBridge(): AndroidJsbBridge | undefined {
  return globalThis.__BAOZOU_ANDROID_BRIDGE__;
}

class AndroidMonetization implements MonetizationAdapter {
  readonly enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  show(placement: AdPlacement, timeoutMs = 10_000): Promise<AdResult> {
    const bridge = androidBridge();
    if (!this.enabled || !bridge?.showAd) {
      return Promise.resolve({ status: "unavailable" });
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: AdResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => finish({ status: "timeout" }), timeoutMs);
      try {
        bridge.showAd?.(placement, (status) => {
          if (status === "completed") finish({ status });
          else if (status === "cancelled") finish({ status });
          else finish({ status: "error", message: "Android ad bridge failed" });
        });
      } catch (error) {
        finish({
          status: "error",
          message: error instanceof Error ? error.message : "Android ad bridge failed",
        });
      }
    });
  }
}

type BillingOperation =
  | "queryProducts"
  | "purchase"
  | "acknowledge"
  | "consume"
  | "restore";

interface NativeBillingResponse {
  requestId: string;
  status: "success" | "cancelled" | "error";
  message?: string;
  products?: StoreProduct[];
  purchase?: StorePurchase;
  purchases?: StorePurchase[];
}

export class AndroidBilling implements BillingAdapter {
  readonly enabled: boolean;
  private sequence = 0;

  constructor(
    private readonly bridge: () => AndroidJsbBridge | undefined = androidBridge,
    private readonly timeoutMs = 15_000,
  ) {
    this.enabled = typeof this.bridge()?.billingRequest === "function";
  }

  queryProducts(ids: readonly string[]): Promise<StoreResult<StoreProduct[]>> {
    return this.request<StoreProduct[]>("queryProducts", { ids }, (value) =>
      Array.isArray(value.products) ? value.products : [],
    );
  }

  purchase(productId: string): Promise<StoreResult<StorePurchase>> {
    return this.request<StorePurchase>("purchase", { productId }, (value) => {
      if (!value.purchase?.purchaseToken) throw new Error("Missing purchase token");
      return value.purchase;
    });
  }

  acknowledge(purchaseToken: string): Promise<StoreResult<true>> {
    return this.request<true>("acknowledge", { purchaseToken }, () => true);
  }

  consume(purchaseToken: string): Promise<StoreResult<true>> {
    return this.request<true>("consume", { purchaseToken }, () => true);
  }

  restore(): Promise<StoreResult<StorePurchase[]>> {
    return this.request<StorePurchase[]>("restore", {}, (value) =>
      Array.isArray(value.purchases) ? value.purchases : [],
    );
  }

  private request<T>(
    operation: BillingOperation,
    payload: Record<string, unknown>,
    extract: (response: NativeBillingResponse) => T,
  ): Promise<StoreResult<T>> {
    const native = this.bridge();
    const billingRequest = native?.billingRequest;
    if (!this.enabled || !billingRequest) {
      return Promise.resolve({ status: "unavailable" });
    }
    const requestId = `billing_${Date.now()}_${++this.sequence}`;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: StoreResult<T>): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => finish({ status: "timeout" }), this.timeoutMs);
      try {
        billingRequest(
          JSON.stringify({ requestId, operation, ...payload }),
          (raw) => {
            try {
              const response = JSON.parse(raw) as NativeBillingResponse;
              if (response.requestId !== requestId) return;
              if (response.status === "cancelled") {
                finish({ status: "cancelled" });
              } else if (response.status === "error") {
                finish({ status: "error", message: response.message ?? "Billing failed" });
              } else {
                finish({ status: "success", value: extract(response) });
              }
            } catch (error) {
              finish({
                status: "error",
                message: error instanceof Error ? error.message : "Invalid billing response",
              });
            }
          },
        );
      } catch (error) {
        finish({
          status: "error",
          message: error instanceof Error ? error.message : "Billing bridge failed",
        });
      }
    });
  }
}

export interface AndroidAdapterOptions {
  lifecycle?: PlatformLifecycle;
  adsEnabled?: boolean;
}

export class AndroidAdapter implements PlatformAdapter {
  readonly kind = "android" as const;
  readonly capabilities: PlatformCapabilities;
  readonly localSave;
  readonly monetization: MonetizationAdapter;
  readonly billing: BillingAdapter;
  readonly lifecycle: PlatformLifecycle;
  readonly analytics = {
    send: async (events: readonly unknown[]): Promise<void> => {
      androidBridge()?.trackEvents?.(JSON.stringify(events));
    },
  };
  readonly leaderboard = {
    submit: async <T>(
      run: T,
    ): Promise<{ ok: boolean; score?: number; reasons?: string[] }> => {
      const bridge = androidBridge();
      if (!bridge?.submitScore) return { ok: false, reasons: ["bridge_unavailable"] };
      bridge.submitScore(JSON.stringify(run));
      return { ok: true };
    },
    submitStyleScore: (score: number): void => {
      androidBridge()?.submitScore?.(JSON.stringify({ bestStyleScore: score }));
    },
  };

  constructor(
    readonly cocosSys: CocosSysLike,
    options: AndroidAdapterOptions = {},
  ) {
    this.localSave = new JsonLocalSave(cocosSys.localStorage);
    this.lifecycle = options.lifecycle ?? new NoopLifecycle();
    const bridge = androidBridge();
    const adsEnabled = options.adsEnabled === true;
    this.monetization = adsEnabled
      ? new AndroidMonetization(true)
      : new DisabledMonetization();
    this.billing = new AndroidBilling();
    this.capabilities = {
      localSave: true,
      dataSave: false,
      cloudSave: false,
      analytics: !!bridge?.trackEvents,
      leaderboard: !!bridge?.submitScore,
      friendLeaderboard: false,
      vibration: !!bridge?.vibrate,
      ads: adsEnabled && !!bridge?.showAd,
      billing: this.billing.enabled,
      lifecycle: true,
    };
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  gameplayStart(): void {}
  gameplayStop(): void {}
  vibrate(): void {
    try {
      androidBridge()?.vibrate?.(20);
    } catch {
      // A missing or stale JSB object must never break gameplay.
    }
  }
  isLowEndDevice(): boolean {
    return false;
  }
}

export function isAndroidCocos(sys?: CocosSysLike): sys is CocosSysLike {
  if (!sys?.isNative) return false;
  const androidName = sys.OS?.ANDROID ?? "Android";
  return sys.os === androidName || sys.os.toLowerCase() === "android";
}
