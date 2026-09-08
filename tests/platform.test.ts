import { afterEach, describe, expect, it, vi } from "vitest";
import { AndroidAdapter, type CocosSysLike } from "../assets/scripts/platform/AndroidAdapter";
import { CrazyGamesAdapter } from "../assets/scripts/platform/CrazyGamesAdapter";
import type {
  PlatformAdapter,
  PlatformCapabilities,
} from "../assets/scripts/platform/PlatformAdapter";
import { DisabledMonetization, NoopLifecycle } from "../assets/scripts/platform/PlatformAdapter";
import { createPlatformAdapter } from "../assets/scripts/platform/PlatformFactory";
import { WebLocalAdapter, type WebStorageLike } from "../assets/scripts/platform/WebLocalAdapter";
import { SaveService } from "../assets/scripts/save/SaveService";
import { createDefaultSave } from "../assets/scripts/domain/SaveMerge";
import { WechatAdapter } from "../assets/scripts/platform/WechatAdapter";

class MemoryStorage implements WebStorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const webCapabilities: PlatformCapabilities = {
  localSave: true,
  dataSave: false,
  cloudSave: false,
  analytics: false,
  leaderboard: false,
  friendLeaderboard: false,
  vibration: false,
  ads: false,
  billing: false,
  lifecycle: true,
};

afterEach(() => {
  delete globalThis.CrazyGames;
  delete globalThis.__BAOZOU_ANDROID_BRIDGE__;
  delete (globalThis as typeof globalThis & { wx?: unknown }).wx;
  vi.useRealTimers();
});

describe("platform factory and capabilities", () => {
  it("detects web local without pretending an SDK exists", () => {
    const adapter = createPlatformAdapter({ storage: new MemoryStorage() });
    expect(adapter.kind).toBe("web-local");
    expect(adapter.capabilities).toEqual(webCapabilities);
    expect(adapter.monetization.enabled).toBe(false);
  });

  it("detects Android from Cocos sys and keeps local save offline", () => {
    const cocos: CocosSysLike = {
      isNative: true,
      os: "Android",
      OS: { ANDROID: "Android" },
      localStorage: new MemoryStorage(),
    };
    const adapter = createPlatformAdapter({ cocosSys: cocos });
    expect(adapter).toBeInstanceOf(AndroidAdapter);
    expect(adapter.capabilities.localSave).toBe(true);
    expect(adapter.capabilities.cloudSave).toBe(false);
    expect(adapter.capabilities.ads).toBe(false);
  });

  it("detects the real CrazyGames global and initializes it", async () => {
    const init = vi.fn(() => Promise.resolve());
    globalThis.CrazyGames = {
      SDK: {
        init,
        game: { gameplayStart: vi.fn(), gameplayStop: vi.fn() },
      },
    };
    const adapter = createPlatformAdapter({ storage: new MemoryStorage() });
    expect(adapter.kind).toBe("crazygames");
    await adapter.initialize();
    expect(init).toHaveBeenCalledOnce();
    expect(adapter.capabilities.ads).toBe(false);
  });

  it("awaits CrazyGames Data before writing a generated default", async () => {
    let resolveRemote!: (value: string | null) => void;
    const getItem = vi.fn(
      () => new Promise<string | null>((resolve) => {
        resolveRemote = resolve;
      }),
    );
    const setItem = vi.fn(async () => undefined);
    globalThis.CrazyGames = {
      SDK: {
        init: async () => undefined,
        game: { gameplayStart: vi.fn(), gameplayStop: vi.fn() },
        data: {
          getItem,
          setItem,
          removeItem: async () => undefined,
        },
      },
    };
    const adapter = new CrazyGamesAdapter({ storage: new MemoryStorage() });
    const service = new SaveService(() => adapter);
    const loading = service.load();
    expect(setItem).not.toHaveBeenCalled();
    resolveRemote(JSON.stringify({ ...createDefaultSave(10), coins: 77 }));
    await expect(loading).resolves.toMatchObject({ coins: 77 });
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("monetization outcomes", () => {
  function installAd(
    run: (callbacks: {
      adFinished?: () => void;
      adError?: (error: { message?: string }) => void;
    }) => void,
  ): void {
    globalThis.CrazyGames = {
      SDK: {
        init: () => Promise.resolve(),
        game: { gameplayStart: () => undefined, gameplayStop: () => undefined },
        ad: { requestAd: (_kind, callbacks) => run(callbacks) },
      },
    };
  }

  it("reports successful and cancelled ads", async () => {
    installAd((callbacks) => callbacks.adFinished?.());
    const success = new CrazyGamesAdapter({
      adsEnabled: true,
      storage: new MemoryStorage(),
    });
    await expect(success.monetization.show("rewarded")).resolves.toEqual({
      status: "completed",
    });

    installAd((callbacks) => callbacks.adError?.({ message: "User cancelled" }));
    const cancelled = new CrazyGamesAdapter({
      adsEnabled: true,
      storage: new MemoryStorage(),
    });
    await expect(cancelled.monetization.show("rewarded")).resolves.toEqual({
      status: "cancelled",
    });
  });

  it("times out when an SDK ad callback never arrives", async () => {
    vi.useFakeTimers();
    installAd(() => undefined);
    const adapter = new CrazyGamesAdapter({
      adsEnabled: true,
      storage: new MemoryStorage(),
    });
    const result = adapter.monetization.show("interstitial", 50);
    await vi.advanceTimersByTimeAsync(50);
    await expect(result).resolves.toEqual({ status: "timeout" });
  });
});

describe("offline save degradation", () => {
  it("treats cloud business rejection as a failed save", async () => {
    (globalThis as typeof globalThis & { wx?: unknown }).wx = {
      cloud: {
        callFunction: (options: {
          success: (result: { result: unknown }) => void;
        }) => options.success({
          result: { ok: false, error: "revision_conflict" },
        }),
      },
    };
    const adapter = new WechatAdapter();
    await expect(
      adapter.cloudSave.save(createDefaultSave()),
    ).rejects.toThrow("revision_conflict");
  });

  it("keeps local progress when cloud save fails", async () => {
    const local = new WebLocalAdapter(new MemoryStorage());
    const mock: PlatformAdapter = {
      kind: "wechat",
      capabilities: { ...webCapabilities, cloudSave: true },
      localSave: local.localSave,
      cloudSave: {
        load: () => Promise.reject(new Error("offline")),
        save: () => Promise.reject(new Error("offline")),
        delete: () => Promise.reject(new Error("offline")),
      },
      monetization: new DisabledMonetization(),
      lifecycle: new NoopLifecycle(),
      initialize: () => Promise.resolve(),
      gameplayStart: () => undefined,
      gameplayStop: () => undefined,
      vibrate: () => undefined,
      isLowEndDevice: () => false,
    };
    const service = new SaveService(() => mock);
    const initial = await service.load();
    await service.save({ ...initial, coins: 321 });
    expect(service.get().coins).toBe(321);
    expect(service.cloudKind()).toBe("offline");
    expect(local.localSave.get<{ coins: number }>("baozou_yushi_save_v1")?.coins).toBe(321);
  });
});
