import { _decorator, Component, Label } from "cc";
import { fishIdsForIsland } from "./content/IslandFishPool";
import { ConfigService } from "./data/ConfigService";
import type { PlayerSave, RemoteConfig, RunSummary } from "./data/types";
import {
  applyRunRewards,
  bookLines,
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
import { WechatAdapter } from "./platform/WechatAdapter";
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
  harborSailCaption,
  harborUnlocksForSave,
  resolveHarborIsland,
} from "./domain/TutorialFlow";
import { RuntimePrototype } from "./RuntimePrototype";

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
  private surface:
    | "harbor"
    | "settings"
    | "privacy"
    | "wipe"
    | "book"
    | "board"
    | "settle"
    | "sea" = "harbor";

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

  showHarbor(): void {
    this.surface = "harbor";
    const proto = this.node.getComponent(RuntimePrototype);
    if (proto) proto.destroy();
    const layer = replacePlayLayer(this.node);
    drawOcean(layer, { harbor: true });

    const save = playerSave.get();
    this.selectedIslandId = resolveHarborIsland(
      save.tutorialComplete,
      this.selectedIslandId,
    );
    makeLabel(layer, "暴走鱼市 · 潮汐港口 v28", 34, 0, 310);
    this.coinsLabel = makeLabel(layer, `金币 ${save.coins}`, 24, 470, 310, 280);
    makeButton(layer, "设置", -530, 310, () => this.showSettings(), 140, 52, 22);
    makeLabel(layer, cloudStatusLine(this.cloudKind), 18, 0, 278, 900);
    makeLabel(layer, healthAdviceLines()[1] ?? healthAdviceLines()[0], 16, 0, 262, 1100);
    const unlocks = harborUnlocksForSave(save);
    this.status = makeLabel(
      layer,
      this.statusFlash ??
        (this.lastSummary
          ? `${settleHeadline(this.lastSummary)}。${settleSlogan(this.lastSummary)}`
          : save.tutorialComplete
            ? harborNotice(ConfigService.remoteConfig().notice)
            : "先完成练潮码头教学，再自由出航。"),
      20,
      0,
      248,
    );

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

    makeButton(
      layer,
      harborSailCaption(save.tutorialComplete),
      -80,
      -230,
      () => this.sail(),
      220,
      88,
      28,
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
      200,
      72,
      20,
    );
    makeButton(
      layer,
      harborFeatureButtonLabel("book", save),
      220,
      -230,
      () => {
        if (!unlocks.book) {
          this.setStatus(harborFeatureLockedHint("book", save));
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
      0,
      -230,
      () => void this.confirmSettle(summary),
      280,
      88,
      28,
    );
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
    bookLines(ConfigService.allFish(), save.discoveredFish).forEach(
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
    this.selectedIslandId = resolveHarborIsland(
      playerSave.get().tutorialComplete,
      DEFAULT_SAIL_ISLAND_ID,
    );
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
      const next = applyRunRewards(playerSave.get(), run);
      await playerSave.save(next);
      this.cloudKind = playerSave.cloudKind();
      if (run.fish.length > 0) SfxPlayer.play("sell");
      void LeaderboardService.submit(run).catch(() => undefined);
      this.lastSummary = run;
      this.pendingSummary = undefined;
      this.statusFlash = undefined;
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
