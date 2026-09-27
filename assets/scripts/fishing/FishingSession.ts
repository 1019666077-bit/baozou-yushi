/**
 * Cocos 出海钓鱼灰盒。只画程序色块，规则全部在 FishingTrip。
 * 从 RuntimeHome 的「出海钓鱼」进来，不改港口舞台的网格。
 */
import { _decorator, Color, Component, Graphics, Label, Node, UITransform } from "cc";
import { playerSave } from "../save/SaveService";
import { makeButton, makeLabel, replacePlayLayer } from "../ui/RuntimeUi";
import { applyFishingState, gameStateFromSave } from "./FishingSave";
import { FishingTrip, type TripPhase } from "./FishingTrip";
import { FISH_RGB } from "./present";
import { PERIOD_IDS, PERIODS, WATER_IDS, WATERS, type PeriodId, type WaterId } from "./Waters";

const { ccclass } = _decorator;

@ccclass("FishingSession")
export class FishingSession extends Component {
  static onHarbor: (() => void) | null = null;

  private trip!: FishingTrip;
  private leave: () => void = () => {};
  private world!: Graphics;
  private coins!: Label;
  private hint!: Label;
  private detail!: Label;
  private ui!: Node;
  private pad!: Node;
  private holdLabel!: Label;
  private uiKey = "";
  private pointerDown = false;

  onLoad(): void {
    this.leave = FishingSession.onHarbor ?? (() => {});
    FishingSession.onHarbor = null;
    this.trip = new FishingTrip({ state: gameStateFromSave(playerSave.get()) });
    const layer = replacePlayLayer(this.node);
    const worldNode = new Node("FishingWorld");
    worldNode.layer = layer.layer;
    worldNode.parent = layer;
    worldNode.addComponent(UITransform).setContentSize(1280, 720);
    this.world = worldNode.addComponent(Graphics);
    makeLabel(layer, "出海钓鱼", 32, -420, 320, 360);
    this.coins = makeLabel(layer, "", 22, 460, 320, 320);
    this.hint = makeLabel(layer, "", 22, 0, 274, 980);
    this.detail = makeLabel(layer, "", 18, 0, 236, 1100);
    this.ui = new Node("FishingUi");
    this.ui.layer = layer.layer;
    this.ui.parent = layer;
    this.ui.addComponent(UITransform).setContentSize(1280, 720);
    this.pad = new Node("HoldPad");
    this.pad.layer = layer.layer;
    this.pad.parent = layer;
    this.pad.setPosition(0, -250);
    this.pad.addComponent(UITransform).setContentSize(460, 100);
    const padGfx = this.pad.addComponent(Graphics);
    padGfx.fillColor = new Color(255, 138, 32, 255);
    padGfx.roundRect(-230, -50, 460, 100, 16);
    padGfx.fill();
    this.holdLabel = makeLabel(this.pad, "按住抛竿", 32, 0, 0, 440);
    this.pad.on(Node.EventType.TOUCH_START, () => {
      this.pointerDown = true;
    });
    this.pad.on(Node.EventType.TOUCH_END, () => {
      this.pointerDown = false;
    });
    this.pad.on(Node.EventType.TOUCH_CANCEL, () => {
      this.pointerDown = false;
    });
    this.syncUi(true);
    this.paint();
  }

  update(dt: number): void {
    this.trip.setHeld(this.pointerDown);
    this.trip.tick(dt);
    this.paint();
    this.refreshText();
    this.syncUi(false);
    if (this.trip.consumeDirty()) {
      void playerSave.save(applyFishingState(playerSave.get(), this.trip.state));
    }
  }

  private refreshText(): void {
    const view = this.trip.view;
    this.coins.string = `金币 ${Math.floor(view.coins)}  ·  鱼舱 ${view.holdKg.toFixed(1)}/${view.holdCap}kg`;
    this.hint.string = view.hint;
    this.detail.string = this.detailLine(view.phase);
    const holding = view.phase === "ready"
      || view.phase === "charging"
      || view.phase === "waiting"
      || view.phase === "nibbling"
      || view.phase === "hook"
      || view.phase === "fighting";
    this.pad.active = holding;
    if (!holding) this.pointerDown = false;
    else this.holdLabel.string = holdCaption(view.phase, view.surge);
  }

  private detailLine(phase: TripPhase): string {
    const view = this.trip.view;
    const gear = `线 ${view.lineKg}kg · 收线 ${view.reelSpeed.toFixed(1)} · 抛投 ${view.castM}m · 绿区 ${(view.bandHi - view.bandLo).toFixed(2)}`;
    if (phase === "card") {
      const flag = view.isRecord ? "新纪录" : view.isNew ? "新鱼种" : view.rarity;
      return `${view.speciesName}  ${flag}  ${view.cm}cm  ${view.kg.toFixed(2)}kg  ${view.value}金  ${view.kept ? "已入舱" : "放生"}`;
    }
    if (phase === "fighting" || phase === "hook") {
      return `${view.speciesName || "鱼"}  拉力 ${view.tension.toFixed(2)}  绿区 ${view.bandLo.toFixed(2)}–${view.bandHi.toFixed(2)}  距离 ${view.distance.toFixed(1)}m  体力 ${Math.round(view.stamina * 100)}%  ${gear}`;
    }
    if (phase === "charging") {
      return `蓄力 ${Math.round(view.power * 100)}%  ·  ${gear}`;
    }
    if (phase === "dock") {
      const log = this.trip.logRows().map((row) => `${row.name}${row.bestKg.toFixed(1)}kg`).join("  ");
      return `${gear}${log ? `  ·  图鉴 ${log}` : "  ·  图鉴还是空的"}`;
    }
    return `${view.waterName} · ${view.periodName}  深度 ${view.depth.toFixed(1)}m  ${gear}`;
  }

  private syncUi(force: boolean): void {
    const key = this.trip.uiKey();
    if (!force && key === this.uiKey) return;
    this.uiKey = key;
    for (const child of [...this.ui.children]) child.destroy();
    const phase = this.trip.view.phase;
    if (phase === "dock" || phase === "ready") this.pickers();
    if (phase === "dock") this.dockButtons();
    if (phase === "card" || phase === "miss") {
      makeButton(this.ui, "再抛一竿", -180, -250, () => this.trip.toReady(), 280, 84, 28, "primary");
      makeButton(this.ui, "回港", 180, -250, () => this.trip.toDock(), 220, 84, 28);
    }
    if (phase !== "dock") {
      makeButton(this.ui, "回港", 520, 320, () => this.leave(), 160, 52, 22);
    }
  }

  private pickers(): void {
    WATER_IDS.forEach((id, index) => {
      const selected = this.trip.view.waterId === id;
      makeButton(
        this.ui,
        `${selected ? "● " : ""}${WATERS[id].name}`,
        -460 + index * 150,
        170,
        () => this.trip.setWater(id as WaterId),
        136,
        52,
        22,
        selected ? "primary" : "secondary",
      );
    });
    PERIOD_IDS.forEach((id, index) => {
      const selected = this.trip.view.periodId === id;
      makeButton(
        this.ui,
        `${selected ? "● " : ""}${PERIODS[id].name}`,
        -240 + index * 160,
        100,
        () => this.trip.setPeriod(id as PeriodId),
        146,
        48,
        20,
        selected ? "primary" : "secondary",
      );
    });
  }

  private dockButtons(): void {
    this.trip.shopRows().forEach((row, index) => {
      const caption = row.nextCost == null
        ? `${row.name} 满级 · ${row.currentLabel}`
        : `${row.name} ${row.currentLabel} → ${row.nextCost}金`;
      makeButton(
        this.ui,
        caption,
        index < 2 ? -220 : 220,
        index % 2 === 0 ? 10 : -70,
        () => this.trip.buy(row.key),
        400,
        58,
        20,
        row.affordable ? "primary" : "secondary",
      );
    });
    makeButton(this.ui, `卖出全部 (${this.trip.view.holdCount})`, -220, -160, () => this.trip.sellAll(), 400, 64, 24);
    makeButton(this.ui, "去钓", 220, -160, () => this.trip.toReady(), 280, 72, 28, "primary");
    makeButton(this.ui, "回港", 0, -270, () => this.leave(), 220, 64, 24);
  }

  private paint(): void {
    const g = this.world;
    const view = this.trip.view;
    g.clear();
    const sky = skyRgb(view.periodId);
    const water = waterRgb(view.waterId);
    g.fillColor = new Color(sky[0], sky[1], sky[2], 255);
    g.rect(-640, 40, 1280, 320);
    g.fill();
    g.fillColor = new Color(water[0], water[1], water[2], 255);
    g.rect(-640, -360, 1280, 400);
    g.fill();
    g.fillColor = new Color(water[0] + 18, water[1] + 16, water[2] + 8, 255);
    g.rect(-640, -40, 1280, 28);
    g.fill();
    g.fillColor = new Color(186, 122, 62, 255);
    g.rect(-520, -20, 220, 18);
    g.fill();
    g.fillColor = new Color(92, 58, 32, 255);
    g.rect(-500, -80, 16, 60);
    g.fill();
    g.rect(-340, -80, 16, 60);
    g.fill();
    g.fillColor = new Color(214, 168, 96, 255);
    g.rect(-560, -8, 70, 28);
    g.fill();
    const bobberX = -40 + Math.min(1, view.reach / 45) * 360;
    const bobberY = 18 - view.dip * 36 - (view.phase === "fighting" ? 10 + view.surge * 16 : 0);
    if (view.phase === "charging" || view.phase === "waiting" || view.phase === "nibbling" || view.phase === "hook" || view.phase === "fighting") {
      g.strokeColor = new Color(230, 230, 220, 255);
      g.lineWidth = 2;
      g.moveTo(-500, 40);
      g.lineTo(bobberX, bobberY);
      g.stroke();
      g.fillColor = new Color(240, 64, 48, 255);
      g.circle(bobberX, bobberY, view.phase === "hook" ? 16 : 11);
      g.fill();
      g.fillColor = new Color(255, 255, 255, 255);
      g.circle(bobberX, bobberY + 7, 5);
      g.fill();
    }
    if (view.phase === "charging") {
      g.fillColor = new Color(16, 28, 36, 220);
      g.rect(-180, -160, 360, 22);
      g.fill();
      g.fillColor = new Color(255, 176, 48, 255);
      g.rect(-180, -160, 360 * view.power, 22);
      g.fill();
    }
    if (view.phase === "fighting" || view.phase === "hook") this.tensionBar(g);
    if ((view.phase === "fighting" || view.phase === "card") && view.species) {
      const rgb = FISH_RGB[view.species] ?? [180, 200, 190];
      const x = view.phase === "card" ? 0 : bobberX + 30;
      const y = view.phase === "card" ? 40 : bobberY - 20;
      const len = 70 + Math.min(80, view.kg * 8);
      g.fillColor = new Color(rgb[0], rgb[1], rgb[2], 255);
      g.moveTo(x - len * 0.45, y);
      g.lineTo(x + len * 0.35, y + 16);
      g.lineTo(x + len * 0.55, y);
      g.lineTo(x + len * 0.35, y - 16);
      g.close();
      g.fill();
      g.fillColor = new Color(20, 30, 36, 255);
      g.circle(x + len * 0.28, y + 4, 3);
      g.fill();
    }
  }

  private tensionBar(g: Graphics): void {
    const view = this.trip.view;
    const x = 470;
    const y = -150;
    const h = 280;
    g.fillColor = new Color(12, 18, 24, 230);
    g.rect(x, y, 36, h);
    g.fill();
    const lo = y + view.bandLo / 1.35 * h;
    const hi = y + Math.min(1.35, view.bandHi) / 1.35 * h;
    g.fillColor = new Color(46, 168, 92, 255);
    g.rect(x + 4, lo, 28, Math.max(8, hi - lo));
    g.fill();
    const marker = y + Math.max(0, Math.min(1.35, view.tension)) / 1.35 * h;
    const hot = view.tension > 1 || view.tension < view.bandLo;
    g.fillColor = new Color(hot ? 220 : 255, hot ? 70 : 236, hot ? 50 : 120, 255);
    g.rect(x - 8, marker - 4, 52, 8);
    g.fill();
  }
}

function holdCaption(phase: TripPhase, surge: number): string {
  if (phase === "charging") return "松手抛出";
  if (phase === "waiting") return "等咬钩";
  if (phase === "nibbling") return "先别提竿";
  if (phase === "hook") return "提竿！";
  if (phase === "fighting") return surge > 0.55 ? "松开！鱼在冲" : "按住收线";
  return "按住抛竿";
}

function skyRgb(period: PeriodId): [number, number, number] {
  if (period === "dawn") return [244, 196, 138];
  if (period === "dusk") return [214, 122, 86];
  if (period === "night") return [28, 40, 64];
  return [142, 206, 228];
}

function waterRgb(water: WaterId): [number, number, number] {
  if (water === "shallows") return [126, 198, 186];
  if (water === "pier") return [58, 126, 166];
  if (water === "reef") return [32, 140, 128];
  if (water === "deep") return [18, 48, 78];
  return [36, 112, 158];
}
