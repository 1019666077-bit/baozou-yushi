export function harborFailCopy(error: unknown): string {
  const raw = error instanceof Error ? error.message : "操作失败";
  if (raw.startsWith("Insufficient coins")) return "金币不足";
  if (raw.startsWith("Tool is locked behind island")) return "先解锁对应岛屿。";
  if (raw.startsWith("Tool not owned")) return "先买下这件工具。";
  if (raw.startsWith("Tool already maxed")) return "已经满级。";
  return raw;
}

/** 港口主标题。进港先读成鱼市，不读成抽象浮站。 */
export function harborWorldTitle(): string {
  return "海边鱼市";
}

/** 标题在旁白板上方，中间留空，避免叠字。 */
export const HARBOR_TITLE_Y = 328;
export const HARBOR_PROMPT_Y = 248;

/** 出海时岛名后面的场次后缀。 */
export function huntFieldCaption(): string {
  return "渔场";
}

/** 教学没走完：第一屏只留鱼市标题、一句旁白、开始教学。 */
export function harborFirstScreen(tutorialComplete: boolean): boolean {
  return tutorialComplete !== true;
}

/** 教学没走完前，不露码头差事 / 加宽码头 / 商店外观。 */
export function harborSideSystemsVisible(tutorialComplete: boolean): boolean {
  return tutorialComplete === true;
}

/** 选岛、渔具、图鉴行、升级/榜这些浏览件，教学后再露。 */
export function harborBrowseChromeVisible(tutorialComplete: boolean): boolean {
  return tutorialComplete === true;
}

export function harborOrderBoardLabel(): string {
  return "码头差事";
}

export function harborPontoonUpgradeLabel(): string {
  return "加宽码头";
}

export type HarborBuildingKind = "orders" | "pontoon";

export function harborBuildingTitle(kind: HarborBuildingKind = "orders"): string {
  return kind === "pontoon" ? harborPontoonUpgradeLabel() : harborOrderBoardLabel();
}

export function harborBuildingBody(
  kind: HarborBuildingKind = "orders",
  pontoonTier = 1,
): string {
  if (kind === "pontoon") {
    return pontoonTier >= 2
      ? "码头加宽了，棚角也亮着灯。只换样子，卖价不变。"
      : "还能再钉宽一块甲板、加一盏灯。只换样子，卖价不变。";
  }
  return "码头缺一块木头钉棚角。接差事，捞到岸边木头再交回来。";
}

export function harborBuildingBack(): string {
  return "回港口";
}

export function harborOrderName(): string {
  return "钉块木板";
}

export function harborOrderNeedLine(progress: number, need = 1): string {
  const safeNeed = Math.max(1, Math.floor(need) || 1);
  const safeProgress = Math.min(safeNeed, Math.max(0, Math.floor(progress) || 0));
  return `需要：岸边木头 ${safeProgress}/${safeNeed}`;
}

export function harborOrderAcceptCaption(accepted: boolean): string {
  return accepted ? "已接差事" : "接差事";
}

export function harborOrderDeliverCaption(done: boolean): string {
  return done ? "木头已交" : "交木头";
}

export function harborOrderAcceptHint(): string {
  return "先接差事，再把岸边木头交回码头。";
}

export function harborOrderDeliverHint(): string {
  return "先捞起岸边那块木头。";
}

export function harborFlotsamLabel(): string {
  return "岸边木头";
}

export function harborFlotsamPickCaption(): string {
  return "捞木头";
}

export function harborFlotsamPickedToast(): string {
  return "捞到一块木头。去码头差事交回去。";
}

export function harborFlotsamDeliverToast(): string {
  return "木头钉上棚角了。卖价没变。";
}

export function harborFlotsamHeldLine(held: number): string {
  return held > 0 ? "手里有一块木头" : "岸边还有木头";
}

export function harborPontoonTierLine(tier: number): string {
  const safe = Math.min(3, Math.max(1, Math.floor(tier) || 1));
  return safe >= 2
    ? `现在：加宽码头（${safe} 档 / 3）`
    : `现在：窄板码头（${safe} 档 / 3）`;
}

export function harborPontoonUpgradeCaption(tier: number): string {
  return tier >= 2 ? "码头已经够站" : "钉宽码头";
}

export function harborPontoonUpgradeToast(): string {
  return "码头加宽了，棚角也亮着灯。卖价没变。";
}

export function harborPontoonBuiltHint(): string {
  return "再加宽的图纸还没好。";
}
