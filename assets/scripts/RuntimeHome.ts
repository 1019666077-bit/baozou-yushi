import { _decorator, Color, Component, Graphics, Label, Node } from "cc";
import { fishIdsForIsland } from "./content/IslandFishPool";
import { ConfigService } from "./data/ConfigService";
import type { PlayerSave, RemoteConfig, RunSummary } from "./data/types";
import {
  applyRunRewards,
  bookLines,
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
import { sellPopup } from "./domain/StyleCallout";
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
import { WechatAdapter } from "./platform/WechatAdapter";
import { playerSave } from "./save/SaveService";
import { HarborActions } from "./ui/HarborActions";
import {
  drawOcean,
  makeButton,
  makeLabel,
  makePlate,
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
import { shouldCallCloud } from "./domain/WechatSession";
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
  resolveHarborIsland,
  tutorialGuideRing,
} from "./domain/TutorialFlow";
import { RuntimePrototype } from "./RuntimePrototype";
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
  private cloudKind: CloudKind = "syncing";
  private statusFlash?: string;
  private toastLabel?: Label;
  private toastLeft = 0;
  private surface:
    | "harbor"
    | "settings"
    | "privacy"
    | "wipe"
    | "book"
    | "board"
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
      ConfigService.ensureBundled();
      playerSave.loadLocal();
      const save = playerSave.get();
      this.selectedIslandId = resolveHarborIsland(
        save.tutorialComplete,
        DEFAULT_SAIL_ISLAND_ID,
      );
      this.selectedToolId = save.tools[0]?.toolId ?? "tool_rod";
      console.log("baozou-flop-v32");
      SfxPlayer.setEnabled(save.settings.sfx);
      this.showHarbor();
      void this.bootstrapCloud();
    } catch (error) {
      console.error("Harbor bootstrap failed", error);
    }
  }

  private async bootstrapCloud(): Promise<void> {
    this.cloudKind = "syncing";
    await WechatAdapter.ensurePrivacyAuthorized();
    await WechatAdapter.login();
    WechatAdapter.initializeCloud();
    if (shouldCallCloud(WechatAdapter.sessionKind())) {
      try {
        const response = await WechatAdapter.callCloud<{ config: RemoteConfig }>(
          "getRemoteConfig",
        );
        ConfigService.applyRemoteConfig(response.config);
      } catch {
        // Bundled remote-default keeps the harbor playable.
      }
    }
    await playerSave.load();
    this.cloudKind = playerSave.cloudKind();
    const save = playerSave.get();
    this.selectedIslandId = resolveHarborIsland(
      save.tutorialComplete,
      this.selectedIslandId,
    );
    if (this.surface === "harbor") this.showHarbor();
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
    makeLabel(layer, "暴走鱼市 · 潮汐港口 v32", 36, 0, 310);
    this.coinsLabel = tintGold(makeLabel(layer, `金币 ${save.coins}`, 26, 470, 310, 280));
    this.settleGuide = undefined;
    this.goldGfx = undefined;
    if (this.coinJumpGained > 0) {
      this.coinJumpLabel = tintGold(
        makeLabel(layer, coinJumpCaption(this.coinJumpGained), 28, 470, 274, 280),
      );
      this.sellCallout = tintGold(
        makeLabel(layer, sellPopup(this.coinJumpGained), 30, 0, 120, 520),
      );
      const juiceNode = new Node("GoldRain");
      juiceNode.layer = layer.layer;
      juiceNode.parent = layer;
      this.goldGfx = juiceNode.addComponent(Graphics);
    } else {
      this.coinJumpLabel = undefined;
      this.sellCallout = undefined;
    }
    makeButton(layer, "设置", -530, 310, () => this.showSettings(), 140, 52, 22);
    const unlocks = harborUnlocksForSave(save);
    const island = ConfigService.islandById(this.selectedIslandId);
    const tool = ConfigService.toolById(this.selectedToolId);
    const ownedTool = save.tools.find((entry) => entry.toolId === tool.id);
    const nextLevel = tool.levels.find(
      (level) => level.level === (ownedTool?.level ?? 0) + 1,
    );
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
    const showMeta = harborHudShowMeta(phase);
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
    makePlate(layer, 0, 248, !save.tutorialComplete, 820, 48);
    this.status = makeLabel(layer, goal, 20, 0, 248);
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

    makeButton(
      layer,
      harborSailCaption(save.tutorialComplete),
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
      !unlocks.upgrade
        ? harborFeatureButtonLabel("upgrade", save)
        : ownedTool && nextLevel
          ? `升级${tool.name}`
          : "查看升级",
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
      220,
      -230,
      () => {
        if (!unlocks.book) {
          this.setStatus(harborFeatureLockedHint("book", save));
          this.showHarbor();
          return;
        }
        this.showBook();
      },
      180,
      72,
      22,
    );
    makeButton(
      layer,
      harborFeatureButtonLabel("board", save),
      470,
      -230,
      () => {
        if (!unlocks.board) {
          this.setStatus(harborFeatureLockedHint("board", save));
          this.showHarbor();
          return;
        }
        this.showBoard();
      },
      160,
      72,
      22,
    );
  }

  private showSettle(summary: RunSummary): void {
    this.surface = "settle";
    this.pendingSummary = summary;
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
      0,
      -230,
      () => void this.confirmSettle(summary),
      300,
      92,
      30,
      "primary",
    );
    this.settleGuideAt = { x: 0, y: -230 };
    if (summary.fish.length > 0) {
      const guideNode = new Node("SellGuide");
      guideNode.layer = layer.layer;
      guideNode.parent = layer;
      this.settleGuide = guideNode.addComponent(Graphics);
    } else {
      this.settleGuide = undefined;
    }
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
    bookLines(ConfigService.allFish(), save.discoveredFish, this.justDiscovered).forEach(
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
    makeButton(layer, "返回港口", 0, -250, () => this.showHarbor(), 240, 72, 24);
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
      friendBoardHint(openData, WechatAdapter.signedIn),
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

  private async confirmSettle(summary?: RunSummary): Promise<void> {
    const run = summary ?? this.pendingSummary;
    if (!run || this.settling) return;
    this.settling = true;
    try {
      const before = playerSave.get();
      const next = applyRunRewards(before, run);
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
      this.gold =
        run.totalCoins > 0 ? spawnGoldRain(470, 300, false) : [];
      this.goldFlash =
        run.totalCoins > 0 ? spawnJuiceFlash("sell", 470, 300, false) : undefined;
      await playerSave.save(next);
      this.cloudKind = playerSave.cloudKind();
      if (run.fish.length > 0) SfxPlayer.play("sell");
      void LeaderboardService.submit(run).catch(() => undefined);
      this.lastSummary = run;
      this.pendingSummary = undefined;
      const toast = discoveryToastLine(
        this.justDiscovered.map((id) => ConfigService.fishById(id).name),
      );
      this.statusFlash = toast || undefined;
      this.toastLeft =
        this.coinJumpLeft > 0 || !this.statusFlash
          ? 0
          : harborToastHoldSeconds();
      this.selectedIslandId = resolveHarborIsland(
        next.tutorialComplete,
        this.selectedIslandId,
      );
      this.showHarbor();
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
    try {
      this.harbor3d = HarborStage.ensure(this.node);
    } catch {
      this.harbor3d = undefined;
      drawOcean(layer, { harbor: true });
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
