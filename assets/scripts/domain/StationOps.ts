/**
 * W2 活站：一条原创订单意图、潮间漂物、浮台换皮。
 * 只记本地进度，不改售价 / 箱容 / 扑腾手感。
 */

export const STATION_ORDER_ID = "order_tide_supply";
export const STATION_FLOTSAM_ID = "flotsam_tidewood";
export const STATION_ORDER_NEED = 1;
export const STATION_PONTOON_TIER_CAP = 3;
export const STATION_PONTOON_VISIBLE_CAP = 2;

export type StationState = {
  orderAccepted: boolean;
  orderDelivered: boolean;
  orderProgress: number;
  flotsamHeld: number;
  flotsamSpawned: boolean;
  pontoonTier: number;
};

function clampInt(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function defaultStationState(): StationState {
  return {
    orderAccepted: false,
    orderDelivered: false,
    orderProgress: 0,
    flotsamHeld: 0,
    flotsamSpawned: true,
    pontoonTier: 1,
  };
}

export function normalizeStation(raw: unknown): StationState {
  const src = raw && typeof raw === "object" ? (raw as Partial<StationState>) : {};
  const held = src.flotsamHeld === 1 ? 1 : 0;
  const delivered = src.orderDelivered === true;
  const progress = delivered
    ? STATION_ORDER_NEED
    : clampInt(src.orderProgress, 0, STATION_ORDER_NEED);
  return {
    orderAccepted: src.orderAccepted === true || delivered,
    orderDelivered: delivered,
    orderProgress: progress,
    flotsamHeld: held,
    flotsamSpawned: !held && !delivered && src.flotsamSpawned !== false,
    pontoonTier: clampInt(src.pontoonTier, 1, STATION_PONTOON_TIER_CAP) || 1,
  };
}

export function visiblePontoonTier(tier: number): 1 | 2 {
  return clampInt(tier, 1, STATION_PONTOON_VISIBLE_CAP) >= 2 ? 2 : 1;
}

export function canAcceptOrder(state: StationState): boolean {
  return !state.orderAccepted && !state.orderDelivered;
}

export function canPickFlotsam(state: StationState): boolean {
  return state.flotsamSpawned && state.flotsamHeld <= 0 && !state.orderDelivered;
}

export function canDeliverOrder(state: StationState): boolean {
  return state.orderAccepted && !state.orderDelivered && state.flotsamHeld > 0;
}

export function canUpgradePontoon(state: StationState): boolean {
  return visiblePontoonTier(state.pontoonTier) < STATION_PONTOON_VISIBLE_CAP;
}

export function acceptOrder(state: StationState): StationState {
  if (!canAcceptOrder(state)) return state;
  return { ...state, orderAccepted: true };
}

export function pickFlotsam(state: StationState): StationState {
  if (!canPickFlotsam(state)) return state;
  return {
    ...state,
    flotsamSpawned: false,
    flotsamHeld: 1,
  };
}

export function deliverOrder(state: StationState): StationState {
  if (!canDeliverOrder(state)) return state;
  return {
    ...state,
    flotsamHeld: 0,
    flotsamSpawned: false,
    orderProgress: STATION_ORDER_NEED,
    orderDelivered: true,
  };
}

export function upgradePontoon(state: StationState): StationState {
  if (!canUpgradePontoon(state)) return state;
  return {
    ...state,
    pontoonTier: STATION_PONTOON_VISIBLE_CAP,
  };
}

export function stationOrderNeed(): number {
  return STATION_ORDER_NEED;
}
