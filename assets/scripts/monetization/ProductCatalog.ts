import type { PlayerSave } from "../data/types";

export type ProductKind = "permanent" | "cosmetic" | "coins";

export interface CatalogProduct {
  readonly id: string;
  readonly kind: ProductKind;
  readonly title: string;
  /** UI-only fallback. Checkout must use the platform returned price. */
  readonly displayPriceFallback: string;
  readonly coinAmount?: number;
  readonly cosmeticId?: string;
  readonly requiresBossDefeat?: boolean;
}

export const PRODUCT_CATALOG: readonly CatalogProduct[] = [
  {
    id: "starter_pack",
    kind: "permanent",
    title: "启航礼包",
    displayPriceFallback: "¥6",
  },
  {
    id: "remove_ads",
    kind: "permanent",
    title: "移除插屏广告",
    displayPriceFallback: "¥12",
  },
  {
    id: "cosmetic_boat_ember",
    kind: "cosmetic",
    title: "熔火船漆",
    displayPriceFallback: "¥6",
    cosmeticId: "boat_ember",
  },
  {
    id: "cosmetic_trail_prism",
    kind: "cosmetic",
    title: "棱彩航迹",
    displayPriceFallback: "¥6",
    cosmeticId: "trail_prism",
  },
  {
    id: "cosmetic_boat_mist",
    kind: "cosmetic",
    title: "雾钟船漆",
    displayPriceFallback: "¥8",
    cosmeticId: "boat_mist",
  },
  {
    id: "coins_300",
    kind: "coins",
    title: "300金币",
    displayPriceFallback: "¥3",
    coinAmount: 300,
    requiresBossDefeat: true,
  },
  {
    id: "coins_900",
    kind: "coins",
    title: "900金币",
    displayPriceFallback: "¥8",
    coinAmount: 900,
    requiresBossDefeat: true,
  },
  {
    id: "coins_2400",
    kind: "coins",
    title: "2400金币",
    displayPriceFallback: "¥18",
    coinAmount: 2400,
    requiresBossDefeat: true,
  },
] as const;

export function visibleProducts(bossDefeated: boolean): readonly CatalogProduct[] {
  return PRODUCT_CATALOG.filter(
    (product) => !product.requiresBossDefeat || bossDefeated,
  );
}

export function catalogProduct(id: string): CatalogProduct {
  const product = PRODUCT_CATALOG.find((item) => item.id === id);
  if (!product) throw new Error(`Unknown product: ${id}`);
  return product;
}

export function hasActiveEntitlement(
  save: PlayerSave,
  productId: string,
  now = Date.now(),
): boolean {
  const entitlement = save.entitlements[productId];
  return !!entitlement && entitlement.authorityExpiresAt > now;
}
