import { Game, game, sys } from "cc";
import type { PlatformLifecycle } from "./PlatformAdapter";
import { configurePlatform, platformAdapter } from "./PlatformRuntime";

class CocosLifecycle implements PlatformLifecycle {
  onHidden(listener: () => void): () => void {
    game.on(Game.EVENT_HIDE, listener);
    return () => game.off(Game.EVENT_HIDE, listener);
  }

  onShown(listener: () => void): () => void {
    game.on(Game.EVENT_SHOW, listener);
    return () => game.off(Game.EVENT_SHOW, listener);
  }
}

let configured = false;
/** Generated release-channel gate. Basic builds must never defer this to host globals. */
export const BASIC_LAUNCH = true;

declare global {
  var __BAOZOU_MONETIZATION_CONFIG__:
    | {
        launchMode?: "basic" | "full";
        androidAdsEnabled?: boolean;
        receiptVerificationUrl?: string;
      }
    | undefined;
}

export function ensureCocosPlatform(wechatCloudEnv?: string): void {
  if (!configured) {
    const config = globalThis.__BAOZOU_MONETIZATION_CONFIG__;
    const crazyFullLaunch =
      !BASIC_LAUNCH &&
      typeof globalThis.CrazyGames !== "undefined" &&
      config?.launchMode === "full";
    configurePlatform({
      cocosSys: sys,
      lifecycle: new CocosLifecycle(),
      storage: sys.localStorage,
      adsEnabled:
        !BASIC_LAUNCH &&
        (crazyFullLaunch || config?.androidAdsEnabled === true),
      wechatCloudEnv,
    });
    configured = true;
  }
  void platformAdapter().initialize().catch((error: unknown) => {
    console.warn("Platform initialization skipped", error);
  });
}
