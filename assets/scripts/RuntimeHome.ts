import { _decorator, Component, Label } from "cc";
import { fishIdsForIsland } from "./content/IslandFishPool";
import { ConfigService } from "./data/ConfigService";
import type { PlayerSave, RemoteConfig, RunSummary } from "./data/types";
import {
  bookLines,
  settleRun,
  settleHeadline,
  settleRows,
  settleSlogan,
} from "./domain/SettleCopy";
import { settingCaption } from "./domain/GameFeel";
import {
  bestStyleLine,
  boardLines,
  friendBoardHint,
} from "./domain/BoardCopy";
import {
  closedIslandCaption,
  cloudStatusLine,
  harborNotice,
  islandClosed,
  type CloudKind,
} from "./domain/CloudCopy";
import { LeaderboardService } from "./platform/LeaderboardService";
import { SfxPlayer } from "./platform/SfxPlayer";
import { ensureCocosPlatform } from "./platform/CocosPlatformBootstrap";
import { platformAdapter } from "./platform/PlatformRuntime";
import { playerSave } from "./save/SaveService";
import { HarborActions } from "./ui/HarborActions";
import {
  drawOcean,
  makeButton,
  makeLabel,
  replacePlayLayer,
} from "./ui/RuntimeUi";
import { harborIslandIds, harborIslandX } from "./domain/GrayLook";
import { FriendBoardView } from "./ui/FriendBoardView";
import { ensureIslandPack } from "./content/IslandPackLoader";
import { harborSailWait } from "./domain/IslandPack";
import { canSelectCosmetic, cosmeticSlot } from "./domain/MarketArtStyle";
import {
  privacyBackCaption,
  privacyLines,
  privacyTitle,
  wipeBody,
  wipeCancelCaption,
  wipeCaption,
  wipeConfirmCaption,
  wipeDoneNotice,
  wipeTitle,
} from "./domain/PrivacyCopy";
import { RuntimePrototype } from "./RuntimePrototype";
import {
  applyAuthoritativeDailyClaim,
  claimDailyOrder,
  ensureDailyOrders,
  generateDailyOrders,
} from "./domain/DailyOrders";
import {
  generateWeeklyRules,
  isoWeekKey,
  recordWeeklyAttempt,
} from "./domain/WeeklyChallenge";
import { Analytics } from "./analytics/Analytics";
import {
  hasActiveEntitlement,
  visibleProducts,
} from "./monetization/ProductCatalog";
import { purchaseService } from "./monetization/MonetizationRuntime";
import { adGrants } from "./monetization/AdGrantService";

const { ccclass } = _decorator;

@ccclass("RuntimeHome")
export class RuntimeHome extends Component {
  private status!: Label;
  private coinsLabel!: Label;
  private selectedIslandId = "island_foam_bay";
  private selectedToolId = "tool_rod";
  private lastSummary?: RunSummary;
  private pendingSummary?: RunSummary;
  private settling = false;
  private pendingWeekly = false;
  private authoritativeNow?: number;
  private cloudKind: CloudKind = "syncing";
  private statusFlash?: string;
  private bookPage = 0;
  private surface:
    | "harbor"
    | "settings"
    | "privacy"
    | "wipe"
    | "book"
    | "store"
    | "cosmetics"
    | "challenges"
    | "board"
    | "settle"
    | "sea" = "harbor";

  protected onLoad(): void {
    try {
      ensureCocosPlatform();
      ConfigService.ensureBundled();
      playerSave.loadLocal();
      const save = playerSave.get();
      this.selectedIslandId = "island_foam_bay";
      this.selectedToolId = save.tools[0]?.toolId ?? "tool_rod";
      console.log("baozou-flop-v28");
      SfxPlayer.setEnabled(save.settings.sfx);
      this.showHarbor();
      void this.bootstrapCloud();
    } catch (error) {
      console.error("Harbor bootstrap failed", error);
    }
  }

  private async bootstrapCloud(): Promise<void> {
    this.cloudKind = "syncing";
    try {
      const remote = platformAdapter().remoteConfig;
      if (remote) ConfigService.applyRemoteConfig(await remote.load<RemoteConfig>());
    } catch {
      // Bundled remote-default keeps the harbor playable.
    }
    await playerSave.load();
    try {
      this.authoritativeNow =
        await platformAdapter().dailyClaims?.serverNow();
    } catch {
      this.authoritativeNow = undefined;
    }
    try {
      await purchaseService().retryPendingFinalizations();
      await purchaseService().syncRevocations();
    } catch {
      // A still-valid server authority cache remains usable offline.
    }
    this.cloudKind = playerSave.cloudKind();
    if (this.surface === "harbor") {
      this.showHarbor();
      if (!playerSave.get().tutorialComplete) void this.sail();
    }
  }

  showHarbor(): void {
    this.surface = "harbor";
    const proto = this.node.getComponent(RuntimePrototype);
    if (proto) proto.destroy();
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });

    const save = playerSave.get();
    makeLabel(layer, "暴走鱼市 · 潮汐港口 v28", 34, 0, 310);
    this.coinsLabel = makeLabel(layer, `金币 ${save.coins}`, 24, 470, 310, 280);
    makeButton(layer, "设置", -530, 310, () => this.showSettings(), 140, 52, 22);
    makeButton(layer, "商店", 285, 260, () => void this.showStore(), 120, 48, 20);
    makeButton(layer, "外观", 425, 260, () => this.showCosmetics(), 120, 48, 20);
    makeLabel(layer, cloudStatusLine(this.cloudKind), 18, 0, 278, 900);
    this.status = makeLabel(
      layer,
      this.statusFlash ??
        (this.lastSummary
          ? `${settleHeadline(this.lastSummary)}。${settleSlogan(this.lastSummary)}`
          : harborNotice(ConfigService.remoteConfig().notice)),
      20,
      0,
      248,
    );

    const islands = harborIslandIds();
    const closedIds = ConfigService.remoteConfig().disabledIslands ?? [];
    islands.forEach((islandId) => {
      const island = ConfigService.islandById(islandId);
      const unlocked = save.unlockedIslands.includes(island.id);
      const selected = island.id === this.selectedIslandId;
      const closed = islandClosed(island.id, closedIds);
      const caption = closed
        ? closedIslandCaption(island.name)
        : unlocked
          ? `${selected ? "● " : ""}${island.name}`
          : `${island.name} ${island.unlockCost}`;
      makeButton(
        layer,
        caption,
        harborIslandX(island.id),
        188,
        () => void this.onIsland(island.id),
        240,
        56,
        22,
      );
    });

    ConfigService.allTools().forEach((tool, index) => {
      const owned = save.tools.find((entry) => entry.toolId === tool.id);
      const selected = tool.id === this.selectedToolId;
      const caption = owned
        ? `${selected ? "● " : ""}${tool.name} Lv${owned.level}`
        : `买${tool.name}`;
      makeButton(
        layer,
        caption,
        -340 + index * 340,
        40,
        () => void this.onTool(tool.id),
        300,
        72,
        22,
      );
    });

    const island = ConfigService.islandById(this.selectedIslandId);
    const tool = ConfigService.toolById(this.selectedToolId);
    const ownedTool = save.tools.find((entry) => entry.toolId === tool.id);
    const nextLevel = tool.levels.find(
      (level) => level.level === (ownedTool?.level ?? 0) + 1,
    );
    makeLabel(
      layer,
      `出航：${island.name} · ${tool.name} Lv${ownedTool?.level ?? 1}${
        nextLevel ? ` · 下级${nextLevel.upgradeCost}金` : " · 满级"
      }`,
      22,
      0,
      -40,
    );
    makeLabel(
      layer,
      `图鉴 ${save.discoveredFish.length}/${ConfigService.allFish().length}`,
      20,
      0,
      -90,
      1100,
    );

    makeButton(layer, "出海捕鱼", -120, -230, () => this.sail(), 210, 88, 26);
    makeButton(
      layer,
      ownedTool && nextLevel ? `升级${tool.name}` : "查看升级",
      -500,
      -230,
      () => void this.onUpgrade(),
      200,
      72,
      20,
    );
    makeButton(layer, "图鉴", 100, -230, () => this.showBook(), 150, 72, 22);
    makeButton(layer, "目标", 280, -230, () => this.showChallenges(), 150, 72, 22);
    makeButton(layer, "榜", 460, -230, () => this.showBoard(), 140, 72, 22);
  }

  private showSettle(
    summary: RunSummary,
    rewardAllowed = true,
    weekly = false,
  ): void {
    this.surface = "settle";
    this.pendingSummary = summary;
    this.pendingWeekly = weekly;
    const proto = this.node.getComponent(RuntimePrototype);
    if (proto) proto.destroy();
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });
    makeLabel(layer, "潮汐鱼市结算", 34, 0, 300);
    makeLabel(layer, settleHeadline(summary), 26, 0, 236);
    settleRows(summary, (id) => ConfigService.fishById(id).name).forEach(
      (row, index) => {
        makeLabel(layer, row, 22, 0, 170 - index * 36);
      },
    );
    makeLabel(layer, settleSlogan(summary), 22, 0, -80);
    const caption = summary.fish.length > 0 ? "卖到鱼市" : "回到港口";
    makeButton(
      layer,
      caption,
      -170,
      -230,
      () => void this.confirmSettle(summary, false),
      250,
      88,
      28,
    );
    if (rewardAllowed && summary.totalCoins > 0) {
      makeButton(
        layer,
        "广告加收50%",
        170,
        -230,
        () => void this.confirmSettle(summary, true),
        250,
        88,
        24,
      );
    }
  }

  private async showStore(): Promise<void> {
    this.surface = "store";
    Analytics.track("store_open", { platform: platformAdapter().kind });
    const store = purchaseService();
    await store.loadPrices();
    if (this.surface !== "store") return;
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });
    const save = playerSave.get();
    makeLabel(layer, "潮汐商店", 34, 0, 302);
    makeLabel(
      layer,
      platformAdapter().billing?.enabled
        ? "结账价格以平台弹窗为准"
        : "当前渠道未接商店，商品安全禁用",
      19,
      0,
      258,
    );
    visibleProducts(save.endlessTide.unlocked).forEach((product, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const owned =
        hasActiveEntitlement(save, product.id) ||
        (!!product.cosmeticId && save.cosmetics.includes(product.cosmeticId));
      makeButton(
        layer,
        `${owned ? "已拥有 " : ""}${product.title} ${store.displayPrice(product.id)}`,
        col === 0 ? -285 : 285,
        185 - row * 75,
        () => void this.buyProduct(product.id),
        500,
        60,
        19,
      );
    });
    makeButton(layer, "恢复购买", -150, -270, () => void this.restorePurchases(), 240, 58, 20);
    makeButton(layer, "返回港口", 150, -270, () => this.showHarbor(), 240, 58, 20);
  }

  private async buyProduct(productId: string): Promise<void> {
    const result = await purchaseService().purchase(productId);
    if (result.status === "granted") SfxPlayer.play("purchase");
    this.statusFlash =
      result.status === "granted"
        ? "购买已验证并发放"
        : result.status === "cancelled"
          ? "已取消，未扣除游戏内权益"
          : result.message ?? "购买未完成，未发放权益";
    await this.showStore();
  }

  private async restorePurchases(): Promise<void> {
    const count = await purchaseService().restore();
    this.statusFlash = count > 0 ? `已恢复${count}项已验证权益` : "没有可恢复的已验证权益";
    await this.showStore();
  }

  private showCosmetics(): void {
    this.surface = "cosmetics";
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });
    const save = playerSave.get();
    makeLabel(layer, "船坞外观", 34, 0, 300);
    if (save.cosmetics.length === 0) {
      makeLabel(layer, "尚未拥有外观；外观不提供数值增益。", 22, 0, 100);
    }
    save.cosmetics.forEach((id, index) => {
      const kind = cosmeticSlot(id);
      if (!kind) return;
      const selected = save.selectedCosmetics[kind] === id;
      makeButton(
        layer,
        `${selected ? "● " : ""}${id}`,
        0,
        180 - index * 70,
        () => void this.selectCosmetic(kind, id),
        420,
        56,
        21,
      );
    });
    makeButton(layer, "返回港口", 0, -250, () => this.showHarbor(), 240, 68, 22);
  }

  private async selectCosmetic(kind: "boat" | "trail", id: string): Promise<void> {
    const save = playerSave.get();
    if (!canSelectCosmetic(save.cosmetics, id, kind)) return;
    await playerSave.save({
      ...save,
      selectedCosmetics: { ...save.selectedCosmetics, [kind]: id },
    });
    Analytics.track("cosmetic_select", { kind, id });
    this.showCosmetics();
  }

  private showBook(): void {
    this.surface = "book";
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });
    const save = playerSave.get();
    makeLabel(layer, "潮汐图鉴", 34, 0, 300);
    makeLabel(
      layer,
      `已收 ${save.discoveredFish.length}/${ConfigService.allFish().length}`,
      22,
      0,
      246,
    );
    const allLines = bookLines(
      ConfigService.allFish(),
      save.discoveredFish,
      save.fishMastery,
    );
    const pageCount = Math.max(1, Math.ceil(allLines.length / 12));
    this.bookPage = Math.min(this.bookPage, pageCount - 1);
    allLines
      .slice(this.bookPage * 12, this.bookPage * 12 + 12)
      .forEach(
      (line, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        makeLabel(
          layer,
          line,
          22,
          col === 0 ? -280 : 280,
          170 - row * 42,
          420,
        );
      },
    );
    makeLabel(layer, `${this.bookPage + 1}/${pageCount}页`, 18, 0, -176, 160);
    if (this.bookPage > 0) {
      makeButton(layer, "上一页", -260, -250, () => {
        this.bookPage -= 1;
        this.showBook();
      }, 180, 64, 22);
    }
    if (this.bookPage + 1 < pageCount) {
      makeButton(layer, "下一页", 260, -250, () => {
        this.bookPage += 1;
        this.showBook();
      }, 180, 64, 22);
    }
    makeButton(layer, "返回港口", 0, -250, () => this.showHarbor(), 220, 64, 22);
  }

  private showChallenges(): void {
    this.surface = "challenges";
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });
    const save = playerSave.get();
    const toolKinds = save.tools.map(
      (owned) => ConfigService.toolById(owned.toolId).kind,
    );
    const daily = ensureDailyOrders(
      save.dailyOrders,
      this.authoritativeNow ?? Date.now(),
      save.unlockedIslands,
      toolKinds,
      this.authoritativeNow !== undefined,
    );
    if (daily !== save.dailyOrders) void this.applySavePatch({ dailyOrders: daily });
    const definitions = generateDailyOrders(
      daily.dateKey,
      save.unlockedIslands,
      toolKinds,
    );
    makeLabel(layer, "港口目标", 34, 0, 304);
    makeLabel(layer, `每日订单 ${daily.dateKey} · 约15分钟`, 22, -300, 250, 520);
    daily.orders.forEach((progress, index) => {
      const definition = definitions.find((item) => item.id === progress.id);
      const reward = definition?.reward;
      const rewardText =
        reward?.kind === "coins" ? `${reward.amount}金` : `${reward?.amount ?? 1}外观碎片`;
      const caption = `${definition?.title ?? "每日目标"} ${progress.current}/${progress.target} · ${progress.claimed ? "已领" : rewardText}`;
      makeButton(
        layer,
        caption,
        -300,
        185 - index * 62,
        () => void this.claimOrder(progress.id),
        540,
        52,
        18,
      );
    });
    const weekly = generateWeeklyRules(isoWeekKey(), ConfigService.allFish());
    makeLabel(layer, `周挑战 ${weekly.weekKey}`, 22, 330, 250, 500);
    makeLabel(
      layer,
      `${ConfigService.islandById(weekly.islandId).name} · ${weekly.toolKind} · 统一鱼池${weekly.fishPool.length}种\n本周 ${save.weeklyChallenge?.score ?? 0}分 · 最好${save.weeklyChallenge?.bestRun ?? 0}`,
      19,
      330,
      145,
      500,
    );
    makeButton(layer, "进入周挑战", 330, 45, () => void this.startWeekly(), 260, 62, 22);
    makeButton(
      layer,
      save.endlessTide.unlocked ? "进入无尽潮" : "无尽潮：击败Boss解锁",
      330,
      -45,
      () => void this.startEndless(),
      300,
      62,
      21,
    );
    makeButton(layer, "返回港口", 0, -250, () => this.showHarbor(), 240, 72, 24);
  }

  private async claimOrder(orderId: string): Promise<void> {
    try {
      const base = playerSave.get();
      const prepared = {
        ...base,
        dailyOrders: ensureDailyOrders(
          base.dailyOrders,
          this.authoritativeNow ?? Date.now(),
          base.unlockedIslands,
          base.tools.map((owned) => ConfigService.toolById(owned.toolId).kind),
          this.authoritativeNow !== undefined,
        ),
      };
      const authority = platformAdapter().dailyClaims;
      let next: PlayerSave;
      if (authority) {
        const result = await authority.claim(orderId);
        this.authoritativeNow = result.serverNow;
        next = applyAuthoritativeDailyClaim(
          prepared,
          orderId,
          result.reward,
          result.serverNow,
        );
      } else {
        next = claimDailyOrder(prepared, orderId);
      }
      await playerSave.save(next);
      Analytics.track("daily_order_claim", { orderId });
      this.showChallenges();
    } catch (error) {
      this.statusFlash = error instanceof Error ? error.message : "暂不可领取";
      this.showChallenges();
    }
  }

  private async startWeekly(): Promise<void> {
    const rules = generateWeeklyRules(isoWeekKey(), ConfigService.allFish());
    const tool =
      ConfigService.allTools().find((item) => item.kind === rules.toolKind) ??
      ConfigService.allTools()[0];
    Analytics.track("weekly_challenge_start", { weekKey: rules.weekKey, seed: rules.seed });
    await ensureIslandPack(rules.islandId);
    this.surface = "sea";
    RuntimePrototype.pending = {
      islandId: rules.islandId,
      toolId: tool.id,
      challenge: "weekly",
      weeklyRules: rules,
      onHarbor: (summary) => void this.finishWeekly(summary),
    };
    this.node.addComponent(RuntimePrototype);
  }

  private async finishWeekly(summary: RunSummary): Promise<void> {
    const weeklyChallenge = recordWeeklyAttempt(
      playerSave.get().weeklyChallenge,
      { score: summary.totalCoins },
    );
    await this.applySavePatch({ weeklyChallenge });
    Analytics.track("weekly_challenge_finish", {
      weekKey: weeklyChallenge.weekKey,
      score: summary.totalCoins,
      eligible: weeklyChallenge.leaderboardEligible,
    });
    this.showSettle(summary, false, true);
  }

  private async startEndless(): Promise<void> {
    const save = playerSave.get();
    if (!save.endlessTide.unlocked) {
      this.statusFlash = "先击败任意Boss解锁无尽潮。";
      this.showChallenges();
      return;
    }
    Analytics.track("endless_start", {});
    RuntimePrototype.pending = {
      islandId: this.selectedIslandId,
      toolId: this.selectedToolId,
      challenge: "endless",
      onHarbor: (summary) => void this.finishEndless(summary),
    };
    this.surface = "sea";
    this.node.addComponent(RuntimePrototype);
  }

  private async finishEndless(summary: RunSummary): Promise<void> {
    const save = playerSave.get();
    await this.applySavePatch({
      endlessTide: {
        ...save.endlessTide,
        runs: save.endlessTide.runs + 1,
        bestRound: Math.max(
          save.endlessTide.bestRound,
          summary.endlessRound ?? 1,
        ),
        bestBankedCoins: Math.max(save.endlessTide.bestBankedCoins, summary.totalCoins),
      },
    });
    Analytics.track("endless_withdraw", { round: 1, coins: summary.totalCoins });
    this.showSettle(summary);
  }

  private showSettings(): void {
    this.surface = "settings";
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });
    const save = playerSave.get();
    makeLabel(layer, "潮汐设置", 34, 0, 300);
    makeLabel(
      layer,
      `${cloudStatusLine(this.cloudKind)}。音效是短提示音。关了出海也静音。震动在真机上才有。`,
      20,
      0,
      248,
    );
    makeButton(
      layer,
      settingCaption("音效", save.settings.sfx),
      0,
      150,
      () => void this.toggleSetting("sfx"),
      320,
      68,
      26,
    );
    makeButton(
      layer,
      settingCaption("震动", save.settings.vibration),
      0,
      60,
      () => void this.toggleSetting("vibration"),
      320,
      68,
      26,
    );
    makeButton(
      layer,
      settingCaption("低配", save.settings.lowPower),
      0,
      -30,
      () => void this.toggleSetting("lowPower"),
      320,
      68,
      26,
    );
    makeButton(
      layer,
      privacyTitle(),
      -160,
      -130,
      () => this.showPrivacy(),
      240,
      56,
      22,
    );
    makeButton(
      layer,
      wipeCaption(),
      160,
      -130,
      () => this.showWipe(),
      240,
      56,
      22,
    );
    makeButton(layer, "返回港口", 0, -250, () => this.showHarbor(), 240, 72, 24);
  }

  private showPrivacy(): void {
    this.surface = "privacy";
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });
    makeLabel(layer, privacyTitle(), 34, 0, 300);
    privacyLines().forEach((line, index) => {
      makeLabel(layer, line, 20, 0, 230 - index * 52, 1080);
    });
    makeButton(
      layer,
      privacyBackCaption(),
      0,
      -250,
      () => this.showSettings(),
      240,
      72,
      24,
    );
  }

  private showWipe(): void {
    this.surface = "wipe";
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });
    makeLabel(layer, wipeTitle(), 34, 0, 220);
    makeLabel(layer, wipeBody(), 22, 0, 120, 980);
    makeButton(
      layer,
      wipeConfirmCaption(),
      -180,
      -80,
      () => void this.confirmWipe(),
      240,
      72,
      24,
    );
    makeButton(
      layer,
      wipeCancelCaption(),
      180,
      -80,
      () => this.showSettings(),
      240,
      72,
      24,
    );
  }

  private async confirmWipe(): Promise<void> {
    const error = await HarborActions.clearSave();
    this.cloudKind = playerSave.cloudKind();
    this.selectedIslandId = "island_foam_bay";
    this.selectedToolId = playerSave.get().tools[0]?.toolId ?? "tool_rod";
    this.lastSummary = undefined;
    this.pendingSummary = undefined;
    SfxPlayer.setEnabled(playerSave.get().settings.sfx);
    this.statusFlash = error ?? wipeDoneNotice();
    this.showHarbor();
  }

  private showBoard(): void {
    this.surface = "board";
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });
    const save = playerSave.get();
    makeLabel(layer, "潮汐精彩榜", 34, 0, 300);
    makeLabel(layer, bestStyleLine(save.bestStyleScore), 26, 0, 252);
    makeLabel(layer, `已出 ${save.completedRuns} 局`, 20, 0, 214);
    boardLines(save.recentRuns ?? [], (id) => {
      try {
        return ConfigService.islandById(id).name;
      } catch {
        return id;
      }
    })
      .slice(0, 3)
      .forEach((line, index) => {
        makeLabel(layer, line, 22, 0, 168 - index * 34);
      });
    const openData = FriendBoardView.mount(
      layer,
      0,
      -20,
      880,
      220,
      save.bestStyleScore,
    );
    makeLabel(layer, friendBoardHint(openData), 18, 0, openData ? -160 : -80);
    makeButton(layer, "返回港口", 0, -250, () => this.showHarbor(), 240, 72, 24);
  }

  private async applySavePatch(partial: Partial<PlayerSave>): Promise<void> {
    const current = playerSave.get();
    await playerSave.save({
      ...current,
      ...partial,
      unlockedIslands: partial.unlockedIslands ?? current.unlockedIslands,
      tools: partial.tools ?? current.tools,
    });
    if (this.surface === "harbor" || this.surface === "settle") this.showHarbor();
  }

  private async toggleSetting(
    key: "sfx" | "vibration" | "lowPower",
  ): Promise<void> {
    const save = playerSave.get();
    const error = await HarborActions.patchSettings({
      [key]: !save.settings[key],
    });
    SfxPlayer.setEnabled(playerSave.get().settings.sfx);
    if (key === "sfx" && playerSave.get().settings.sfx) SfxPlayer.play("ui");
    this.showSettings();
    if (error) this.setStatus(error);
  }

  private async confirmSettle(summary?: RunSummary, rewardAd = false): Promise<void> {
    const run = summary ?? this.pendingSummary;
    if (!run || this.settling) return;
    this.settling = true;
    const weekly = this.pendingWeekly;
    try {
      const next = settleRun(playerSave.get(), run);
      await playerSave.save(next);
      try {
        await platformAdapter().dailyClaims?.recordRun(
          run,
          next.dailyOrders?.orders.map((item) => item.id) ?? [],
        );
      } catch {
        this.statusFlash = "订单进度待联网校验，当前不可领取";
      }
      if (rewardAd) {
        const bonus = await adGrants.rewardSettlement(run.runId, run.totalCoins);
        this.statusFlash = bonus > 0 ? `广告奖励 +${bonus}金币` : "广告未完成，正常结算不受影响";
      }
      Analytics.track("daily_order_progress", {
        dateKey: next.dailyOrders?.dateKey,
        orders: next.dailyOrders?.orders.map((item) => ({
          id: item.id,
          current: item.current,
          target: item.target,
        })),
      });
      this.cloudKind = playerSave.cloudKind();
      if (run.fish.length > 0) SfxPlayer.play("sell");
      LeaderboardService.submitStyleScore(next.bestStyleScore);
      void LeaderboardService.submit(run).catch(() => undefined);
      this.lastSummary = run;
      this.pendingSummary = undefined;
      this.pendingWeekly = false;
      if (!rewardAd) this.statusFlash = undefined;
      this.showHarbor();
      void adGrants.showInterstitial(weekly);
    } finally {
      this.settling = false;
    }
  }

  private async onIsland(islandId: string): Promise<void> {
    if (islandClosed(islandId, ConfigService.remoteConfig().disabledIslands ?? [])) {
      this.setStatus(closedIslandCaption(ConfigService.islandById(islandId).name));
      return;
    }
    const save = playerSave.get();
    if (!save.unlockedIslands.includes(islandId)) {
      const error = await HarborActions.unlockIsland(islandId);
      this.setStatus(error ?? `已解锁${ConfigService.islandById(islandId).name}`);
      if (!error) this.selectedIslandId = islandId;
      if (!error) {
        Analytics.track("content_progress", {
          kind: "island_unlock",
          islandId,
        });
      }
      this.showHarbor();
      return;
    }
    this.selectedIslandId = islandId;
    this.setStatus(`已选择${ConfigService.islandById(islandId).name}`);
    this.showHarbor();
  }

  private async onTool(toolId: string): Promise<void> {
    const save = playerSave.get();
    const owned = save.tools.find((entry) => entry.toolId === toolId);
    if (!owned) {
      const error = await HarborActions.buyTool(toolId);
      this.setStatus(error ?? `已购入${ConfigService.toolById(toolId).name}`);
      if (!error) this.selectedToolId = toolId;
      this.showHarbor();
      return;
    }
    this.selectedToolId = toolId;
    this.setStatus(`已装备${ConfigService.toolById(toolId).name}`);
    this.showHarbor();
  }

  private async onUpgrade(): Promise<void> {
    const error = await HarborActions.upgrade(this.selectedToolId);
    this.setStatus(
      error ?? `${ConfigService.toolById(this.selectedToolId).name}升级成功`,
    );
    this.showHarbor();
  }

  private async sail(): Promise<void> {
    const save = playerSave.get();
    if (islandClosed(this.selectedIslandId, ConfigService.remoteConfig().disabledIslands ?? [])) {
      this.setStatus(
        closedIslandCaption(ConfigService.islandById(this.selectedIslandId).name),
      );
      return;
    }
    if (!save.unlockedIslands.includes(this.selectedIslandId)) {
      this.setStatus("先解锁这座岛。");
      return;
    }
    if (!save.tools.some((entry) => entry.toolId === this.selectedToolId)) {
      this.setStatus("先买下这件工具。");
      return;
    }
    const island = ConfigService.islandById(this.selectedIslandId);
    const pool = fishIdsForIsland(island);
    if (pool.length === 0) {
      this.setStatus("这座岛还没有鱼。");
      return;
    }
    this.setStatus(harborSailWait(island.name));
    await ensureIslandPack(this.selectedIslandId);
    this.statusFlash = undefined;
    this.surface = "sea";
    RuntimePrototype.pending = {
      islandId: this.selectedIslandId,
      toolId: this.selectedToolId,
      onHarbor: (summary) => this.showSettle(summary),
    };
    const existing = this.node.getComponent(RuntimePrototype);
    if (existing) existing.destroy();
    this.node.addComponent(RuntimePrototype);
  }

  private setStatus(value: string): void {
    this.statusFlash = value;
    if (this.status) this.status.string = value;
    if (this.coinsLabel) this.coinsLabel.string = `金币 ${playerSave.get().coins}`;
  }
}
