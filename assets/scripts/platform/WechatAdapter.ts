import {
  canShowFriendBoardForSession,
  resolveLoginCode,
  wechatSessionKind,
} from "../domain/WechatSession";

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

function wxApi(): NonNullable<typeof wx> | undefined {
  const fromGlobal = (globalThis as { wx?: typeof wx }).wx;
  if (fromGlobal) return fromGlobal;
  try {
    return typeof wx !== "undefined" ? wx : undefined;
  } catch {
    return undefined;
  }
}

export class WechatAdapter {
  private static loginCode: string | null = null;

  static get available(): boolean {
    return !!wxApi();
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
    try {
      const api = wxApi();
      if (!this.available || !api?.cloud) return;
      api.cloud.init({ traceUser: true, ...(env ? { env } : {}) });
    } catch {
      // 编辑器/预览没有云环境时不阻断灰盒
    }
  }

  static login(): Promise<string | null> {
    const api = wxApi();
    if (!this.available || !api) {
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
    if (!this.available || !api?.cloud || !this.signedIn) {
      return Promise.reject(new Error("WeChat cloud is unavailable"));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("cloud timeout")),
        CLOUD_CALL_TIMEOUT_MS,
      );
      api.cloud!.callFunction({
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
    const api = wxApi();
    if (!this.available || !api) return true;
    const getSetting = api.getPrivacySetting;
    if (typeof getSetting !== "function") return true;
    return new Promise((resolve) => {
      getSetting.call(api, {
        success: (res) => {
          if (!res.needAuthorization) {
            resolve(true);
            return;
          }
          const requireAuth = api.requirePrivacyAuthorize;
          if (typeof requireAuth !== "function") {
            resolve(true);
            return;
          }
          requireAuth.call(api, {
            success: () => resolve(true),
            fail: () => resolve(false),
          });
        },
        fail: () => resolve(true),
      });
    });
  }

  static openPrivacyContract(): void {
    const api = wxApi();
    if (!this.available || typeof api?.openPrivacyContract !== "function") return;
    api.openPrivacyContract();
  }

  static vibrate(): void {
    wxApi()?.vibrateShort({ type: "light" });
  }

  static isLowEndDevice(): boolean {
    const api = wxApi();
    if (!this.available || !api) return false;
    const info = api.getSystemInfoSync();
    return (info.benchmarkLevel ?? 30) > 0 && (info.benchmarkLevel ?? 30) < 15;
  }

  static setLocal(key: string, value: unknown): void {
    const api = wxApi();
    if (this.available && api) {
      api.setStorageSync(key, value);
      return;
    }
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  }

  static getLocal<T>(key: string): T | null {
    const api = wxApi();
    if (this.available && api) {
      return (api.getStorageSync(key) as T) ?? null;
    }
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  static removeLocal(key: string): void {
    const api = wxApi();
    if (this.available && api) {
      api.removeStorageSync?.(key);
      return;
    }
    globalThis.localStorage?.removeItem(key);
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

  /** 已禁用：好友榜只由 submitScore 云函数写入，客户端不得 setUserCloudStorage。 */
  static submitStyleScore(_score: number): void {
    return;
  }

  static requestFriendRank(selfScore = 0): void {
    if (!this.signedIn) return;
    const open = wxApi()?.getOpenDataContext;
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
