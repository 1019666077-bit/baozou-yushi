/**
 * 中文展示。鱼种数值在 FishTable，装备英文标签在 Gear，这里只做称呼。
 */
import { FISH } from "./FishTable";
import { UPGRADES } from "./Gear";

const LABEL_ZH: { [label: string]: string } = {
  "8 lb mono": "8磅尼龙线",
  "15 lb mono": "15磅尼龙线",
  "30 lb braid": "30磅编织线",
  "60 lb braid": "60磅编织线",
  "Old spinning reel": "旧纺车轮",
  "Smooth spinning reel": "顺滑纺车轮",
  "Conventional reel": "鼓式卷线器",
  "Hand-me-down rod": "旧鱼竿",
  "7 ft graphite rod": "7尺碳素竿",
  "9 ft surf rod": "9尺远投竿",
  Cooler: "冷藏箱",
  "Ice chest": "冰柜",
  "Insulated fish hold": "保温鱼舱",
  "40 L tank": "40升油箱",
  "80 L tank": "80升油箱",
  "150 L tank": "150升油箱",
  "Tired diesel": "旧柴油机",
  "Rebuilt diesel": "翻新柴油机",
  "Turbo diesel": "涡轮柴油机",
  None: "没有",
  "Fish finder (depth and fish on the HUD)": "探鱼器（水深和鱼讯）",
  "Nav lights only": "只有航行灯",
  "Deck floodlights for night fishing": "甲板灯，方便夜钓",
};

export const SHOP_KEYS = ["line", "reel", "rod", "hold", "fuel", "engine", "fishFinder", "lights"] as const;
export type ShopKey = (typeof SHOP_KEYS)[number];

const SHOP_NAME: { [key: string]: string } = {
  line: "鱼线",
  reel: "卷线器",
  rod: "鱼竿",
  hold: "鱼舱",
  fuel: "油箱",
  engine: "引擎",
  fishFinder: "探鱼器",
  lights: "船灯",
};

export function displayName(id: string): string {
  return FISH[id]?.nameZh ?? id;
}

/** rarity 在源表里是咬钩权重。这里只把它翻成卡片上的三档称呼。 */
export function rarityLabel(id: string): string {
  const rarity = FISH[id]?.rarity ?? 1;
  if (rarity >= 0.7) return "常见";
  if (rarity >= 0.45) return "少见";
  return "稀有";
}

export function shopName(key: string): string {
  return SHOP_NAME[key] ?? UPGRADES[key]?.name ?? key;
}

export function levelLabel(key: string, index: number): string {
  const label = UPGRADES[key]?.levels[index]?.label ?? "";
  return LABEL_ZH[label] ?? label;
}

export interface FishLook {
  rgb: readonly [number, number, number];
  accent: readonly [number, number, number];
  /** 体高 / 体长 */
  body: number;
  /** 吻占体长的比例 */
  snout: number;
  /** 尾叉，0 是齐尾，1 是深叉 */
  fork: number;
}

export const FISH_LOOK: { [id: string]: FishLook } = {
  silverside: { rgb: [186, 198, 176], accent: [214, 214, 196], body: 0.12, snout: 0.08, fork: 0.35 },
  mullet: { rgb: [217, 221, 226], accent: [120, 132, 140], body: 0.2, snout: 0.06, fork: 0.25 },
  needlefish: { rgb: [150, 176, 154], accent: [90, 120, 96], body: 0.08, snout: 0.28, fork: 0.7 },
  sergeant: { rgb: [242, 193, 78], accent: [40, 40, 36], body: 0.42, snout: 0.06, fork: 0.2 },
  grunt: { rgb: [214, 176, 72], accent: [48, 92, 150], body: 0.32, snout: 0.08, fork: 0.15 },
  yellowtail: { rgb: [255, 210, 74], accent: [226, 84, 70], body: 0.28, snout: 0.1, fork: 0.55 },
  chromis: { rgb: [48, 110, 186], accent: [20, 40, 80], body: 0.38, snout: 0.05, fork: 0.45 },
  tang: { rgb: [36, 92, 186], accent: [250, 220, 60], body: 0.48, snout: 0.08, fork: 0.1 },
  wrasse: { rgb: [196, 92, 70], accent: [240, 200, 80], body: 0.34, snout: 0.14, fork: 0.2 },
  parrot: { rgb: [64, 150, 96], accent: [220, 90, 70], body: 0.36, snout: 0.12, fork: 0.15 },
  angel: { rgb: [240, 196, 48], accent: [40, 70, 160], body: 0.7, snout: 0.06, fork: 0.05 },
  jack: { rgb: [197, 208, 214], accent: [232, 196, 64], body: 0.32, snout: 0.1, fork: 0.65 },
  barracuda: { rgb: [127, 140, 134], accent: [70, 78, 74], body: 0.14, snout: 0.22, fork: 0.4 },
  grouper: { rgb: [168, 122, 78], accent: [90, 60, 40], body: 0.4, snout: 0.1, fork: 0.05 },
  redSnapper: { rgb: [226, 91, 69], accent: [255, 220, 200], body: 0.3, snout: 0.1, fork: 0.35 },
  tuna: { rgb: [44, 76, 110], accent: [196, 168, 120], body: 0.26, snout: 0.08, fork: 0.8 },
  mahi: { rgb: [64, 168, 120], accent: [240, 220, 60], body: 0.28, snout: 0.16, fork: 0.75 },
  tarpon: { rgb: [159, 215, 200], accent: [220, 230, 226], body: 0.24, snout: 0.12, fork: 0.3 },
};

export const FISH_RGB: { [id: string]: [number, number, number] } = {
  silverside: [186, 198, 176],
  mullet: [217, 221, 226],
  needlefish: [150, 176, 154],
  sergeant: [242, 193, 78],
  grunt: [214, 176, 72],
  yellowtail: [255, 210, 74],
  chromis: [48, 110, 186],
  tang: [36, 92, 186],
  wrasse: [196, 92, 70],
  parrot: [64, 150, 96],
  angel: [240, 196, 48],
  jack: [197, 208, 214],
  barracuda: [127, 140, 134],
  grouper: [168, 122, 78],
  redSnapper: [226, 91, 69],
  tuna: [44, 76, 110],
  mahi: [64, 168, 120],
  tarpon: [159, 215, 200],
};

export const GUIDE_CARDS: { eyebrow: string; title: string; body: string; rows?: { key: string; text: string }[] }[] = [
  {
    eyebrow: "潮间带",
    title: "在岛边钓鱼，再把渔获卖掉",
    body: "沙滩、码头、船都能钓。浅滩、码头、礁石、海湾和深水的鱼不一样，也会跟着时段变。渔获卖给码头边的乔，钱拿去船屋玛塔那里买线、轮、鱼舱和夜钓的灯。",
  },
  {
    eyebrow: "钓鱼",
    title: "抛、提、收",
    body: "点「换钓点」到水边。按住下方按钮蓄力，松手抛，按越久越远。浮标被拉下去再点提竿，点头只是试饵。按住收线，变红就松手。点「收回」收空线。点「鱼舱」看冷藏箱。",
    rows: [
      { key: "换钓点", text: "到沙滩、码头或船上" },
      { key: "按住", text: "蓄力，松手抛。按越久越远" },
      { key: "点一下", text: "浮标被拉下去再提竿。点头只是试饵" },
      { key: "按住", text: "收线。变红就松手，不然断线" },
      { key: "收回", text: "把空线收回来" },
      { key: "鱼舱", text: "看冷藏箱，也可以放生" },
    ],
  },
  {
    eyebrow: "附近的人",
    title: "乔和玛塔",
    body: "乔在码头鱼摊收鱼。玛塔在船屋卖装备和柴油。两人都标在右下地图上。",
  },
];

export const GUIDE_TIPS: { [id: string]: string } = {
  rodOut: "按住蓄力，松手抛投。试试更深的水，码头周围或者礁上。",
  nibble: "浮标在点头，有东西在试饵。等它被拉下去再提竿。",
  fishOn: "按住收线。针靠近红区就松手，等它回来再收。",
  caught: "进了冷藏箱。卖给码头边的乔，他在地图上。",
  full: "冷藏箱满了。卖给乔，或者找玛塔买大一点的鱼舱。",
  boat: "这是你的船。站在甲板上就能钓。换航点会用一点油，柴油在玛塔那里。",
  joe: "乔收鱼。点「交谈」看他出多少。",
  marta: "玛塔卖装备和柴油。点「交谈」看货。",
};

export const JOE_GREETING = "看看你钓到什么。明码标价，给现金。";
export const JOE_IDLE = "没有可卖的？码头边上石鲈在咬。";
export const MARTA_GREETING = "鱼线、卷线器、大一点的鱼舱，还有柴油。你要什么？";
