import type { PlatformAdapter } from "./PlatformAdapter";
import {
  createPlatformAdapter,
  type PlatformFactoryOptions,
} from "./PlatformFactory";

let current: PlatformAdapter = createPlatformAdapter();

export function platformAdapter(): PlatformAdapter {
  return current;
}

export function configurePlatform(options: PlatformFactoryOptions): PlatformAdapter {
  current = createPlatformAdapter(options);
  return current;
}

export function injectPlatform(adapter: PlatformAdapter): void {
  current = adapter;
}
