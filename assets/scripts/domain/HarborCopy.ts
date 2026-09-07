export function harborFailCopy(error: unknown): string {
  const raw = error instanceof Error ? error.message : "操作失败";
  if (raw.startsWith("Insufficient coins")) return "金币不足";
  if (raw.startsWith("Tool is locked behind island")) return "先解锁对应岛屿。";
  if (raw.startsWith("Tool not owned")) return "先买下这件工具。";
  if (raw.startsWith("Tool already maxed")) return "已经满级。";
  return raw;
}

/** 港口世界壳标题。玩家可见，只用原创中文。 */
export function harborWorldTitle(): string {
  return "潮退浮站 · 浮岛小站";
}

export function harborOrderBoardLabel(): string {
  return "订单板";
}

export function harborPontoonUpgradeLabel(): string {
  return "浮台升级";
}

export type HarborBuildingKind = "orders" | "pontoon";

export function harborBuildingTitle(): string {
  return "修建中";
}

export function harborBuildingBody(kind: HarborBuildingKind = "orders"): string {
  if (kind === "pontoon") {
    return "浮台还钉得住。升级图纸还没晒干，先出海把鱼带回来。";
  }
  return "潮水刚退，订单板还在钉钉子。先出海，把鱼卖给还醒着的人。";
}

export function harborBuildingBack(): string {
  return "回到浮站";
}
