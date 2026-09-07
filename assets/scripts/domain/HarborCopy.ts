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

export function harborBuildingTitle(kind: HarborBuildingKind = "orders"): string {
  return kind === "pontoon" ? harborPontoonUpgradeLabel() : harborOrderBoardLabel();
}

export function harborBuildingBody(kind: HarborBuildingKind = "orders"): string {
  if (kind === "pontoon") {
    return "还能再钉宽一块甲板、加一盏灯。只换皮，不改箱容和售价。";
  }
  return "退潮刚过，小站缺一块潮间漂木钉棚角。记下需求，捞到再交到浮站。";
}

export function harborBuildingBack(): string {
  return "回到浮站";
}

export function harborOrderName(): string {
  return "潮间补货";
}

export function harborOrderNeedLine(progress: number, need = 1): string {
  const safeNeed = Math.max(1, Math.floor(need) || 1);
  const safeProgress = Math.min(safeNeed, Math.max(0, Math.floor(progress) || 0));
  return `需要：潮间漂木 ${safeProgress}/${safeNeed}`;
}

export function harborOrderAcceptCaption(accepted: boolean): string {
  return accepted ? "已记下" : "记下需求";
}

export function harborOrderDeliverCaption(done: boolean): string {
  return done ? "已送到小站" : "交到小站";
}

export function harborOrderAcceptHint(): string {
  return "先记下需求，再把潮间漂木交到浮站。";
}

export function harborOrderDeliverHint(): string {
  return "先捞起近岸的潮间漂木。";
}

export function harborFlotsamLabel(): string {
  return "潮间漂木";
}

export function harborFlotsamPickCaption(): string {
  return "捞起漂木";
}

export function harborFlotsamPickedToast(): string {
  return "捞到一块潮间漂木。带回订单板交给小站。";
}

export function harborFlotsamDeliverToast(): string {
  return "潮间漂木已钉到棚角。小站记下了。";
}

export function harborFlotsamHeldLine(held: number): string {
  return held > 0 ? "手里有一块潮间漂木" : "近岸还有潮间漂木";
}

export function harborPontoonTierLine(tier: number): string {
  const safe = Math.min(3, Math.max(1, Math.floor(tier) || 1));
  return safe >= 2
    ? `现在：加宽甲板浮台（${safe} 档 / 3）`
    : `现在：窄板浮台（${safe} 档 / 3）`;
}

export function harborPontoonUpgradeCaption(tier: number): string {
  return tier >= 2 ? "浮台已经能站住" : "钉宽甲板";
}

export function harborPontoonUpgradeToast(): string {
  return "甲板加宽了，棚角也亮着灯。售价没变。";
}

export function harborPontoonBuiltHint(): string {
  return "第三档图纸还在修建中。";
}
