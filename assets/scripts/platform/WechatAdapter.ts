import {
  DisabledMonetization,
  NoopLifecycle,
  type PlatformAdapter,
  type PlatformCapabilities,
  type PlatformLifecycle,
} from "./PlatformAdapter";

interface WechatApi {
  getSystemInfoSync(): { platform?: string; benchmarkLevel?: number; screenWidth?: number };
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
  setUserCloudStorage?(options: {
    KVDataList: Array<{ key: string; value: string }>;
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
  return typeof wx !== "undefined";
}

export class WechatAdapter implements PlatformAdapter {
  readonly kind = "wechat" as const;
  readonly capabilities: PlatformCapabilities;
  readonly monetization = new DisabledMonetization();
  readonly lifecycle: PlatformLifecycle;
  readonly localSave = {
    get: <T>(key: string): T | null =>
      isWechatAvailable() ? ((wx?.getStorageSync(key) as T) ?? null) : null,
    set: (key: string, value: unknown): void => wx?.setStorageSync(key, value),
    remove: (key: string): void => wx?.removeStorageSync?.(key),
  };
  readonly cloudSave = {
    load: async <T>(): Promise<T | null> => {
      const result = await WechatAdapter.callCloud<{ save: T | null }>("loadSave");
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
    submit: <T>(run: T): Promise<{ ok: boolean; score?: number; reasons?: string[] }> =>
      WechatAdapter.callCloud("submitScore", { run }),
    submitStyleScore: (score: number): void => WechatAdapter.submitStyleScore(score),
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
        WechatAdapter.requireCloudMutation(result, "claimDailyOrder.serverTime");
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
    claim: (orderId: string): Promise<{
      status: "granted" | "already_claimed";
      serverNow: number;
      reward: { kind: "coins" | "cosmeticShards"; amount: number };
    }> =>
      WechatAdapter.callCloud<CloudMutationResult & {
        status: "granted" | "already_claimed";
        serverNow: number;
        reward: { kind: "coins" | "cosmeticShards"; amount: number };
      }>("claimDailyOrder", { action: "claim", orderId }).then((result) => {
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
    wx?.vibrateShort({ type: "light" });
  }
  isLowEndDevice(): boolean {
    const level = wx?.getSystemInfoSync().benchmarkLevel ?? 30;
    return level > 0 && level < 15;
  }

  static get available(): boolean {
    return isWechatAvailable();
  }

  static initializeCloud(env?: string): void {
    if (!wx?.cloud) return;
    wx.cloud.init({ traceUser: true, ...(env ? { env } : {}) });
  }

  static login(): Promise<string | null> {
    if (!wx) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      wx.login({ success: ({ code }) => resolve(code), fail: reject });
    });
  }

  static callCloud<T>(name: string, data?: unknown): Promise<T> {
    if (!wx?.cloud) return Promise.reject(new Error("WeChat cloud is unavailable"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("cloud timeout")), 800);
      wx.cloud?.callFunction({
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

  static canShowFriendBoard(): boolean {
    return !!wx?.getOpenDataContext;
  }

  static friendCanvas(): { width: number; height: number } | null {
    return wx?.getOpenDataContext?.()?.canvas ?? null;
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
    wx?.setUserCloudStorage?.({
      KVDataList: [{
        key: "best_style",
        value: JSON.stringify({
          wxgame: { score, update_time: Math.floor(Date.now() / 1000) },
        }),
      }],
    });
  }

  static requestFriendRank(selfScore = 0): void {
    wx?.getOpenDataContext?.()?.postMessage({
      type: "showFriendRank",
      key: "best_style",
      selfScore,
    });
  }
}
