/**
 * Cocos 出海钓鱼。规则在 FishingTrip，第一人称画面在 FishingWorld。
 * 从 RuntimeHome 的「出海钓鱼」进来。商店行是「文字在左、按钮在右」，避免叠在一起。
 */
import { _decorator, Color, Component, Graphics, Label, Node, UITransform } from "cc";
import { playerSave } from "../save/SaveService";
import { makeButton, makeLabel, replacePlayLayer } from "../ui/RuntimeUi";
import { applyFishingState, gameStateFromSave } from "./FishingSave";
import { FishingTrip, type TripPhase } from "./FishingTrip";
import { FishingWorld } from "./FishingWorld";
import { FISH_RGB, GUIDE_CARDS, JOE_GREETING, JOE_IDLE, MARTA_GREETING } from "./present";
import { RodRig, type RodFrame } from "./RodRig";
import { PERIODS, type PeriodId } from "./Waters";
import type { SpotId } from "./SpotQuery";
import type { ShopKey } from "./present";

const { ccclass } = _decorator;

type PanelKind = "" | "joe" | "marta" | "cooler";

@ccclass("FishingSession")
export class FishingSession extends Component {
  static onHarbor: (() => void) | null = null;

  private trip!: FishingTrip;
  private rig = new RodRig();
  private world!: FishingWorld;
  private leave: () => void = () => {};
  private coins!: Label;
  private hint!: Label;
  private detail!: Label;
  private ui!: Node;
  private pad!: Node;
  private holdLabel!: Label;
  private map!: Graphics;
  private uiKey = "";
  private pointerDown = false;
  private panel: PanelKind = "";
  private lastPhase: TripPhase = "dock";
  private castArmed = false;

  onLoad(): void {
    this.leave = FishingSession.onHarbor ?? (() => {});
    FishingSession.onHarbor = null;
    this.trip = new FishingTrip({ state: gameStateFromSave(playerSave.get()) });
    this.rig.equip(true);
    this.world = FishingWorld.ensure(this.node);
    const layer = replacePlayLayer(this.node);
    this.coins = makeLabel(layer, "", 22, 430, 320, 400);
    this.hint = makeLabel(layer, "", 22, 0, 250, 900);
    this.detail = makeLabel(layer, "", 18, 0, 214, 980);
    this.ui = new Node("FishingUi");
    this.ui.layer = layer.layer;
    this.ui.parent = layer;
    this.ui.addComponent(UITransform).setContentSize(1280, 720);
    this.map = this.makeMap(layer);
    this.pad = new Node("HoldPad");
    this.pad.layer = layer.layer;
    this.pad.parent = layer;
    this.pad.setPosition(0, -300);
    this.pad.addComponent(UITransform).setContentSize(520, 72);
    const padGfx = this.pad.addComponent(Graphics);
    padGfx.fillColor = new Color(111, 214, 198, 230);
    padGfx.roundRect(-260, -36, 520, 72, 16);
    padGfx.fill();
    this.holdLabel = makeLabel(this.pad, "按住抛竿", 26, 0, 0, 480);
    this.holdLabel.color = new Color(8, 32, 24, 255);
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
  }

  onDestroy(): void {
    FishingWorld.drop();
  }

  update(dt: number): void {
    this.trip.setHeld(this.pointerDown);
    this.trip.tick(dt);
    this.syncRig(dt);
    this.refreshText();
    this.paintMap();
    this.syncUi(false);
    if (this.trip.consumeDirty()) {
      void playerSave.save(applyFishingState(playerSave.get(), this.trip.state));
    }
  }

  private syncRig(dt: number): void {
    const view = this.trip.view;
    this.rig.setGear(view.castM, view.reelSpeed);
    const frame: RodFrame = {
      camX: view.eyeX,
      camY: view.eyeY,
      camZ: view.eyeZ,
      yaw: 0,
      waterY: 0,
      fight: view.phase === "fighting" ? { distance: view.distance, tension: view.tension, surge: view.surge } : null,
      dip: view.dip,
    };
    if (view.phase === "charging" && this.rig.state === "idle") {
      this.rig.startWindup();
      this.castArmed = true;
    }
    if (this.lastPhase === "charging" && view.phase === "waiting" && this.castArmed) {
      this.rig.release(view.bobX, view.bobZ);
      this.castArmed = false;
    }
    if (view.phase === "fighting" && this.lastPhase !== "fighting" && this.rig.state !== "fighting") this.rig.hook();
    if (view.phase === "card" && this.lastPhase !== "card") this.rig.land();
    if (view.phase === "miss" && this.lastPhase !== "miss") this.rig.retrieve();
    if (view.phase === "ready" && this.rig.state !== "idle" && this.rig.state !== "windup") this.rig.equip(true);
    this.rig.update(dt, frame);
    this.lastPhase = view.phase;
    const rgb = view.species ? FISH_RGB[view.species] : undefined;
    this.world.tick(dt, {
      eyeX: view.eyeX,
      eyeY: view.eyeY,
      eyeZ: view.eyeZ,
      spot: view.spot,
      phase: view.phase,
      fishRgb: rgb ? [rgb[0], rgb[1], rgb[2]] : null,
    }, this.rig);
  }

  private refreshText(): void {
    const view = this.trip.view;
    this.coins.string = `${Math.floor(view.coins)} 金   冷藏箱 ${view.holdKg.toFixed(1)}/${view.holdCap} kg`;
    this.hint.string = view.notice || view.hint;
    this.detail.string = this.detailLine(view.phase);
    const holding = !view.guideOpen && (
      view.phase === "ready"
      || view.phase === "charging"
      || view.phase === "waiting"
      || view.phase === "nibbling"
      || view.phase === "hook"
      || view.phase === "fighting"
    );
    this.pad.active = holding && this.panel === "";
    if (!holding) this.pointerDown = false;
    else this.holdLabel.string = holdCaption(view.phase, view.surge, view.fightCall);
  }

  private detailLine(phase: TripPhase): string {
    const view = this.trip.view;
    if (view.guideOpen) return "";
    if (phase === "card") {
      const flag = view.isRecord ? "新纪录" : view.isNew ? "新鱼种" : view.rarity;
      return `${view.speciesName}  ${flag}  ${view.cm} cm  ${view.kg.toFixed(2)} kg  ${view.value} 金`;
    }
    if (phase === "fighting" || phase === "hook") {
      return `${view.speciesName || "鱼"}  ${view.fightCall}  拉力 ${view.tension.toFixed(2)}  绿区 ${view.bandLo.toFixed(2)}–${view.bandHi.toFixed(2)}  ${view.distance.toFixed(1)} m`;
    }
    if (phase === "charging") return `蓄力 ${Math.round(view.power * 100)}%`;
    return `${view.spotName} · ${view.periodName}${view.spot === "boat" ? " · " + view.waypointName : ""}  油 ${view.fuelL.toFixed(0)}/${view.fuelCap} 升`;
  }

  private syncUi(force: boolean): void {
    const view = this.trip.view;
    const key = `${this.trip.uiKey()}|${this.panel}`;
    if (!force && key === this.uiKey) return;
    this.uiKey = key;
    for (const child of [...this.ui.children]) child.destroy();
    if (view.guideOpen) {
      this.guideCard();
      return;
    }
    if (this.panel === "marta") {
      this.shopPanel();
      return;
    }
    if (this.panel === "joe") {
      this.joePanel();
      return;
    }
    if (this.panel === "cooler") {
      this.coolerPanel();
      return;
    }
    if (view.phase === "dock" || view.phase === "ready" || view.phase === "miss") this.dockBar();
    if (view.phase === "card") this.catchCard();
    if (view.phase === "fighting" || view.phase === "hook") this.tensionBar();
    if (view.phase !== "dock") {
      makeButton(this.ui, "回港", 540, 300, () => this.leave(), 140, 48, 20);
    }
  }

  private guideCard(): void {
    const card = GUIDE_CARDS[this.trip.view.guideStep] ?? GUIDE_CARDS[0];
    makeLabel(this.ui, card.eyebrow, 16, 0, 120, 640);
    makeLabel(this.ui, card.title, 32, 0, 70, 720);
    makeLabel(this.ui, card.body, 20, 0, -10, 760);
    makeButton(this.ui, "跳过", -140, -140, () => this.trip.skipGuide(), 200, 64, 24);
    makeButton(
      this.ui,
      this.trip.view.guideStep === 2 ? "开始钓鱼" : "下一步",
      160,
      -140,
      () => this.trip.nextGuide(),
      240,
      64,
      24,
      "primary",
    );
  }

  private dockBar(): void {
    const spots: [SpotId, string][] = [["pier", "码头"], ["beach", "沙滩"], ["boat", "船"]];
    spots.forEach(([id, label], index) => {
      const on = this.trip.view.spot === id;
      makeButton(this.ui, on ? `● ${label}` : label, -520 + index * 130, 300, () => this.trip.setSpot(id), 120, 48, 20, on ? "primary" : "secondary");
    });
    (["dawn", "day", "dusk", "night"] as PeriodId[]).forEach((id, index) => {
      const on = this.trip.view.periodId === id;
      makeButton(this.ui, on ? `● ${PERIODS[id].name}` : PERIODS[id].name, -80 + index * 120, 300, () => this.trip.setPeriod(id), 110, 48, 18, on ? "primary" : "secondary");
    });
    makeButton(this.ui, "乔的鱼摊", -360, 230, () => { this.panel = "joe"; this.syncUi(true); }, 200, 48, 20);
    makeButton(this.ui, "玛塔的渔具", -140, 230, () => { this.panel = "marta"; this.syncUi(true); }, 220, 48, 20);
    makeButton(this.ui, "鱼舱", 80, 230, () => { this.panel = "cooler"; this.syncUi(true); }, 140, 48, 20);
    makeButton(this.ui, "拿出鱼竿", 280, 230, () => this.trip.toReady(), 180, 48, 20, "primary");
    if (this.trip.view.phase === "dock") {
      makeButton(this.ui, "回港", 500, 230, () => this.leave(), 140, 48, 20);
    }
  }

  private shopPanel(): void {
    makeLabel(this.ui, "玛塔 · 渔具", 28, 0, 280, 640);
    makeLabel(this.ui, MARTA_GREETING, 18, 0, 236, 760);
    const rows = this.trip.shopRows();
    rows.forEach((row, index) => {
      const y = 180 - index * 52;
      const next = row.nextLabel ? `下一级 ${row.nextLabel}` : "已经是最好的";
      makeLabel(this.ui, `${row.name}  ${row.currentLabel}`, 18, -180, y + 10, 460);
      makeLabel(this.ui, next, 14, -180, y - 12, 460);
      if (row.nextCost !== null) {
        makeButton(
          this.ui,
          `${row.nextCost} 金`,
          280,
          y,
          () => this.trip.buy(row.key as ShopKey),
          150,
          44,
          18,
          row.affordable ? "primary" : "secondary",
        );
      }
    });
    const missing = this.trip.view.fuelCap - this.trip.view.fuelL;
    makeLabel(this.ui, `柴油 ${this.trip.view.fuelL.toFixed(0)}/${this.trip.view.fuelCap} 升`, 16, -180, -250, 460);
    if (missing > 0.5) {
      makeButton(this.ui, "加满", 280, -250, () => this.trip.refuel(), 150, 44, 18);
    }
    makeButton(this.ui, "离开", 0, -310, () => { this.panel = ""; this.syncUi(true); }, 180, 52, 22);
  }

  private joePanel(): void {
    const rows = this.trip.holdRows();
    makeLabel(this.ui, "乔 · 鱼摊", 28, 0, 280, 640);
    makeLabel(this.ui, rows.length ? JOE_GREETING : JOE_IDLE, 18, 0, 236, 760);
    rows.slice(0, 6).forEach((row, index) => {
      const y = 170 - index * 58;
      makeLabel(this.ui, `${row.name}  ${row.cm} cm  ${row.kg.toFixed(2)} kg`, 18, -160, y, 480);
      makeButton(this.ui, `卖掉 ${row.value}`, 280, y, () => this.trip.sellOne(row.id), 170, 44, 18, "primary");
    });
    makeButton(this.ui, "离开", -160, -280, () => { this.panel = ""; this.syncUi(true); }, 180, 52, 22);
    makeButton(this.ui, `全部卖掉 ${this.trip.view.holdValue}`, 160, -280, () => this.trip.sellAll(), 260, 52, 20, "primary");
  }

  private coolerPanel(): void {
    makeLabel(this.ui, "冷藏箱", 28, 0, 240, 480);
    const rows = this.trip.holdRows();
    if (!rows.length) makeLabel(this.ui, "还没有。从沙滩、码头或船上抛。", 18, 0, 160, 640);
    rows.slice(0, 6).forEach((row, index) => {
      makeLabel(this.ui, `${row.name}  ${row.cm} cm  ${row.kg.toFixed(2)} kg  ${row.value} 金`, 18, 0, 160 - index * 40, 700);
    });
    makeButton(this.ui, "离开", -140, -240, () => { this.panel = ""; this.syncUi(true); }, 180, 52, 22);
    makeButton(this.ui, "拿出鱼竿", 140, -240, () => { this.panel = ""; this.trip.toReady(); }, 200, 52, 22, "primary");
  }

  private catchCard(): void {
    const view = this.trip.view;
    const flag = view.isRecord ? "新纪录" : view.isNew ? "新鱼种" : "渔获";
    makeLabel(this.ui, flag, 18, 0, 200, 400);
    makeLabel(this.ui, view.speciesName, 48, 0, 130, 800);
    makeLabel(this.ui, `${view.cm} cm    ${view.kg.toFixed(2)} kg    ${view.value} 金`, 24, 0, 60, 700);
    makeLabel(this.ui, view.kept ? "已进冷藏箱。按住继续。" : "冷藏箱没有空了，这条放了。", 18, 0, 10, 700);
    makeButton(this.ui, "再抛一竿", -150, -200, () => this.trip.toReady(), 240, 64, 24, "primary");
    makeButton(this.ui, "回码头", 150, -200, () => this.trip.toDock(), 200, 64, 24);
  }

  private tensionBar(): void {
    const view = this.trip.view;
    const node = new Node("Tension");
    node.layer = this.ui.layer;
    node.parent = this.ui;
    node.setPosition(0, -180);
    const g = node.addComponent(Graphics);
    const w = 360;
    const h = 16;
    g.fillColor = new Color(12, 18, 24, 220);
    g.roundRect(-w / 2, -h / 2, w, h, 8);
    g.fill();
    const lo = -w / 2 + (view.bandLo / 1.05) * w;
    const hi = -w / 2 + (view.bandHi / 1.05) * w;
    g.fillColor = new Color(111, 214, 198, 140);
    g.rect(lo, -h / 2, Math.max(4, hi - lo), h);
    g.fill();
    const x = -w / 2 + (Math.min(view.tension, 1.05) / 1.05) * w;
    g.fillColor = new Color(255, 255, 255, 255);
    g.rect(x - 2, -h, 4, h * 2);
    g.fill();
    makeLabel(node, `${view.fightCall}   ${view.distance.toFixed(1)} m`, 16, 0, 28, 360);
  }

  private makeMap(layer: Node): Graphics {
    const node = new Node("Minimap");
    node.layer = layer.layer;
    node.parent = layer;
    node.setPosition(540, -40);
    node.addComponent(UITransform).setContentSize(120, 120);
    return node.addComponent(Graphics);
  }

  private paintMap(): void {
    const g = this.map;
    g.clear();
    g.fillColor = new Color(8, 28, 48, 210);
    g.circle(0, 0, 52);
    g.fill();
    g.strokeColor = new Color(255, 255, 255, 90);
    g.lineWidth = 2;
    g.circle(0, 0, 52);
    g.stroke();
    g.fillColor = new Color(255, 255, 255, 255);
    g.circle(0, -8, 4);
    g.fill();
    g.fillColor = new Color(240, 196, 106, 255);
    g.circle(-16, -22, 4);
    g.fill();
    g.fillColor = new Color(111, 214, 198, 255);
    g.circle(18, 6, 4);
    g.fill();
  }
}

function holdCaption(phase: TripPhase, surge: number, call: string): string {
  if (phase === "charging") return "松手抛出";
  if (phase === "waiting") return "等咬钩";
  if (phase === "nibbling") return "先别提竿";
  if (phase === "hook") return "提竿";
  if (phase === "fighting") return surge > 0.55 ? "松开，鱼在冲" : call || "按住收线";
  return "按住抛竿";
}
