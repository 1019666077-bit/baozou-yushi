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
  | undefined;

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
      const timer = setTimeout(() => reject(new Error("cloud timeout")), 800);
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

  static submitStyleScore(score: number): void {
    if (!this.available || !wx?.setUserCloudStorage) return;
    wx.setUserCloudStorage({
      KVDataList: [
        {
          key: "best_style",
          value: JSON.stringify({
            wxgame: { score, update_time: Math.floor(Date.now() / 1000) },
          }),
        },
      ],
    });
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
