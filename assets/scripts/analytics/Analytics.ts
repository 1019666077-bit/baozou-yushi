import { WechatAdapter } from "../platform/WechatAdapter";

export type AnalyticsEvent =
  | "tutorial_start"
  | "tutorial_finish"
  | "cast"
  | "fish_hooked"
  | "fish_escaped"
  | "fish_captured"
  | "style_action"
  | "run_finish"
  | "upgrade_buy"
  | "session_end";

interface EventRecord {
  name: AnalyticsEvent;
  timestamp: number;
  payload: Record<string, unknown>;
}

export class Analytics {
  private static queue: EventRecord[] = [];

  static track(
    name: AnalyticsEvent,
    payload: Record<string, unknown> = {},
  ): void {
    this.queue.push({ name, timestamp: Date.now(), payload });
    if (this.queue.length >= 20) void this.flush();
  }

  static async flush(): Promise<void> {
    if (!this.queue.length) return;
    const events = this.queue.splice(0, this.queue.length);
    try {
      await WechatAdapter.callCloud("reportEvents", { events });
    } catch {
      this.queue.unshift(...events.slice(-100));
    }
  }
}
