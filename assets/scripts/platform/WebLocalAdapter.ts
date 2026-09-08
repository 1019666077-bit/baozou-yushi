import {
  DisabledMonetization,
  NoopLifecycle,
  type LocalSavePort,
  type PlatformAdapter,
  type PlatformCapabilities,
  type PlatformKind,
  type PlatformLifecycle,
  type MonetizationAdapter,
} from "./PlatformAdapter";

export interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class JsonLocalSave implements LocalSavePort {
  constructor(private readonly storage?: WebStorageLike) {}

  get<T>(key: string): T | null {
    const raw = this.storage?.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown): void {
    this.storage?.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.storage?.removeItem(key);
  }
}

class BrowserLifecycle implements PlatformLifecycle {
  onHidden(listener: () => void): () => void {
    if (typeof document === "undefined") return () => undefined;
    const callback = (): void => {
      if (document.hidden) listener();
    };
    document.addEventListener("visibilitychange", callback);
    window.addEventListener("blur", listener);
    return () => {
      document.removeEventListener("visibilitychange", callback);
      window.removeEventListener("blur", listener);
    };
  }

  onShown(listener: () => void): () => void {
    if (typeof document === "undefined") return () => undefined;
    const callback = (): void => {
      if (!document.hidden) listener();
    };
    document.addEventListener("visibilitychange", callback);
    window.addEventListener("focus", listener);
    return () => {
      document.removeEventListener("visibilitychange", callback);
      window.removeEventListener("focus", listener);
    };
  }
}

export const WEB_CAPABILITIES: PlatformCapabilities = {
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

export class WebLocalAdapter implements PlatformAdapter {
  readonly kind: PlatformKind = "web-local";
  readonly capabilities: PlatformCapabilities = WEB_CAPABILITIES;
  readonly localSave: LocalSavePort;
  readonly monetization: MonetizationAdapter = new DisabledMonetization();
  readonly lifecycle: PlatformLifecycle;

  constructor(
    storage: WebStorageLike | undefined = globalThis.localStorage,
    lifecycle: PlatformLifecycle = typeof document === "undefined"
      ? new NoopLifecycle()
      : new BrowserLifecycle(),
  ) {
    this.localSave = new JsonLocalSave(storage);
    this.lifecycle = lifecycle;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  gameplayStart(): void {}
  gameplayStop(): void {}
  vibrate(): void {}
  isLowEndDevice(): boolean {
    return false;
  }
}
