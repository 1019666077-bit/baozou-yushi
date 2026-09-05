import type {
  FishConfig,
  IslandConfig,
  RemoteConfig,
  ToolConfig,
} from "./types";

export const bundledFish = [
  {
    "id": "fish_bayfin",
    "name": "湾鳍鱼",
    "tier": "normal",
    "islandId": "island_foam_bay",
    "toughness": 24,
    "speed": 70,
    "basePrice": 8,
    "rarityMultiplier": 1,
    "weakPointMultiplier": 1.8,
    "behavior": "cruise",
    "escapeSeconds": 14
  },
  {
    "id": "fish_shellback",
    "name": "贝甲鱼",
    "tier": "normal",
    "islandId": "island_foam_bay",
    "toughness": 40,
    "speed": 52,
    "basePrice": 14,
    "rarityMultiplier": 1.05,
    "weakPointMultiplier": 2.1,
    "behavior": "shield",
    "escapeSeconds": 16
  },
  {
    "id": "fish_silver_ribbon",
    "name": "银绸鱼",
    "tier": "normal",
    "islandId": "island_prism_reef",
    "toughness": 46,
    "speed": 105,
    "basePrice": 20,
    "rarityMultiplier": 1.1,
    "weakPointMultiplier": 1.75,
    "behavior": "dash",
    "escapeSeconds": 12
  },
  {
    "id": "fish_lantern_pod",
    "name": "灯豆鱼",
    "tier": "normal",
    "islandId": "island_prism_reef",
    "toughness": 58,
    "speed": 82,
    "basePrice": 27,
    "rarityMultiplier": 1.15,
    "weakPointMultiplier": 1.9,
    "behavior": "split",
    "escapeSeconds": 15
  },
  {
    "id": "fish_ember_eel",
    "name": "暖流鳗",
    "tier": "normal",
    "islandId": "island_storm_eye",
    "toughness": 72,
    "speed": 118,
    "basePrice": 36,
    "rarityMultiplier": 1.2,
    "weakPointMultiplier": 1.7,
    "behavior": "dash",
    "escapeSeconds": 11
  },
  {
    "id": "fish_reef_hopper",
    "name": "跃礁鱼",
    "tier": "normal",
    "islandId": "island_storm_eye",
    "toughness": 85,
    "speed": 92,
    "basePrice": 43,
    "rarityMultiplier": 1.25,
    "weakPointMultiplier": 1.85,
    "behavior": "cruise",
    "escapeSeconds": 13
  },
  {
    "id": "elite_prism_sail",
    "name": "棱帆鱼",
    "tier": "elite",
    "islandId": "island_foam_bay",
    "toughness": 105,
    "speed": 110,
    "basePrice": 65,
    "rarityMultiplier": 1.4,
    "weakPointMultiplier": 2,
    "behavior": "dash",
    "escapeSeconds": 18
  },
  {
    "id": "elite_iron_jaw",
    "name": "铁颌团鱼",
    "tier": "elite",
    "islandId": "island_prism_reef",
    "toughness": 165,
    "speed": 76,
    "basePrice": 100,
    "rarityMultiplier": 1.5,
    "weakPointMultiplier": 2.25,
    "behavior": "shield",
    "escapeSeconds": 20
  },
  {
    "id": "elite_tempest_ray",
    "name": "旋潮鳐",
    "tier": "elite",
    "islandId": "island_storm_eye",
    "toughness": 220,
    "speed": 135,
    "basePrice": 145,
    "rarityMultiplier": 1.6,
    "weakPointMultiplier": 1.9,
    "behavior": "split",
    "escapeSeconds": 22
  },
  {
    "id": "boss_tide_singer",
    "name": "潮鸣巨鲲",
    "tier": "boss",
    "islandId": "island_storm_eye",
    "toughness": 420,
    "speed": 65,
    "basePrice": 480,
    "rarityMultiplier": 2,
    "weakPointMultiplier": 1.6,
    "behavior": "boss",
    "escapeSeconds": 120
  }
] as FishConfig[];

export const bundledTools = [
  {
    "id": "tool_rod",
    "name": "弹力鱼竿",
    "kind": "rod",
    "unlockIsland": "island_tutorial",
    "levels": [
      { "level": 1, "power": 12, "cooldownMs": 850, "lineStrength": 30, "upgradeCost": 0 },
      { "level": 2, "power": 16, "cooldownMs": 760, "lineStrength": 48, "upgradeCost": 90 },
      { "level": 3, "power": 21, "cooldownMs": 680, "lineStrength": 70, "upgradeCost": 220 }
    ]
  },
  {
    "id": "tool_cannon",
    "name": "泡泡连发炮",
    "kind": "cannon",
    "unlockIsland": "island_foam_bay",
    "levels": [
      { "level": 1, "power": 10, "cooldownMs": 260, "upgradeCost": 120 },
      { "level": 2, "power": 13, "cooldownMs": 220, "upgradeCost": 240 },
      { "level": 3, "power": 17, "cooldownMs": 185, "upgradeCost": 420 }
    ]
  },
  {
    "id": "tool_harpoon",
    "name": "磁力蓄能叉",
    "kind": "harpoon",
    "unlockIsland": "island_prism_reef",
    "levels": [
      { "level": 1, "power": 28, "cooldownMs": 1250, "upgradeCost": 260 },
      { "level": 2, "power": 38, "cooldownMs": 1100, "upgradeCost": 460 },
      { "level": 3, "power": 52, "cooldownMs": 950, "upgradeCost": 760 }
    ]
  }
] as ToolConfig[];

export const bundledIslands = [
  {
    "id": "island_tutorial",
    "name": "练潮码头",
    "unlockCost": 0,
    "targetSessionSeconds": 60,
    "waves": [
      {
        "durationSeconds": 60,
        "fishPool": ["fish_bayfin"],
        "maxAlive": 1,
        "spawnIntervalSeconds": 8
      }
    ]
  },
  {
    "id": "island_foam_bay",
    "name": "泡沫湾",
    "unlockCost": 0,
    "targetSessionSeconds": 180,
    "waves": [
      {
        "durationSeconds": 55,
        "fishPool": ["fish_bayfin", "fish_shellback"],
        "maxAlive": 5,
        "spawnIntervalSeconds": 3.4
      },
      {
        "durationSeconds": 45,
        "fishPool": ["fish_bayfin", "fish_shellback", "elite_prism_sail"],
        "maxAlive": 6,
        "spawnIntervalSeconds": 3
      }
    ]
  },
  {
    "id": "island_prism_reef",
    "name": "棱光礁",
    "unlockCost": 240,
    "targetSessionSeconds": 220,
    "waves": [
      {
        "durationSeconds": 65,
        "fishPool": ["fish_silver_ribbon", "fish_lantern_pod"],
        "maxAlive": 7,
        "spawnIntervalSeconds": 2.9
      },
      {
        "durationSeconds": 55,
        "fishPool": ["fish_silver_ribbon", "fish_lantern_pod", "elite_iron_jaw"],
        "maxAlive": 7,
        "spawnIntervalSeconds": 2.7
      }
    ]
  },
  {
    "id": "island_storm_eye",
    "name": "风眼环礁",
    "unlockCost": 680,
    "targetSessionSeconds": 300,
    "waves": [
      {
        "durationSeconds": 75,
        "fishPool": ["fish_ember_eel", "fish_reef_hopper"],
        "maxAlive": 8,
        "spawnIntervalSeconds": 2.6
      },
      {
        "durationSeconds": 55,
        "fishPool": ["fish_ember_eel", "fish_reef_hopper", "elite_tempest_ray"],
        "maxAlive": 8,
        "spawnIntervalSeconds": 2.4
      }
    ],
    "bossId": "boss_tide_singer",
    "bossPhases": [
      { "threshold": 1, "behavior": "声浪直线扫射", "speedMultiplier": 1, "patternIntervalSeconds": 4.5 },
      { "threshold": 0.66, "behavior": "召唤双旋涡并暴露鳍部弱点", "speedMultiplier": 1.15, "patternIntervalSeconds": 4 },
      { "threshold": 0.33, "behavior": "环场冲刺后进入长眩晕", "speedMultiplier": 1.35, "patternIntervalSeconds": 3.4 }
    ]
  }
] as IslandConfig[];

export const bundledRemote = {
  "version": 1,
  "minClientVersion": "0.1.0",
  "stylePointScale": 1,
  "economyScale": 1,
  "disabledIslands": [],
  "notice": "打得越漂亮，鱼越值钱。"
} as RemoteConfig;
