import {
  DisabledMonetization,
  type AdPlacement,
  type AdResult,
  type CloudSavePort,
  type MonetizationAdapter,
  type PlatformAdapter,
  type PlatformCapabilities,
} from "./PlatformAdapter";
import {
  WEB_CAPABILITIES,
  WebLocalAdapter,
  type WebStorageLike,
} from "./WebLocalAdapter";

interface CrazyGamesSdk {
  init(): Promise<void>;
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
  };
  data?: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  ad?: {
    requestAd(
      kind: "rewarded" | "midgame",
      callbacks: {
        adStarted?: () => void;
        adFinished?: () => void;
        adError?: (error: { message?: string }) => void;
      },
    ): void;
  };
}

interface CrazyGamesNamespace {
  SDK?: CrazyGamesSdk;
}

declare global {
  var CrazyGames: CrazyGamesNamespace | undefined;
}

function sdk(): CrazyGamesSdk | undefined {
  return typeof CrazyGames === "undefined" ? undefined : CrazyGames?.SDK;
}

export function isCrazyGamesSdkAvailable(): boolean {
  return typeof sdk()?.init === "function";
}

const CRAZY_SAVE_KEY = "baozou_yushi_save_v1";

class CrazyCloudSave implements CloudSavePort {
  async load<T>(): Promise<T | null> {
    const data = sdk()?.data;
    if (!data) return null;
    const raw = await data.getItem(CRAZY_SAVE_KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  async save<T>(value: T): Promise<void> {
    const data = sdk()?.data;
    if (!data) throw new Error("CrazyGames Data is unavailable");
    await data.setItem(CRAZY_SAVE_KEY, JSON.stringify(value));
  }

  async delete(): Promise<void> {
    const data = sdk()?.data;
    if (!data) throw new Error("CrazyGames Data is unavailable");
    await data.removeItem(CRAZY_SAVE_KEY);
  }
}

class CrazyGamesMonetization implements MonetizationAdapter {
  readonly enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  show(placement: AdPlacement, timeoutMs = 10_000): Promise<AdResult> {
    const ad = sdk()?.ad;
    if (!this.enabled || !ad) return Promise.resolve({ status: "unavailable" });
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: AdResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timer = setTimeout(() => finish({ status: "timeout" }), timeoutMs);
      ad.requestAd(placement === "interstitial" ? "midgame" : "rewarded", {
        adFinished: () => finish({ status: "completed" }),
        adError: (error) =>
          finish({
            status: error.message === "User cancelled" ? "cancelled" : "error",
            ...(error.message === "User cancelled"
              ? {}
              : { message: error.message ?? "CrazyGames ad failed" }),
          } as AdResult),
      });
    });
  }
}

export interface CrazyGamesOptions {
  /** Basic Launch must leave this false. */
  adsEnabled?: boolean;
  storage?: WebStorageLike;
}

export class CrazyGamesAdapter extends WebLocalAdapter implements PlatformAdapter {
  readonly kind = "crazygames" as const;
  readonly capabilities: PlatformCapabilities;
  readonly cloudSave?: CloudSavePort;
  readonly monetization: MonetizationAdapter;

  constructor(options: CrazyGamesOptions = {}) {
    super(options.storage);
    if (isCrazyGamesSdkAvailable() && sdk()?.data) {
      this.cloudSave = new CrazyCloudSave();
    }
    const adsEnabled = options.adsEnabled === true;
    this.monetization = adsEnabled
      ? new CrazyGamesMonetization(true)
      : new DisabledMonetization();
    this.capabilities = {
      ...WEB_CAPABILITIES,
      dataSave: isCrazyGamesSdkAvailable() && !!sdk()?.data,
      cloudSave: !!this.cloudSave,
      ads: adsEnabled && !!sdk()?.ad,
    };
  }

  override async initialize(): Promise<void> {
    const current = sdk();
    if (!current) throw new Error("CrazyGames HTML5 SDK is unavailable");
    await current.init();
  }

  override gameplayStart(): void {
    sdk()?.game.gameplayStart();
  }

  override gameplayStop(): void {
    sdk()?.game.gameplayStop();
  }
}
