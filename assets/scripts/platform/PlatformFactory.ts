import { AndroidAdapter, isAndroidCocos, type CocosSysLike } from "./AndroidAdapter";
import {
  CrazyGamesAdapter,
  isCrazyGamesSdkAvailable,
} from "./CrazyGamesAdapter";
import type { PlatformAdapter, PlatformLifecycle } from "./PlatformAdapter";
import { WebLocalAdapter, type WebStorageLike } from "./WebLocalAdapter";
import { WechatAdapter, isWechatAvailable } from "./WechatAdapter";

export interface PlatformFactoryOptions {
  cocosSys?: CocosSysLike;
  lifecycle?: PlatformLifecycle;
  storage?: WebStorageLike;
  adsEnabled?: boolean;
  wechatCloudEnv?: string;
}

export function createPlatformAdapter(
  options: PlatformFactoryOptions = {},
): PlatformAdapter {
  if (isWechatAvailable()) {
    return new WechatAdapter(options.wechatCloudEnv, options.lifecycle);
  }
  const cocosSys = options.cocosSys;
  if (isAndroidCocos(cocosSys)) {
    return new AndroidAdapter(cocosSys, {
      lifecycle: options.lifecycle,
      adsEnabled: options.adsEnabled === true,
    });
  }
  if (isCrazyGamesSdkAvailable()) {
    return new CrazyGamesAdapter({
      storage: options.storage,
      adsEnabled: options.adsEnabled === true,
    });
  }
  return new WebLocalAdapter(options.storage, options.lifecycle);
}
