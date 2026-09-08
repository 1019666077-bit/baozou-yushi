export const MAX_FRESHNESS = 1.2;
export const MIN_FRESHNESS = 0.5;

export type FreshnessBand = "鲜爽" | "尚鲜" | "将失鲜";

/**
 * Freshness drains across the same window in which a deck fish can escape.
 * Keeping this pure makes price previews and runtime capture deterministic.
 */
export function freshnessForDeckTime(
  deckSeconds: number,
  escapeSeconds: number,
): number {
  const duration = Math.max(1, escapeSeconds);
  const progress = Math.min(1, Math.max(0, deckSeconds) / duration);
  const value = MAX_FRESHNESS - progress * (MAX_FRESHNESS - MIN_FRESHNESS);
  return Math.round(value * 100) / 100;
}

export function freshnessBand(value: number): FreshnessBand {
  if (value >= 1) return "鲜爽";
  if (value >= 0.75) return "尚鲜";
  return "将失鲜";
}

export function freshnessHud(
  deckSeconds: number,
  escapeSeconds: number,
  currentPrice: number,
  maxFreshPrice: number,
): string {
  const freshness = freshnessForDeckTime(deckSeconds, escapeSeconds);
  const secondsLeft = Math.max(0, Math.ceil(escapeSeconds - deckSeconds));
  const loss = Math.max(0, maxFreshPrice - currentPrice);
  return `${freshnessBand(freshness)} ${secondsLeft}秒 · 鲜度×${freshness.toFixed(2)} · 现价${currentPrice}金${loss > 0 ? `（比满鲜少${loss}）` : ""}`;
}
