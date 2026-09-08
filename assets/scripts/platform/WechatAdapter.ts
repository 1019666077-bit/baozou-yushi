import {
  DisabledMonetization,
  NoopLifecycle,
  type PlatformAdapter,
  type PlatformCapabilities,
  type PlatformLifecycle,
} from "./PlatformAdapter";
import {
  canShowFriendBoardForSession,
  resolveLoginCode,
  wechatSessionKind,
} from "../domain/WechatSession";

interface WechatApi {
  getSystemInfoSync(): {
    platform?: string;
    benchmarkLevel?: number;
    screenWidth?: number;
  };
  vibrateShort(options?: { type?: "light" | "medium" | "heavy" }): void;
  setStorageSync(key: string, value: unknown): void;
  getStorageSync(key: string): unknown;
  removeStorageSync?(key: string): void;
  login(options: {
    success: (result: { code: string }) => void;
    fail: (error: unknown) => void;
  }): void;
  cloud?: {
    init(options?: { traceUser?: boolean; env?: string }): void;
    callFunction(options: {
      name: string;
      data?: unknown;
      success: (result: { result: unknown }) => void;
      fail: (error: unknown) => void;
    }): void;
  };
  getPrivacySetting?(options: {
    success: (result: {
      needAuthorization: boolean;
      privacyContractName?: string;
    }) => void;
    fail?: (error: unknown) => void;
  }): void;
  requirePrivacyAuthorize?(options: {
    success?: () => void;
    fail?: (error: unknown) => void;
  }): void;
  openPrivacyContract?(options?: {
    success?: () => void;
    fail?: (error: unknown) => void;
  }): void;
  getOpenDataContext?: () => {
    canvas?: { width: number; height: number };
    postMessage(message: unknown): void;
  };
}

interface CloudMutationResult {
  ok: boolean;
  error?: string;
  save?: unknown;
}

declare const wx: WechatApi | undefined;

export const CLOUD_CALL_TIMEOUT_MS = 6000;

function wxApi(): WechatApi | undefined {
  const fromGlobal = (globalThis as { wx?: WechatApi }).wx;
  if (fromGlobal) return fromGlobal;
  try {
    return typeof wx !== "undefined" ? wx : undefined;
  } catch {
    return undefined;
  }
}

const CAPABILITIES: PlatformCapabilities = {
  localSave: true,
  dataSave: false,
  cloudSave: true,
  analytics: true,
  leaderboard: true,
  friendLeaderboard: true,
  vibration: true,
  ads: false,
  billing: false,
  lifecycle: false,
};

export function isWechatAvailable(): boolean {
  return !!wxApi();
}

export class WechatAdapter implements PlatformAdapter {
  private static loginCode: string | null = null;
  readonly kind = "wechat" as const;
  readonly capabilities: PlatformCapabilities;
  readonly monetization = new DisabledMonetization();
  readonly lifecycle: PlatformLifecycle;
  readonly localSave = {
    get: <T>(key: string): T | null =>
      isWechatAvailable()
        ? ((wxApi()?.getStorageSync(key) as T) ?? null)
        : null,
    set: (key: string, value: unknown): void =>
      wxApi()?.setStorageSync(key, value),
    remove: (key: string): void => wxApi()?.removeStorageSync?.(key),
  };
  readonly cloudSave = {
    load: async <T>(): Promise<T | null> => {
      const result = await WechatAdapter.callCloud<{ save: T | null }>(
        "loadSave",
      );
      return result.save;
    },
    save: <T>(save: T): Promise<void> =>
      WechatAdapter.callCloud<CloudMutationResult>("saveGame", { save }).then(
        (result) => WechatAdapter.requireCloudMutation(result, "saveGame"),
      ),
    delete: (): Promise<void> =>
      WechatAdapter.callCloud<CloudMutationResult>("deleteSave").then(
        (result) => WechatAdapter.requireCloudMutation(result, "deleteSave"),
      ),
  };
  readonly analytics = {
    send: (events: readonly unknown[]): Promise<void> =>
      WechatAdapter.callCloud("reportEvents", { events }).then(() => undefined),
  };
  readonly leaderboard = {
    submit: <T>(
      run: T,
    ): Promise<{ ok: boolean; score?: number; reasons?: string[] }> =>
      WechatAdapter.callCloud("submitScore", { run }),
    submitStyleScore: (score: number): void =>
      WechatAdapter.submitStyleScore(score),
  };
  readonly remoteConfig = {
    load: <T>(): Promise<T> =>
      WechatAdapter.callCloud<{ config: T }>("getRemoteConfig").then(
        (result) => result.config,
      ),
  };
  readonly dailyClaims = {
    serverNow: (): Promise<number> =>
      WechatAdapter.callCloud<CloudMutationResult & { serverNow: number }>(
        "claimDailyOrder",
        { action: "server_time" },
      ).then((result) => {
        WechatAdapter.requireCloudMutation(
          result,
          "claimDailyOrder.serverTime",
        );
        return result.serverNow;
      }),
    recordRun: (run: unknown, orderIds: readonly string[]): Promise<void> =>
      WechatAdapter.callCloud<CloudMutationResult>("claimDailyOrder", {
        action: "record_run",
        run,
        orderIds,
      }).then((result) =>
        WechatAdapter.requireCloudMutation(result, "claimDailyOrder.recordRun"),
      ),
    claim: (
      orderId: string,
    ): Promise<{
      status: "granted" | "already_claimed";
      serverNow: number;
      reward: { kind: "coins" | "cosmeticShards"; amount: number };
    }> =>
      WechatAdapter.callCloud<
        CloudMutationResult & {
          status: "granted" | "already_claimed";
          serverNow: number;
          reward: { kind: "coins" | "cosmeticShards"; amount: number };
        }
      >("claimDailyOrder", { action: "claim", orderId }).then((result) => {
        WechatAdapter.requireCloudMutation(result, "claimDailyOrder.claim");
        return result;
      }),
  };

  constructor(
    private readonly cloudEnv?: string,
    lifecycle?: PlatformLifecycle,
  ) {
    this.lifecycle = lifecycle ?? new NoopLifecycle();
    this.capabilities = { ...CAPABILITIES, lifecycle: lifecycle !== undefined };
  }

  initialize(): Promise<void> {
    WechatAdapter.initializeCloud(this.cloudEnv);
    return Promise.resolve();
  }

  gameplayStart(): void {}
  gameplayStop(): void {}
  vibrate(): void {
    wxApi()?.vibrateShort({ type: "light" });
  }
  isLowEndDevice(): boolean {
    const level = wxApi()?.getSystemInfoSync().benchmarkLevel ?? 30;
    return level > 0 && level < 15;
  }

  static get available(): boolean {
    return isWechatAvailable();
  }

  static get signedIn(): boolean {
    return !!this.loginCode;
  }

  static sessionKind() {
    return wechatSessionKind({
      wechatAvailable: this.available,
      loginCode: this.loginCode,
    });
  }

  static forgetSession(): void {
    this.loginCode = null;
  }

  static initializeCloud(env?: string): void {
    const api = wxApi();
    if (!api?.cloud) return;
    try {
      api.cloud.init({ traceUser: true, ...(env ? { env } : {}) });
    } catch {
      // Editor previews may expose a partial wx object without cloud support.
    }
  }

  static login(): Promise<string | null> {
    const api = wxApi();
    if (!api) {
      this.loginCode = null;
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      try {
        api.login({
          success: ({ code }) => {
            this.loginCode = resolveLoginCode({
              wechatAvailable: true,
              code,
            });
            resolve(this.loginCode);
          },
          fail: () => {
            this.loginCode = null;
            resolve(null);
          },
        });
      } catch {
        this.loginCode = null;
        resolve(null);
      }
    });
  }

  static callCloud<T>(name: string, data?: unknown): Promise<T> {
    const api = wxApi();
    if (!api?.cloud || !this.signedIn) {
      return Promise.reject(new Error("WeChat cloud is unavailable"));
    }
    const cloud = api.cloud;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("cloud timeout")),
        CLOUD_CALL_TIMEOUT_MS,
      );
      cloud.callFunction({
        name,
        data,
        success: ({ result }) => {
          clearTimeout(timer);
          resolve(result as T);
        },
        fail: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  private static requireCloudMutation(
    result: CloudMutationResult,
    operation: string,
  ): void {
    if (result?.ok === true) return;
    throw new Error(
      `${operation} rejected: ${result?.error ?? "invalid cloud response"}`,
    );
  }

  static async ensurePrivacyAuthorized(): Promise<boolean> {
    const api = wxApi();
    if (!api?.getPrivacySetting) return true;
    return new Promise((resolve) => {
      api.getPrivacySetting!({
        success: ({ needAuthorization }) => {
          if (!needAuthorization || !api.requirePrivacyAuthorize) {
            resolve(true);
            return;
          }
          api.requirePrivacyAuthorize({
            success: () => resolve(true),
            fail: () => resolve(false),
          });
        },
        fail: () => resolve(true),
      });
    });
  }

  static openPrivacyContract(): void {
    wxApi()?.openPrivacyContract?.();
  }

  static canShowFriendBoard(): boolean {
    return canShowFriendBoardForSession(
      this.sessionKind(),
      !!wxApi()?.getOpenDataContext,
    );
  }

  static friendCanvas(): { width: number; height: number } | null {
    if (!this.canShowFriendBoard()) return null;
    return wxApi()?.getOpenDataContext?.()?.canvas ?? null;
  }

  static prepareFriendCanvas(width: number, height: number): void {
    const canvas = this.friendCanvas();
    if (!canvas) return;
    const nextWidth = Math.max(640, Math.round(width));
    const nextHeight = Math.max(240, Math.round(height));
    if (canvas.width !== nextWidth) canvas.width = nextWidth;
    if (canvas.height !== nextHeight) canvas.height = nextHeight;
  }

  static submitStyleScore(score: number): void {
    // Scores are written only by the validated submitScore cloud function.
    void score;
  }

  static requestFriendRank(selfScore = 0): void {
    if (!this.signedIn) return;
    wxApi()?.getOpenDataContext?.()?.postMessage({
      type: "showFriendRank",
      key: "best_style",
      selfScore,
    });
  }
}
