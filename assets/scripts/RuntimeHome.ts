import { _decorator, Color, Component, Graphics, Label, Node } from "cc";
import { fishIdsForIsland } from "./content/IslandFishPool";
import { ConfigService } from "./data/ConfigService";
import type { PlayerSave, RemoteConfig, RunSummary } from "./data/types";
import {
  bookLines,
  settleRun,
  coinJumpCaption,
  discoveryToastLine,
  firstCatchIds,
  settleHeadline,
  settleRows,
  settleSlogan,
} from "./domain/SettleCopy";
import {
  coinJumpAlpha,
  coinJumpLiftPx,
  coinJumpSeconds,
  discoveryPunchSeconds,
  sellPunchSeconds,
  settingCaption,
} from "./domain/GameFeel";
import { sellGoalBridge, sellPopup } from "./domain/StyleCallout";
import {
  spawnGoldRain,
  tickJuice,
  tickJuiceFlash,
  type JuiceFlash,
  type JuiceParticle,
  spawnJuiceFlash,
} from "./domain/HitJuice";
import {
  bestStyleLine,
  boardLines,
  friendBoardHint,
} from "./domain/BoardCopy";
import {
  closedIslandCaption,
  cloudStatusLine,
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
  makePlate,
  makeProgressBar,
  replacePlayLayer,
  tintGold,
} from "./ui/RuntimeUi";
import { drawGuideHole, drawJuice } from "./ui/GrayArt";
import { harborIslandIds, harborIslandX } from "./domain/GrayLook";
import { FriendBoardView } from "./ui/FriendBoardView";
import { ensureIslandPack } from "./content/IslandPackLoader";
import {
  decideSailAfterPack,
  harborPackFailCopy,
  harborSailWait,
} from "./domain/IslandPack";
import { canSelectCosmetic, cosmeticSlot } from "./domain/MarketArtStyle";
import {
  harborBuildingBack,
  harborBuildingBody,
  harborBuildingTitle,
  harborFlotsamDeliverToast,
  harborFlotsamHeldLine,
  harborFlotsamPickCaption,
  harborFlotsamPickedToast,
  harborOrderAcceptCaption,
  harborOrderAcceptHint,
  harborOrderDeliverCaption,
  harborOrderDeliverHint,
  harborOrderName,
  harborOrderNeedLine,
  harborOrderBoardLabel,
  harborPontoonBuiltHint,
  harborPontoonTierLine,
  harborPontoonUpgradeCaption,
  harborPontoonUpgradeLabel,
  harborPontoonUpgradeToast,
  harborSideSystemsVisible,
  harborBrowseChromeVisible,
  harborFirstScreen,
  harborWorldTitle,
  HARBOR_PROMPT_Y,
  HARBOR_TITLE_Y,
  type HarborBuildingKind,
} from "./domain/HarborCopy";
import {
  canAcceptOrder,
  canDeliverOrder,
  canPickFlotsam,
  canUpgradePontoon,
  normalizeStation,
  stationOrderNeed,
} from "./domain/StationOps";
import {
  healthAdviceLines,
  healthAdviceTitle,
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
import {
  DEFAULT_SAIL_ISLAND_ID,
  TUTORIAL_ISLAND_ID,
  harborChipSelected,
  harborFeatureButtonLabel,
  harborFeatureLockedHint,
  harborGoalPrompt,
  harborHudPhase,
  harborHudShowDiscovery,
  harborHudShowMeta,
  harborHudToastText,
  harborIslandChipCaption,
  harborNextCta,
  harborNextPrompt,
  harborSailCaption,
  harborToastHoldSeconds,
  harborUnlocksForSave,
  harborUpgradeBarVisible,
  harborUpgradeCtaLabel,
  resolveHarborIsland,
  tutorialGuideRing,
  upgradeProgressRatio,
} from "./domain/TutorialFlow";
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
import { HarborStage } from "./world/HarborStage";

const { ccclass } = _decorator;

@ccclass("RuntimeHome")
export class RuntimeHome extends Component {
  private status!: Label;
  private coinsLabel!: Label;
  private selectedIslandId = DEFAULT_SAIL_ISLAND_ID;
  private selectedToolId = "tool_rod";
  private lastSummary?: RunSummary;
  private pendingSummary?: RunSummary;
  private settling = false;
  private pendingWeekly = false;
  private authoritativeNow?: number;
  private cloudKind: CloudKind = "syncing";
  private statusFlash?: string;
  private bookPage = 0;
  private toastLabel?: Label;
  private toastLeft = 0;
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
    | "building"
    | "settle"
    | "sea" = "harbor";
  private justDiscovered: string[] = [];
  private coinJumpLabel?: Label;
  private coinJumpGained = 0;
  private coinJumpLeft = 0;
  private coinJumpElapsed = 0;
  private sellCallout?: Label;
  private sellPunchLeft = 0;
  private sellPunchElapsed = 0;
  private discoveryLabel?: Label;
  private discoveryPunchLeft = 0;
  private discoveryPunchElapsed = 0;
  private gold: JuiceParticle[] = [];
  private goldFlash?: JuiceFlash;
  private goldGfx?: Graphics;
  private settleGuide?: Graphics;
  private settleGuideAt = { x: 0, y: -230 };
  private harbor3d?: HarborStage;

  protected onLoad(): void {
    try {
      ensureCocosPlatform();
      ConfigService.ensureBundled();
      playerSave.loadLocal();
      const save = playerSave.get();
      this.selectedIslandId = resolveHarborIsland(
        save.tutorialComplete,
        DEFAULT_SAIL_ISLAND_ID,
      );
      this.selectedToolId = save.tools[0]?.toolId ?? "tool_rod";
      console.log("baozou-flop-v33");
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
    const save = playerSave.get();
    this.selectedIslandId = resolveHarborIsland(
      save.tutorialComplete,
      this.selectedIslandId,
    );
    if (this.surface === "harbor") {
      this.showHarbor();
      if (!save.tutorialComplete) void this.sail();
    }
  }

  protected onDestroy(): void {
    HarborStage.drop();
    this.harbor3d = undefined;
  }

  showHarbor(): void {
    this.surface = "harbor";
    const proto = this.node.getComponent(RuntimePrototype);
    if (proto) proto.destroy();
    const layer = replacePlayLayer(this.node);
    this.paintHarborWorld(layer);

    const save = playerSave.get();
    this.selectedIslandId = resolveHarborIsland(
      save.tutorialComplete,
      this.selectedIslandId,
    );
    const unlocks = harborUnlocksForSave(save);
    const island = ConfigService.islandById(this.selectedIslandId);
    const tool = ConfigService.toolById(this.selectedToolId);
    const ownedTool = save.tools.find((entry) => entry.toolId === tool.id);
    const nextLevel = tool.levels.find(
      (level) => level.level === (ownedTool?.level ?? 0) + 1,
    );
    makeLabel(layer, harborWorldTitle(), 36, 0, HARBOR_TITLE_Y);
    this.coinsLabel = tintGold(makeLabel(layer, `金币 ${save.coins}`, 26, 470, HARBOR_TITLE_Y, 280));
    this.settleGuide = undefined;
    this.goldGfx = undefined;
    if (this.coinJumpGained > 0) {
      this.coinJumpLabel = tintGold(
        makeLabel(layer, coinJumpCaption(this.coinJumpGained), 28, 470, 274, 280),
      );
      const sellLine = nextLevel
        ? sellGoalBridge(this.coinJumpGained, save.coins, nextLevel.upgradeCost)
        : sellPopup(this.coinJumpGained);
      this.sellCallout = tintGold(makeLabel(layer, sellLine, 28, 0, 120, 640));
      const juiceNode = new Node("GoldRain");
      juiceNode.layer = layer.layer;
      juiceNode.parent = layer;
      this.goldGfx = juiceNode.addComponent(Graphics);
    } else {
      this.coinJumpLabel = undefined;
      this.sellCallout = undefined;
    }
    makeButton(layer, "设置", -530, HARBOR_TITLE_Y, () => this.showSettings(), 140, 52, 22);
    const firstScreen = harborFirstScreen(save.tutorialComplete);
    const sideOpen = harborSideSystemsVisible(save.tutorialComplete);
    const browseOpen = harborBrowseChromeVisible(save.tutorialComplete);
    if (sideOpen) {
      makeButton(layer, "商店", 260, 270, () => void this.showStore(), 120, 46, 19);
      makeButton(layer, "外观", 400, 270, () => this.showCosmetics(), 120, 46, 19);
    }
    const nextCta = harborNextCta({
      tutorialComplete: save.tutorialComplete,
      completedRuns: save.completedRuns,
      pendingSell: false,
      upgradeUnlocked: unlocks.upgrade,
      coins: save.coins,
      nextUpgradeCost: nextLevel?.upgradeCost,
    });
    const goal = harborGoalPrompt({
      tutorialComplete: save.tutorialComplete,
      completedRuns: save.completedRuns,
      coins: save.coins,
      nextUpgradeCost: nextLevel?.upgradeCost,
      upgradeUnlocked: unlocks.upgrade,
    });
    const phase = harborHudPhase({
      sellJuiceActive: this.coinJumpLeft > 0,
      toastActive: this.toastLeft > 0 && !!this.statusFlash,
    });
    const showMeta = harborHudShowMeta(phase, save.tutorialComplete);
    const discoveryText = discoveryToastLine(
      this.justDiscovered.map((id) => {
        try {
          return ConfigService.fishById(id).name;
        } catch {
          return id;
        }
      }),
    );
    const showDiscovery = harborHudShowDiscovery(phase, !!discoveryText);
    if (showMeta) {
      makeLabel(layer, cloudStatusLine(this.cloudKind), 18, 0, 278, 900);
      makeLabel(
        layer,
        healthAdviceLines()[1] ?? healthAdviceLines()[0],
        16,
        0,
        262,
        1100,
      );
    }
    makePlate(layer, 0, HARBOR_PROMPT_Y, firstScreen, 820, 48);
    this.status = makeLabel(layer, goal, 20, 0, HARBOR_PROMPT_Y);
    const nextCost = nextLevel?.upgradeCost;
    if (
      nextCost != null &&
      harborUpgradeBarVisible({
        tutorialComplete: save.tutorialComplete,
        coins: save.coins,
        nextUpgradeCost: nextCost,
      })
    ) {
      makeProgressBar(
        layer,
        0,
        214,
        380,
        upgradeProgressRatio(save.coins, nextCost),
      );
    }
    this.status.color = new Color(255, 252, 236, 255);
    const toastText = harborHudToastText({
      phase,
      toast: this.statusFlash,
      discoveryText: discoveryText || undefined,
    });
    if (toastText) {
      this.toastLabel = makeLabel(layer, toastText, 22, 0, 206, 720);
      if (showDiscovery && toastText === discoveryText) {
        this.discoveryLabel = tintGold(this.toastLabel);
      } else {
        this.discoveryLabel = undefined;
      }
    } else {
      this.toastLabel = undefined;
      this.discoveryLabel = undefined;
    }

    const islands = harborIslandIds();
    const closedIds = ConfigService.remoteConfig().disabledIslands ?? [];
    if (browseOpen) {
      islands.forEach((islandId) => {
        const island = ConfigService.islandById(islandId);
        const unlocked = save.unlockedIslands.includes(island.id);
        const selected = harborChipSelected(
          island.id,
          save.tutorialComplete,
          this.selectedIslandId,
        );
        const closed = islandClosed(island.id, closedIds);
        const caption = closed
          ? closedIslandCaption(island.name)
          : harborIslandChipCaption({
              name: island.name,
              unlockCost: island.unlockCost,
              unlocked,
              selected,
              tutorialComplete: save.tutorialComplete,
            });
        makeButton(
          layer,
          caption,
          harborIslandX(island.id),
          164,
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
    }

    const station = normalizeStation(save.station);
    if (sideOpen) {
      if (canPickFlotsam(station)) {
        makeButton(
          layer,
          harborFlotsamPickCaption(),
          340,
          -40,
          () => void this.onPickFlotsam(),
          180,
          52,
          20,
        );
      } else if (station.flotsamHeld > 0) {
        makeLabel(layer, harborFlotsamHeldLine(station.flotsamHeld), 18, 340, -40, 280);
      }
      makeButton(
        layer,
        harborOrderBoardLabel(),
        -340,
        -140,
        () => this.showBuilding("orders"),
        180,
        52,
        20,
      );
      makeButton(
        layer,
        harborPontoonUpgradeLabel(),
        80,
        -140,
        () => this.showBuilding("pontoon"),
        180,
        52,
        20,
      );
    }
    if (firstScreen) {
      makeButton(
        layer,
        harborSailCaption(false),
        0,
        -220,
        () => this.sail(),
        300,
        96,
        32,
        "primary",
      );
      return;
    }
    makeButton(
      layer,
      harborSailCaption(save.tutorialComplete, save.completedRuns),
      -80,
      -230,
      () => this.sail(),
      230,
      90,
      30,
      nextCta === "sail" ? "primary" : "secondary",
    );
    makeButton(
      layer,
      harborUpgradeCtaLabel({
        tutorialComplete: save.tutorialComplete,
        completedRuns: save.completedRuns,
        coins: save.coins,
        nextUpgradeCost: nextLevel?.upgradeCost,
        toolName: tool.name,
      }),
      -470,
      -230,
      () => void this.onUpgrade(),
      nextCta === "upgrade" ? 220 : 200,
      nextCta === "upgrade" ? 84 : 72,
      nextCta === "upgrade" ? 26 : 20,
      nextCta === "upgrade" ? "primary" : "secondary",
    );
    makeButton(
      layer,
      harborFeatureButtonLabel("book", save),
      180,
      -230,
      () => {
        if (!unlocks.book) {
          this.setStatus(harborFeatureLockedHint("book", save));
          this.showHarbor();
          return;
        }
        this.showBook();
      },
      140,
      72,
      20,
    );
    if (sideOpen) {
      makeButton(layer, "目标", 350, -230, () => this.showChallenges(), 140, 72, 20);
    }
    makeButton(
      layer,
      harborFeatureButtonLabel("board", save),
      520,
      -230,
      () => {
        if (!unlocks.board) {
          this.setStatus(harborFeatureLockedHint("board", save));
          this.showHarbor();
          return;
        }
        this.showBoard();
      },
      100,
      72,
      19,
    );
  }

  private showBuilding(kind: HarborBuildingKind): void {
    this.surface = "building";
    const proto = this.node.getComponent(RuntimePrototype);
    if (proto) proto.destroy();
    const layer = replacePlayLayer(this.node);
    this.paintHarborWorld(layer);
    const station = HarborActions.readStation();
    makeLabel(layer, harborBuildingTitle(kind), 34, 0, 220);
    if (kind === "pontoon") {
      makeLabel(layer, harborPontoonTierLine(station.pontoonTier), 24, 0, 160, 900);
      makeLabel(layer, harborBuildingBody("pontoon", station.pontoonTier), 22, 0, 90, 980);
      makeLabel(layer, harborPontoonBuiltHint(), 18, 0, 30, 900);
      makeButton(
        layer,
        harborPontoonUpgradeCaption(station.pontoonTier),
        0,
        -140,
        () => void this.onUpgradePontoon(),
        260,
        64,
        22,
      );
    } else {
      makeLabel(layer, harborOrderName(), 26, 0, 164);
      makeLabel(layer, harborBuildingBody("orders"), 22, 0, 100, 980);
      makeLabel(
        layer,
        harborOrderNeedLine(station.orderProgress, stationOrderNeed()),
        22,
        0,
        40,
      );
      if (station.flotsamHeld > 0) {
        makeLabel(layer, harborFlotsamHeldLine(station.flotsamHeld), 18, 0, 8, 720);
      }
      makeButton(
        layer,
        harborOrderAcceptCaption(station.orderAccepted),
        -180,
        -140,
        () => void this.onAcceptOrder(),
        200,
        64,
        22,
      );
      makeButton(
        layer,
        harborOrderDeliverCaption(station.orderDelivered),
        180,
        -140,
        () => void this.onDeliverOrder(),
        200,
        64,
        22,
      );
    }
    makeButton(
      layer,
      harborBuildingBack(),
      0,
      -250,
      () => this.showHarbor(),
      240,
      72,
      24,
    );
  }

  private async onAcceptOrder(): Promise<void> {
    const station = HarborActions.readStation();
    if (!canAcceptOrder(station)) {
      this.setStatus(
        station.orderDelivered
          ? harborOrderDeliverCaption(true)
          : harborOrderAcceptCaption(true),
      );
      this.showBuilding("orders");
      return;
    }
    const error = await HarborActions.acceptOrder();
    this.setStatus(error ?? harborOrderAcceptCaption(true));
    this.showBuilding("orders");
  }

  private async onDeliverOrder(): Promise<void> {
    const station = HarborActions.readStation();
    if (!canDeliverOrder(station)) {
      this.setStatus(
        station.orderDelivered
          ? harborOrderDeliverCaption(true)
          : station.orderAccepted
            ? harborOrderDeliverHint()
            : harborOrderAcceptHint(),
      );
      this.showBuilding("orders");
      return;
    }
    const error = await HarborActions.deliverOrder();
    this.setStatus(error ?? harborFlotsamDeliverToast());
    this.showBuilding("orders");
  }

  private async onPickFlotsam(): Promise<void> {
    const station = HarborActions.readStation();
    if (!canPickFlotsam(station)) return;
    const error = await HarborActions.pickFlotsam();
    this.setStatus(error ?? harborFlotsamPickedToast());
    this.showHarbor();
  }

  private async onUpgradePontoon(): Promise<void> {
    const station = HarborActions.readStation();
    if (!canUpgradePontoon(station)) {
      this.setStatus(harborPontoonUpgradeCaption(station.pontoonTier));
      this.showBuilding("pontoon");
      return;
    }
    const error = await HarborActions.upgradePontoon();
    HarborStage.drop();
    this.harbor3d = undefined;
    this.setStatus(error ?? harborPontoonUpgradeToast());
    this.showBuilding("pontoon");
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
    this.paintHarborWorld(layer);
    makeLabel(layer, "潮汐鱼市结算", 34, 0, 300);
    makeLabel(layer, settleHeadline(summary), 26, 0, 236);
    const knownBefore = playerSave.get().discoveredFish;
    const firstNames = firstCatchIds(
      summary.fish.map((item) => item.fishId),
      knownBefore,
    ).map((id) => ConfigService.fishById(id).name);
    const toast = discoveryToastLine(firstNames);
    if (toast) {
      makePlate(layer, 0, 204, true, 640, 40);
      tintGold(makeLabel(layer, toast, 24, 0, 204));
    }
    settleRows(
      summary,
      (id) => ConfigService.fishById(id).name,
      knownBefore,
    ).forEach((row, index) => {
      makeLabel(layer, row, 22, 0, 170 - index * 36);
    });
    makeLabel(
      layer,
      summary.fish.length > 0
        ? harborNextPrompt("sell")
        : settleSlogan(summary),
      22,
      0,
      -80,
    );
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
      "primary",
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
    this.settleGuideAt = { x: -170, y: -230 };
    if (summary.fish.length > 0) {
      const guideNode = new Node("SellGuide");
      guideNode.layer = layer.layer;
      guideNode.parent = layer;
      this.settleGuide = guideNode.addComponent(Graphics);
    } else {
      this.settleGuide = undefined;
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
    this.paintHarborWorld(layer);
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
    this.paintHarborWorld(layer);
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
    this.paintHarborWorld(layer);
    makeLabel(layer, privacyTitle(), 34, 0, 300);
    makeLabel(layer, healthAdviceTitle(), 22, 0, 258);
    healthAdviceLines().forEach((line, index) => {
      makeLabel(layer, line, 16, 0, 228 - index * 28, 1100);
    });
    privacyLines().forEach((line, index) => {
      makeLabel(layer, line, 18, 0, 160 - index * 40, 1080);
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
    this.paintHarborWorld(layer);
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
    this.selectedIslandId = resolveHarborIsland(
      playerSave.get().tutorialComplete,
      DEFAULT_SAIL_ISLAND_ID,
    );
    this.selectedToolId = playerSave.get().tools[0]?.toolId ?? "tool_rod";
    this.lastSummary = undefined;
    this.pendingSummary = undefined;
    SfxPlayer.setEnabled(playerSave.get().settings.sfx);
    this.statusFlash = error ?? wipeDoneNotice();
    this.toastLeft = harborToastHoldSeconds();
    this.showHarbor();
  }

  private showBoard(): void {
    this.surface = "board";
    const layer = replacePlayLayer(this.node);
    this.paintHarborWorld(layer);
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
    makeLabel(
      layer,
      friendBoardHint(openData, this.cloudKind === "cloud"),
      18,
      0,
      openData ? -160 : -80,
    );
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
      const before = playerSave.get();
      const next = settleRun(before, run);
      this.justDiscovered = firstCatchIds(
        run.fish.map((item) => item.fishId),
        before.discoveredFish,
      );
      this.coinJumpGained = run.totalCoins;
      this.coinJumpElapsed = 0;
      this.coinJumpLeft = run.totalCoins > 0 ? coinJumpSeconds() : 0;
      this.sellPunchElapsed = 0;
      this.sellPunchLeft = run.totalCoins > 0 ? sellPunchSeconds(false) : 0;
      this.discoveryPunchElapsed = 0;
      this.discoveryPunchLeft =
        this.justDiscovered.length > 0 ? discoveryPunchSeconds(false) : 0;
      this.gold = run.totalCoins > 0 ? spawnGoldRain(470, 300, false) : [];
      this.goldFlash =
        run.totalCoins > 0 ? spawnJuiceFlash("sell", 470, 300, false) : undefined;
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
      if (!rewardAd) {
        const toast = discoveryToastLine(
          this.justDiscovered.map((id) => ConfigService.fishById(id).name),
        );
        this.statusFlash = toast || undefined;
      }
      this.toastLeft =
        this.coinJumpLeft > 0 || !this.statusFlash ? 0 : harborToastHoldSeconds();
      this.selectedIslandId = resolveHarborIsland(
        next.tutorialComplete,
        this.selectedIslandId,
      );
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
    if (!save.tutorialComplete) {
      this.setStatus("先完成练潮码头教学，再自由选岛。");
      this.showHarbor();
      return;
    }
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
    const saveForUpgrade = playerSave.get();
    if (!harborUnlocksForSave(saveForUpgrade).upgrade) {
      this.setStatus(harborFeatureLockedHint("upgrade", saveForUpgrade));
      return;
    }
    const error = await HarborActions.upgrade(this.selectedToolId);
    this.setStatus(
      error ?? `${ConfigService.toolById(this.selectedToolId).name}升级成功`,
    );
    this.showHarbor();
  }

  private async sail(): Promise<void> {
    const save = playerSave.get();
    this.selectedIslandId = resolveHarborIsland(
      save.tutorialComplete,
      this.selectedIslandId,
    );
    if (!save.tutorialComplete) {
      this.selectedToolId = "tool_rod";
    }
    if (islandClosed(this.selectedIslandId, ConfigService.remoteConfig().disabledIslands ?? [])) {
      this.setStatus(
        closedIslandCaption(ConfigService.islandById(this.selectedIslandId).name),
      );
      return;
    }
    if (
      this.selectedIslandId !== TUTORIAL_ISLAND_ID &&
      !save.unlockedIslands.includes(this.selectedIslandId)
    ) {
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
    const packReady = await ensureIslandPack(this.selectedIslandId);
    if (decideSailAfterPack(packReady) === "stay_harbor") {
      this.setStatus(harborPackFailCopy(island.name));
      return;
    }
    this.statusFlash = undefined;
    this.surface = "sea";
    HarborStage.drop();
    this.harbor3d = undefined;
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
    this.toastLeft = harborToastHoldSeconds();
    if (this.coinsLabel?.isValid) {
      this.coinsLabel.string = `金币 ${playerSave.get().coins}`;
      tintGold(this.coinsLabel);
    }
  }

  private paintHarborWorld(layer: Node): void {
    const station = HarborActions.readStation();
    try {
      this.harbor3d = HarborStage.ensure(this.node, {
        pontoonTier: station.pontoonTier,
        showFlotsam: station.flotsamSpawned,
      });
    } catch (error) {
      console.warn("Harbor 3D unavailable; using 2D fallback", error);
      this.harbor3d = undefined;
      drawOcean(layer, {
        harbor: true,
        pontoonTier: station.pontoonTier,
        showFlotsam: station.flotsamSpawned,
      });
    }
  }

  protected update(dt: number): void {
    this.harbor3d?.tick(dt, playerSave.get().settings.lowPower);
    if (this.gold.length > 0 || this.goldFlash) {
      this.gold = tickJuice(this.gold, dt);
      this.goldFlash = tickJuiceFlash(this.goldFlash, dt);
      if (this.goldGfx?.isValid) {
        drawJuice(this.goldGfx, this.gold, this.goldFlash ? [this.goldFlash] : []);
      }
    }
    if (this.coinJumpLabel?.isValid && this.coinJumpLeft > 0) {
      this.coinJumpElapsed += dt;
      this.coinJumpLeft = Math.max(0, this.coinJumpLeft - dt);
      const lift = coinJumpLiftPx(this.coinJumpElapsed);
      const fade = Math.round(255 * coinJumpAlpha(this.coinJumpElapsed));
      this.coinJumpLabel.node.setPosition(470, 274 + lift);
      this.coinJumpLabel.color = new Color(255, 220, 72, fade);
      if (this.sellCallout?.isValid) {
        this.sellCallout.node.setPosition(0, 120 + lift * 0.35);
        this.sellCallout.color = new Color(255, 220, 72, fade);
      }
      if (this.coinJumpLeft <= 0) {
        this.coinJumpGained = 0;
        this.coinJumpLabel.string = "";
        if (this.sellCallout) this.sellCallout.string = "";
        if (this.statusFlash && this.toastLeft <= 0) {
          this.toastLeft = harborToastHoldSeconds();
        }
        if (this.surface === "harbor") this.showHarbor();
      }
    }
    if (this.coinJumpLeft <= 0 && this.toastLeft > 0) {
      this.toastLeft = Math.max(0, this.toastLeft - dt);
      if (this.toastLeft <= 0 && this.surface === "harbor") {
        this.statusFlash = undefined;
        this.showHarbor();
      }
    }
    if (this.sellCallout?.isValid && this.sellPunchLeft > 0) {
      this.sellPunchElapsed += dt;
      this.sellPunchLeft = Math.max(0, this.sellPunchLeft - dt);
      const peak = 1.18;
      const t = Math.min(1, this.sellPunchElapsed / 0.22);
      const env = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
      const scale = 1 + (peak - 1) * Math.max(0, env);
      this.sellCallout.node.setScale(scale, scale, 1);
    }
    if (this.discoveryLabel?.isValid && this.discoveryPunchLeft > 0) {
      this.discoveryPunchElapsed += dt;
      this.discoveryPunchLeft = Math.max(0, this.discoveryPunchLeft - dt);
      const peak = 1.14;
      const t = Math.min(1, this.discoveryPunchElapsed / 0.2);
      const env = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
      const scale = 1 + (peak - 1) * Math.max(0, env);
      this.discoveryLabel.node.setScale(scale, scale, 1);
    }
    if (!this.settleGuide?.isValid || this.surface !== "settle") return;
    const ring = tutorialGuideRing(Date.now());
    drawGuideHole(
      this.settleGuide,
      this.settleGuideAt.x,
      this.settleGuideAt.y,
      92 + ring.pulse * 0.25,
      ring,
    );
  }
}
