import type { Rgb } from "./GrayLook";

export type CosmeticSlot = "boat" | "trail";

export interface MarketUiLook {
  ink: Rgb;
  paper: Rgb;
  wood: Rgb;
  woodDark: Rgb;
  price: Rgb;
  fresh: Rgb;
  warning: Rgb;
  cornerRadius: number;
  safeInset: number;
}

export interface CosmeticLook {
  id: string;
  slot: CosmeticSlot;
  hull: Rgb;
  trim: Rgb;
  crate: Rgb;
  crateDark: Rgb;
  hit: Rgb;
  sparkle: Rgb;
}

export const MARKET_UI: MarketUiLook = {
  ink: [42, 35, 29],
  paper: [250, 225, 164],
  wood: [164, 105, 54],
  woodDark: [91, 57, 39],
  price: [255, 191, 62],
  fresh: [76, 194, 147],
  warning: [230, 91, 65],
  cornerRadius: 10,
  safeInset: 28,
};

export const COMMON_ART = {
  shadow: [18, 48, 62] as Rgb,
  cabin: [236, 214, 168] as Rgb,
  window: [120, 196, 214] as Rgb,
  mast: [92, 74, 48] as Rgb,
  flag: [255, 168, 72] as Rgb,
  line: [255, 214, 70] as Rgb,
  eye: [20, 24, 32] as Rgb,
  weak: [255, 245, 150] as Rgb,
  weakOpen: [255, 255, 120] as Rgb,
  highlight: [255, 255, 255] as Rgb,
} as const;

const DEFAULT_COSMETIC: CosmeticLook = {
  id: "default",
  slot: "boat",
  hull: [214, 160, 86],
  trim: [176, 118, 58],
  crate: [24, 154, 170],
  crateDark: [18, 90, 104],
  hit: [255, 236, 120],
  sparkle: [170, 240, 255],
};

const COSMETICS: Record<string, CosmeticLook> = {
  boat_ember: {
    id: "boat_ember",
    slot: "boat",
    hull: [163, 68, 49],
    trim: [255, 151, 55],
    crate: [105, 47, 42],
    crateDark: [62, 35, 39],
    hit: [255, 126, 48],
    sparkle: [255, 213, 93],
  },
  boat_mist: {
    id: "boat_mist",
    slot: "boat",
    hull: [112, 154, 162],
    trim: [224, 198, 116],
    crate: [78, 119, 130],
    crateDark: [50, 76, 91],
    hit: [225, 205, 128],
    sparkle: [202, 239, 233],
  },
  trail_prism: {
    id: "trail_prism",
    slot: "trail",
    hull: DEFAULT_COSMETIC.hull,
    trim: DEFAULT_COSMETIC.trim,
    crate: DEFAULT_COSMETIC.crate,
    crateDark: DEFAULT_COSMETIC.crateDark,
    hit: [229, 114, 222],
    sparkle: [96, 232, 220],
  },
};

export function cosmeticLook(id?: string): CosmeticLook {
  return (id && COSMETICS[id]) || DEFAULT_COSMETIC;
}

export function cosmeticSlot(id: string): CosmeticSlot | undefined {
  return COSMETICS[id]?.slot;
}

export function canSelectCosmetic(
  owned: readonly string[],
  id: string,
  slot: CosmeticSlot,
): boolean {
  return owned.includes(id) && cosmeticSlot(id) === slot;
}

export function sanitizeCosmeticSelection(
  owned: readonly string[],
  selected: { boat?: string; trail?: string },
): { boat?: string; trail?: string } {
  return {
    boat: selected.boat && canSelectCosmetic(owned, selected.boat, "boat")
      ? selected.boat
      : undefined,
    trail: selected.trail && canSelectCosmetic(owned, selected.trail, "trail")
      ? selected.trail
      : undefined,
  };
}

export const VISUAL_LIMITS = {
  maxJuiceParticles: { standard: 48, lowPower: 16 },
  maxLiveFish: { standard: 4, lowPower: 3 },
  maxLiveShots: 12,
  webInitialDownloadBytes: 20 * 1024 * 1024,
} as const;

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function marketViewport(
  width: number,
  height: number,
  insets: Partial<SafeInsets> = {},
): { scale: number; safe: SafeInsets; hudColumns: 2 | 4 } {
  const safe = {
    top: Math.max(MARKET_UI.safeInset, insets.top ?? 0),
    right: Math.max(MARKET_UI.safeInset, insets.right ?? 0),
    bottom: Math.max(MARKET_UI.safeInset, insets.bottom ?? 0),
    left: Math.max(MARKET_UI.safeInset, insets.left ?? 0),
  };
  const usableWidth = Math.max(1, width - safe.left - safe.right);
  const usableHeight = Math.max(1, height - safe.top - safe.bottom);
  return {
    scale: Math.min(usableWidth / 1280, usableHeight / 720),
    safe,
    hudColumns: usableWidth / usableHeight >= 1.55 ? 4 : 2,
  };
}
