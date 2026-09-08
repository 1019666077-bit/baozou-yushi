import type {
  DailyOrderState,
  OrderMetric,
  PlayerSave,
  StyleGrade,
  ToolKind,
} from "../data/types";
import { SeededRandom } from "./SeededRandom";

export interface DailyOrder {
  id: string;
  title: string;
  metric: OrderMetric;
  target: number;
  reward: { kind: "coins" | "cosmeticShards"; amount: number };
  toolKind?: ToolKind;
  islandId?: string;
}

export interface OrderEvent {
  captures?: number;
  airborne?: boolean;
  grade?: StyleGrade;
  toolKind?: ToolKind;
  islandId?: string;
}

const DAY_MS = 86_400_000;
const ROLLBACK_TOLERANCE_MS = 6 * 60 * 60 * 1000;
const FORWARD_JUMP_LIMIT_MS = 36 * 60 * 60 * 1000;
const TOOLS: ToolKind[] = ["rod", "cannon", "harpoon"];
const ISLANDS = [
  "island_foam_bay",
  "island_prism_reef",
  "island_storm_eye",
];

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function localDateKey(now = Date.now()): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateDailyOrders(
  dateKey: string,
  unlockedIslands: string[] = ISLANDS,
  ownedTools: ToolKind[] = TOOLS,
): DailyOrder[] {
  const rng = new SeededRandom(hash(`daily:${dateKey}`));
  const island = rng.pick(unlockedIslands.length ? unlockedIslands : [ISLANDS[0]]);
  const tool = rng.pick<ToolKind>(
    ownedTools.length ? ownedTools : ["rod"],
  );
  const variants: DailyOrder[] = [
    {
      id: `${dateKey}:airborne`,
      title: "空中入箱2条鱼",
      metric: "airborne",
      target: 2,
      reward: { kind: "cosmeticShards", amount: 1 },
    },
    {
      id: `${dateKey}:gradeA`,
      title: "捕获2条A级以上鱼",
      metric: "gradeA",
      target: 2,
      reward: { kind: "coins", amount: 45 },
    },
    {
      id: `${dateKey}:tool:${tool}`,
      title: `使用${tool === "rod" ? "鱼竿" : tool === "cannon" ? "泡泡炮" : "蓄能叉"}捕获3条`,
      metric: "tool",
      target: 3,
      toolKind: tool,
      reward: { kind: "coins", amount: 40 },
    },
    {
      id: `${dateKey}:island:${island}`,
      title: "在指定岛捕获3条",
      metric: "island",
      target: 3,
      islandId: island,
      reward: { kind: "cosmeticShards", amount: 1 },
    },
  ];
  const offset = Math.floor(rng.next() * variants.length);
  const rotated = variants.slice(offset).concat(variants.slice(0, offset));
  return rotated.slice(0, 3);
}

export function ensureDailyOrders(
  previous: DailyOrderState | null,
  now = Date.now(),
  unlockedIslands?: string[],
  ownedTools?: ToolKind[],
  trustedClock = false,
): DailyOrderState {
  if (previous && now < previous.lastSeenAt - ROLLBACK_TOLERANCE_MS) {
    return { ...previous, clockTrusted: false };
  }
  if (
    previous &&
    !trustedClock &&
    now > previous.lastSeenAt + FORWARD_JUMP_LIMIT_MS
  ) {
    return { ...previous, clockTrusted: false };
  }
  const key = localDateKey(now);
  if (previous?.dateKey === key) {
    return {
      ...previous,
      lastSeenAt: Math.max(previous.lastSeenAt, now),
      clockTrusted: trustedClock || previous.clockTrusted !== false,
    };
  }
  const definitions = generateDailyOrders(key, unlockedIslands, ownedTools);
  return {
    dateKey: key,
    generatedAt: now,
    lastSeenAt: now,
    clockTrusted: true,
    orders: definitions.map((order) => ({
      id: order.id,
      current: 0,
      target: order.target,
      claimed: false,
    })),
  };
}

export function applyOrderEvent(
  state: DailyOrderState,
  event: OrderEvent,
): DailyOrderState {
  return {
    ...state,
    orders: state.orders.map((progress) => {
      const order = orderFromId(progress.id);
      if (!order || progress.claimed) return progress;
      let amount = 0;
      if (order.metric === "capture") amount = event.captures ?? 0;
      if (order.metric === "airborne" && event.airborne) amount = 1;
      if (
        order.metric === "gradeA" &&
        (event.grade === "A" || event.grade === "S")
      ) amount = 1;
      if (order.metric === "tool" && event.toolKind === order.toolKind) amount = 1;
      if (order.metric === "island" && event.islandId === order.islandId) amount = 1;
      return {
        ...progress,
        current: Math.min(progress.target, progress.current + amount),
      };
    }),
  };
}

function orderFromId(id: string): DailyOrder | undefined {
  const [dateKey, metric, qualifier] = id.split(":");
  if (metric === "airborne") {
    return {
      id,
      title: "空中入箱2条鱼",
      metric,
      target: 2,
      reward: { kind: "cosmeticShards", amount: 1 },
    };
  }
  if (metric === "gradeA") {
    return {
      id,
      title: "捕获2条A级以上鱼",
      metric,
      target: 2,
      reward: { kind: "coins", amount: 45 },
    };
  }
  if (metric === "tool" && TOOLS.includes(qualifier as ToolKind)) {
    return {
      id,
      title: "使用指定工具捕获3条",
      metric,
      target: 3,
      toolKind: qualifier as ToolKind,
      reward: { kind: "coins", amount: 40 },
    };
  }
  if (metric === "island" && qualifier) {
    return {
      id,
      title: "在指定岛捕获3条",
      metric,
      target: 3,
      islandId: qualifier,
      reward: { kind: "cosmeticShards", amount: 1 },
    };
  }
  return undefined;
}

export function claimDailyOrder(
  save: PlayerSave,
  orderId: string,
): PlayerSave {
  const daily = save.dailyOrders;
  const progress = daily?.orders.find((item) => item.id === orderId);
  if (!daily || !progress) throw new Error("Unknown daily order");
  if (daily.clockTrusted === false) throw new Error("Daily order clock is untrusted");
  if (progress.claimed) throw new Error("Daily order already claimed");
  if (progress.current < progress.target) throw new Error("Daily order incomplete");
  const order = orderFromId(orderId);
  if (!order) throw new Error("Unknown daily order");
  return {
    ...save,
    coins: save.coins + (order.reward.kind === "coins" ? order.reward.amount : 0),
    cosmeticShards:
      save.cosmeticShards +
      (order.reward.kind === "cosmeticShards" ? order.reward.amount : 0),
    dailyOrders: {
      ...daily,
      orders: daily.orders.map((item) =>
        item.id === orderId ? { ...item, claimed: true } : item,
      ),
    },
  };
}

export function applyAuthoritativeDailyClaim(
  save: PlayerSave,
  orderId: string,
  reward: { kind: "coins" | "cosmeticShards"; amount: number },
  serverNow: number,
): PlayerSave {
  const daily = save.dailyOrders;
  const progress = daily?.orders.find((item) => item.id === orderId);
  if (!daily || !progress) throw new Error("Unknown daily order");
  if (progress.current < progress.target) throw new Error("Daily order incomplete");
  return {
    ...save,
    coins: save.coins + (reward.kind === "coins" ? reward.amount : 0),
    cosmeticShards:
      save.cosmeticShards +
      (reward.kind === "cosmeticShards" ? reward.amount : 0),
    dailyOrders: {
      ...daily,
      lastSeenAt: Math.max(daily.lastSeenAt, serverNow),
      clockTrusted: true,
      orders: daily.orders.map((item) =>
        item.id === orderId ? { ...item, claimed: true } : item,
      ),
    },
  };
}

export const DAILY_SESSION_TARGET_MINUTES = 15;
export const CLOCK_ROLLBACK_TOLERANCE_MS = ROLLBACK_TOLERANCE_MS;
export const CLOCK_FORWARD_JUMP_LIMIT_MS = FORWARD_JUMP_LIMIT_MS;
export const DAY_DURATION_MS = DAY_MS;
