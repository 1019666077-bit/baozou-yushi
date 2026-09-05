declare const wx:
  | {
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
  | undefined;

export const CLOUD_CALL_TIMEOUT_MS = 6000;

export class WechatAdapter {
  static get available(): boolean {
    return typeof wx !== "undefined";
  }

  static initializeCloud(env?: string): void {
    if (!this.available || !wx?.cloud) return;
    wx.cloud.init({ traceUser: true, ...(env ? { env } : {}) });
  }

  static login(): Promise<string | null> {
    if (!this.available || !wx) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      wx.login({
        success: ({ code }) => resolve(code),
        fail: reject,
      });
    });
  }

  static callCloud<T>(name: string, data?: unknown): Promise<T> {
    if (!this.available || !wx?.cloud) {
      return Promise.reject(new Error("WeChat cloud is unavailable"));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("cloud timeout")),
        CLOUD_CALL_TIMEOUT_MS,
      );
      wx.cloud!.callFunction({
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

  /**
   * 微信小游戏隐私授权。编辑器/非微信环境直接通过。
   * 拒绝授权时仍返回 false，调用方不得阻断单人主流程。
   */
  static async ensurePrivacyAuthorized(): Promise<boolean> {
    if (!this.available || !wx) return true;
    const getSetting = wx.getPrivacySetting;
    if (typeof getSetting !== "function") return true;
    return new Promise((resolve) => {
      getSetting.call(wx, {
        success: (res) => {
          if (!res.needAuthorization) {
            resolve(true);
            return;
          }
          const requireAuth = wx?.requirePrivacyAuthorize;
          if (typeof requireAuth !== "function") {
            resolve(true);
            return;
          }
          requireAuth.call(wx, {
            success: () => resolve(true),
            fail: () => resolve(false),
          });
        },
        fail: () => resolve(true),
      });
    });
  }

  static openPrivacyContract(): void {
    if (!this.available || typeof wx?.openPrivacyContract !== "function") return;
    wx.openPrivacyContract();
  }

  static vibrate(): void {
    if (typeof wx !== "undefined") wx?.vibrateShort({ type: "light" });
  }

  static isLowEndDevice(): boolean {
    if (!this.available || !wx) return false;
    const info = wx.getSystemInfoSync();
    return (info.benchmarkLevel ?? 30) > 0 && (info.benchmarkLevel ?? 30) < 15;
  }

  static setLocal(key: string, value: unknown): void {
    if (this.available && wx) {
      wx.setStorageSync(key, value);
      return;
    }
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  }

  static getLocal<T>(key: string): T | null {
    if (this.available && wx) {
      return (wx.getStorageSync(key) as T) ?? null;
    }
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  static removeLocal(key: string): void {
    if (this.available && wx) {
      wx.removeStorageSync?.(key);
      return;
    }
    globalThis.localStorage?.removeItem(key);
  }

  static canShowFriendBoard(): boolean {
    return typeof wx !== "undefined" && !!wx?.getOpenDataContext;
  }

  static friendCanvas(): { width: number; height: number } | null {
    if (!this.canShowFriendBoard()) return null;
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

  /** 已禁用：好友榜只由 submitScore 云函数写入，客户端不得 setUserCloudStorage。 */
  static submitStyleScore(_score: number): void {
    return;
  }

  static requestFriendRank(selfScore = 0): void {
    const open = wx?.getOpenDataContext;
    if (!open) return;
    const context = open();
    if (!context) return;
    context.postMessage({
      type: "showFriendRank",
      key: "best_style",
      selfScore,
    });
  }
}
