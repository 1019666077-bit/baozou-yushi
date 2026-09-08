import { platformAdapter } from "../platform/PlatformRuntime";

export type AnalyticsEvent =
  | "tutorial_start"
  | "tutorial_finish"
  | "cast"
  | "fish_hooked"
  | "fish_escaped"
  | "fish_captured"
  | "style_action"
  | "style_grade"
  | "capture_chain_update"
  | "freshness_decision"
  | "input_scheme"
  | "run_finish"
  | "upgrade_buy"
  | "daily_order_progress"
  | "daily_order_claim"
  | "weekly_challenge_start"
  | "weekly_challenge_finish"
  | "endless_start"
  | "endless_round"
  | "endless_withdraw"
  | "content_progress"
  | "store_open"
  | "cosmetic_select"
  | "purchase_start"
  | "purchase_cancel"
  | "purchase_fail"
  | "receipt_verify"
  | "purchase_grant"
  | "purchase_restore"
  | "entitlement_sync"
  | "ad_offer"
  | "ad_result"
  | "ad_grant"
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
    const sink = platformAdapter().analytics;
    if (!sink) return;
    try {
      await sink.send(events);
    } catch {
      this.queue.unshift(...events.slice(-100));
    }
  }
}
