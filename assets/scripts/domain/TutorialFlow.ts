import type { ButtonTone } from "./GameFeel";
import { CRATE_X, CRATE_Y } from "./FlopPhysics";
import {
  FIRST_ROD_UPGRADE_COST,
  upgradeGapRemaining,
} from "./PriceCalculator";

export type TutorialStep =
  | "cast"
  | "weakPoint"
  | "reel"
  | "settle"
  | "complete";

export type TutorialEvent =
  | "hooked"
  | "weakHit"
  | "reelReady"
  | "captured";

export type TutorialGuideTarget =
  | "cast"
  | "weakPoint"
  | "pickUp"
  | "crate"
  | "return"
  | "none";

export type HarborFeature = "upgrade" | "book" | "board";

export const TUTORIAL_FISH_ID = "fish_bayfin";
export const TUTORIAL_WEAK_PAUSE_SECONDS = 0.6;
export const TUTORIAL_ISLAND_ID = "island_tutorial";
export const DEFAULT_SAIL_ISLAND_ID = "island_foam_bay";

export function isTutorialRun(
  islandId: string,
  tutorialComplete: boolean,
): boolean {
  return !tutorialComplete && islandId === TUTORIAL_ISLAND_ID;
}

export function tutorialPrompt(
  step: TutorialStep,
  extras: { carrying?: boolean } = {},
): string {
  if (step === "cast") return "点「抛竿」，锁定湾鳍鱼。";
  if (step === "weakPoint") return "点右下半屏发光鳍，打弱点。";
  if (step === "reel") {
    if (extras.carrying) return "下半屏拖到左边鱼箱，松手入箱。";
    return "点「捡起」，搬进左边鱼箱。";
  }
  return "入箱了！点右上「回港」，去卖换成金币。";
}

export function tutorialGuideTarget(
  step: TutorialStep,
  extras: { carrying?: boolean } = {},
): TutorialGuideTarget {
  if (step === "cast") return "cast";
  if (step === "weakPoint") return "weakPoint";
  if (step === "reel") return extras.carrying ? "crate" : "pickUp";
  if (step === "settle") return "return";
  return "none";
}

/** 鱼箱中心，与 FlopPhysics.crateDrop 一致。 */
export const TUTORIAL_CRATE_X = CRATE_X;
export const TUTORIAL_CRATE_Y = CRATE_Y;
/** 弱点步没有按钮时，圈右下半屏瞄准区。 */
export const TUTORIAL_WEAK_HINT_X = 260;
export const TUTORIAL_WEAK_HINT_Y = -120;
/** 入箱后圈右上「回港」，与 RuntimePrototype 回港钮一致。 */
export const TUTORIAL_RETURN_X = 530;
export const TUTORIAL_RETURN_Y = 268;

export function tutorialGuideAnchor(target: TutorialGuideTarget): {
  x: number;
  y: number;
  radius: number;
} | undefined {
  if (target === "crate") {
    return { x: TUTORIAL_CRATE_X, y: TUTORIAL_CRATE_Y, radius: 88 };
  }
  if (target === "weakPoint") {
    return { x: TUTORIAL_WEAK_HINT_X, y: TUTORIAL_WEAK_HINT_Y, radius: 96 };
  }
  if (target === "return") {
    return { x: TUTORIAL_RETURN_X, y: TUTORIAL_RETURN_Y, radius: 78 };
  }
  return undefined;
}

/** 半透明遮罩挖洞 + 粗描边脉动。决策可单测，绘制在 RuntimePrototype。 */
export function tutorialGuideRing(nowMs: number): {
  pulse: number;
  lineWidth: number;
  fillAlpha: number;
  maskAlpha: number;
  stroke: [number, number, number, number];
  haloWidth: number;
  chevron: boolean;
} {
  return {
    pulse: 18 + Math.sin(nowMs / 160) * 10,
    lineWidth: 10,
    fillAlpha: 26,
    maskAlpha: 176,
    stroke: [255, 220, 72, 250],
    haloWidth: 4,
    chevron: true,
  };
}

/** 首局未入箱前不许提前回港，强制走通甩钩→命中→入箱。 */
export function tutorialCanLeave(step: TutorialStep): boolean {
  return step === "settle" || step === "complete";
}

/** 教学步未完成：潮汐句不盖教学旁白；时钟仍显示热身潮/精英潮。 */
export function tutorialLessonActive(step: TutorialStep): boolean {
  return step !== "complete";
}

export function waveStartNarration(waveIndex: number): string {
  return waveIndex === 0
    ? "热身潮。拽上岸，砸晕，搬进鱼箱。"
    : "精英潮来了。";
}

export function battleWaveNarration(
  tutorial: boolean,
  step: TutorialStep,
  waveLine: string,
  extras: { carrying?: boolean } = {},
): string {
  if (tutorial && tutorialLessonActive(step)) {
    return tutorialPrompt(step, extras);
  }
  return waveLine;
}

/** 当前教学步对应的底栏钮才用 primary；弱点/鱼箱/回港步两个都 secondary。 */
export function tutorialBarButtonTone(
  step: TutorialStep,
  button: "cast" | "pickUp",
  extras: { carrying?: boolean } = {},
): ButtonTone {
  const focus = tutorialGuideTarget(step, extras);
  if (button === "cast") return focus === "cast" ? "primary" : "secondary";
  return focus === "pickUp" ? "primary" : "secondary";
}

export type BattleBarInput = {
  tutorial: boolean;
  step: TutorialStep;
  carrying?: boolean;
  pickable?: boolean;
  hooked?: boolean;
};

/** 去鱼箱步不露抛竿/捡起，避免底栏还像主操作。 */
export function battleBarButtonVisible(
  input: Pick<BattleBarInput, "carrying">,
  _button: "cast" | "pickUp" = "cast",
): boolean {
  return !input.carrying;
}

/** 扛着鱼时底栏只留入箱主橙。 */
export function battleInboxCtaVisible(
  input: Pick<BattleBarInput, "carrying">,
): boolean {
  return input.carrying === true;
}

export function inboxBarCaption(): string {
  return "丢掉入箱";
}

/** 自由局也只亮一个主橙：空闲抛竿、可捡则捡起、扛鱼改入箱钮。 */
export function battleBarButtonTone(
  input: BattleBarInput,
  button: "cast" | "pickUp",
): ButtonTone {
  if (input.tutorial) {
    return tutorialBarButtonTone(input.step, button, {
      carrying: input.carrying,
    });
  }
  if (input.carrying) return "secondary";
  if (input.pickable) return button === "pickUp" ? "primary" : "secondary";
  if (input.hooked) return "secondary";
  return button === "cast" ? "primary" : "secondary";
}

export function canAffordNextUpgrade(
  coins: number,
  nextUpgradeCost: number | undefined,
): boolean {
  return nextUpgradeCost != null && coins >= nextUpgradeCost;
}

export type HarborCta = "sail" | "sell" | "upgrade";

/** 港口下一步：教学出航 / 卖鱼 / 首局后升级鱼竿。 */
export function harborNextCta(input: {
  tutorialComplete: boolean;
  completedRuns: number;
  pendingSell: boolean;
  upgradeUnlocked: boolean;
  coins?: number;
  nextUpgradeCost?: number;
}): HarborCta {
  if (input.pendingSell) return "sell";
  if (!input.tutorialComplete) return "sail";
  if (
    input.completedRuns === 1 &&
    input.upgradeUnlocked &&
    canAffordNextUpgrade(input.coins ?? 0, input.nextUpgradeCost)
  ) {
    return "upgrade";
  }
  return "sail";
}

export function harborNextPrompt(
  cta: HarborCta,
  tutorialComplete = true,
): string {
  if (cta === "sell") return "点「卖到鱼市」，换成金币。";
  if (cta === "upgrade") return "点升级，卖掉的鱼换成更好的竿。";
  if (!tutorialComplete) return "点「开始教学」，甩钩打中再入箱。";
  return "点「出海捕鱼」，再甩一竿。";
}

/** 主目标一句：攒够升级价，带进度，不灌金币。 */
export { FIRST_ROD_UPGRADE_COST, upgradeGapRemaining };

/** 主目标一句：还差多少、进度、再出海能补。不灌金币。 */
export function harborUpgradeProgressLine(
  coins: number,
  nextUpgradeCost: number,
): string {
  const left = upgradeGapRemaining(coins, nextUpgradeCost);
  if (left <= 0) {
    return `目标：已够 ${nextUpgradeCost} 升级竿（${coins}/${nextUpgradeCost}）`;
  }
  return `还差 ${left} 金升级竿（${coins}/${nextUpgradeCost}）· 再出海能补`;
}

export function upgradeProgressRatio(coins: number, nextUpgradeCost: number): number {
  if (nextUpgradeCost <= 0) return 1;
  return Math.min(1, Math.max(0, coins / nextUpgradeCost));
}

/** 卖出跳字接到回港目标：入账 + 进度 + 还差。不改经济。 */
export function harborSellBridgeLine(coins: number, nextUpgradeCost: number): string {
  const left = upgradeGapRemaining(coins, nextUpgradeCost);
  if (left <= 0) return `卖出已入账 · ${coins}/${nextUpgradeCost}`;
  return `卖出已入账 · ${coins}/${nextUpgradeCost} · 还差 ${left}`;
}

export function weakHintCaption(): string {
  return "弱点";
}

export type HarborHudPhase = "justSold" | "toast" | "idle";

/** 卖完金币雨优先；短反馈次之；平时才露云档/忠告。 */
export function harborHudPhase(input: {
  sellJuiceActive: boolean;
  toastActive: boolean;
}): HarborHudPhase {
  if (input.sellJuiceActive) return "justSold";
  if (input.toastActive) return "toast";
  return "idle";
}

export function harborHudShowMeta(phase: HarborHudPhase): boolean {
  return phase === "idle";
}

export function harborHudShowDiscovery(
  phase: HarborHudPhase,
  hasDiscovery: boolean,
): boolean {
  return hasDiscovery && phase !== "justSold";
}

/** 发现 toast 等金币雨后再出；升级失败等短反馈可立刻露，但不改主目标。 */
export function harborHudToastText(input: {
  phase: HarborHudPhase;
  toast?: string;
  discoveryText?: string;
}): string | undefined {
  if (!input.toast) return undefined;
  if (input.discoveryText && input.toast === input.discoveryText) {
    return input.phase === "justSold" ? undefined : input.toast;
  }
  return input.toast;
}

/** 升级失败等短反馈，不永久占主目标。 */
export function harborToastHoldSeconds(): number {
  return 1.25;
}

/** 卖完回港：买得起升级就指升级，否则主目标写攒够进度。不灌金币。 */
export function harborGoalPrompt(input: {
  tutorialComplete: boolean;
  completedRuns: number;
  coins: number;
  nextUpgradeCost?: number;
  upgradeUnlocked?: boolean;
  pendingSell?: boolean;
}): string {
  const cta = harborNextCta({
    tutorialComplete: input.tutorialComplete,
    completedRuns: input.completedRuns,
    pendingSell: input.pendingSell === true,
    upgradeUnlocked: input.upgradeUnlocked === true,
    coins: input.coins,
    nextUpgradeCost: input.nextUpgradeCost,
  });
  if (cta !== "sail") return harborNextPrompt(cta, input.tutorialComplete);
  if (
    input.tutorialComplete &&
    input.nextUpgradeCost != null &&
    input.coins < input.nextUpgradeCost
  ) {
    return harborUpgradeProgressLine(input.coins, input.nextUpgradeCost);
  }
  return harborNextPrompt("sail", input.tutorialComplete);
}

export function harborIslandChipCaption(input: {
  name: string;
  unlockCost: number;
  unlocked: boolean;
  selected: boolean;
  tutorialComplete: boolean;
}): string {
  if (!input.tutorialComplete) return `${input.name} · 教学后`;
  if (input.unlocked) return `${input.selected ? "● " : ""}${input.name}`;
  return `${input.name} ${input.unlockCost}`;
}

export function advanceTutorial(
  step: TutorialStep,
  event: TutorialEvent,
): TutorialStep {
  if (step === "complete") return step;
  if (step === "cast" && event === "hooked") return "weakPoint";
  if (step === "weakPoint" && (event === "weakHit" || event === "reelReady")) {
    return "reel";
  }
  if (step === "reel" && event === "captured") return "settle";
  if (step === "settle") return "complete";
  return step;
}

export function shouldAutoReel(
  step: TutorialStep,
  reelReadyForMs: number,
  battleMs: number,
): boolean {
  if (step !== "reel") return false;
  return reelReadyForMs >= 8_000 || battleMs >= TUTORIAL_BATTLE_FALLBACK_MS;
}

/** 首次入箱中位预算。教学路径与兜底都压进这个窗口。 */
export const FIRST_CRATE_BUDGET_MS = 60_000;
/** 教学跟提示走：抛+拽 / 弱点 / 拖箱，各留余量。 */
export const TUTORIAL_CAST_HOOK_BUDGET_MS = 16_000;
export const TUTORIAL_WEAK_BUDGET_MS = 12_000;
export const TUTORIAL_PICK_DRAG_BUDGET_MS = 12_000;
/** 已到捡起步仍不动：40s 兜底开捡，再加 10+10 入箱，刚好 ≤60s。改前 55s 会把晚晕鱼推过 60。 */
export const TUTORIAL_BATTLE_FALLBACK_MS = 40_000;

export const PICKABLE_HINT_MS = 4_000;
export const PICKABLE_AUTO_MS = 10_000;
/** 已扛起但未走到鱼箱时：先提示再自动入箱。 */
export const CARRIED_HINT_MS = 4_000;
export const CARRIED_AUTO_MS = 10_000;

export function firstCrateTaughtBudgetMs(): number {
  return (
    TUTORIAL_CAST_HOOK_BUDGET_MS +
    TUTORIAL_WEAK_BUDGET_MS +
    TUTORIAL_PICK_DRAG_BUDGET_MS
  );
}

export function firstCrateFallbackBudgetMs(): number {
  return TUTORIAL_BATTLE_FALLBACK_MS + PICKABLE_AUTO_MS + CARRIED_AUTO_MS;
}

/** 买不起下一级才露进度条，避免满额还挡海景。 */
export function harborUpgradeBarVisible(input: {
  tutorialComplete: boolean;
  coins: number;
  nextUpgradeCost?: number;
}): boolean {
  return (
    input.tutorialComplete &&
    input.nextUpgradeCost != null &&
    input.coins < input.nextUpgradeCost
  );
}

/** 入箱后提醒回港，再兜底进结算。 */
export const SETTLE_LEAVE_HINT_MS = 800;
export const SETTLE_LEAVE_AUTO_MS = 4_500;
/** 刚点过按钮 / 正在拖船时，自动捡起/入箱让路。 */
export const INPUT_GRACE_MS = 500;

export type PickupAssistKind = "pickable" | "carried";
export type PickupAssistAction = "none" | "hint" | "auto";

export function pickupAssistDecision(
  kind: PickupAssistKind,
  elapsedMs: number,
  recentInputMs = Number.POSITIVE_INFINITY,
): PickupAssistAction {
  const hintMs = kind === "carried" ? CARRIED_HINT_MS : PICKABLE_HINT_MS;
  const autoMs = kind === "carried" ? CARRIED_AUTO_MS : PICKABLE_AUTO_MS;
  if (elapsedMs >= autoMs) {
    return recentInputMs < INPUT_GRACE_MS ? "hint" : "auto";
  }
  if (elapsedMs >= hintMs) return "hint";
  return "none";
}

export function settleLeaveDecision(
  elapsedMs: number,
  recentInputMs = Number.POSITIVE_INFINITY,
): PickupAssistAction {
  if (elapsedMs >= SETTLE_LEAVE_AUTO_MS) {
    return recentInputMs < INPUT_GRACE_MS ? "hint" : "auto";
  }
  if (elapsedMs >= SETTLE_LEAVE_HINT_MS) return "hint";
  return "none";
}

export function harborUnlocks(completedRuns: number): {
  upgrade: boolean;
  book: boolean;
  board: boolean;
} {
  return {
    upgrade: completedRuns >= 1,
    book: completedRuns >= 2,
    board: completedRuns >= 2,
  };
}

export function harborUnlocksForSave(save: {
  tutorialComplete: boolean;
  completedRuns: number;
}): {
  upgrade: boolean;
  book: boolean;
  board: boolean;
} {
  return harborUnlocks(save.tutorialComplete ? save.completedRuns : 0);
}

export function nextSailIsland(tutorialComplete: boolean): string {
  return tutorialComplete ? DEFAULT_SAIL_ISLAND_ID : TUTORIAL_ISLAND_ID;
}

export function resolveHarborIsland(
  tutorialComplete: boolean,
  selectedIslandId: string,
): string {
  if (!tutorialComplete) return nextSailIsland(false);
  if (selectedIslandId === TUTORIAL_ISLAND_ID) return nextSailIsland(true);
  return selectedIslandId;
}

export function harborChipSelected(
  islandId: string,
  tutorialComplete: boolean,
  displayIslandId: string,
): boolean {
  if (!tutorialComplete) return false;
  return islandId === displayIslandId;
}

export function harborSailCaption(tutorialComplete: boolean): string {
  return tutorialComplete ? "出海捕鱼" : "开始教学";
}

function runsNeededFor(feature: HarborFeature): number {
  return feature === "upgrade" ? 1 : 2;
}

export function harborFeatureLockedHint(
  feature: HarborFeature,
  save?: { tutorialComplete: boolean; completedRuns: number },
): string {
  if (!save?.tutorialComplete) {
    if (feature === "upgrade") return "先完成教学再升级。";
    if (feature === "book") return "先完成教学再查看图鉴。";
    return "先完成教学再看榜。";
  }
  const left = Math.max(0, runsNeededFor(feature) - save.completedRuns);
  if (feature === "upgrade") {
    return left > 0 ? `再出 ${left} 局后解锁升级。` : "先完成教学再升级。";
  }
  if (feature === "book") {
    return left > 0 ? `再出 ${left} 局后解锁图鉴。` : "先完成教学再查看图鉴。";
  }
  return left > 0 ? `再出 ${left} 局后解锁榜。` : "先完成教学再看榜。";
}

export function harborFeatureButtonLabel(
  feature: HarborFeature,
  save: { tutorialComplete: boolean; completedRuns: number },
): string {
  const unlocks = harborUnlocksForSave(save);
  if (feature === "book") {
    if (unlocks.book) return "图鉴";
    return save.tutorialComplete ? "再出1局后图鉴" : "教学后图鉴";
  }
  if (feature === "board") {
    if (unlocks.board) return "榜";
    return save.tutorialComplete ? "再出1局后榜" : "教学后榜";
  }
  if (unlocks.upgrade) return "查看升级";
  return save.tutorialComplete ? "再出1局后升级" : "教学后升级";
}

/** 买得起才写「升级竿」；买不起写还差多少，且调用方必须保持 secondary。 */
export function harborUpgradeCtaLabel(input: {
  tutorialComplete: boolean;
  completedRuns: number;
  coins: number;
  nextUpgradeCost?: number;
  toolName?: string;
}): string {
  const save = {
    tutorialComplete: input.tutorialComplete,
    completedRuns: input.completedRuns,
  };
  if (!harborUnlocksForSave(save).upgrade) {
    return harborFeatureButtonLabel("upgrade", save);
  }
  if (input.nextUpgradeCost == null) return "查看升级";
  if (canAffordNextUpgrade(input.coins, input.nextUpgradeCost)) {
    return input.toolName ? `升级${input.toolName}` : "查看升级";
  }
  return `还差${upgradeGapRemaining(input.coins, input.nextUpgradeCost)}`;
}
