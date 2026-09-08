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
    "escapeSeconds": 90
  },
  {
    "id": "fish_mist_bell",
    "name": "雾铃鱼",
    "tier": "normal",
    "islandId": "island_mist_bells",
    "toughness": 96,
    "speed": 70,
    "basePrice": 54,
    "rarityMultiplier": 1.2,
    "weakPointMultiplier": 1.9,
    "behavior": "school",
    "escapeSeconds": 15
  },
  {
    "id": "fish_clockwork_goby",
    "name": "刻潮虾虎",
    "tier": "normal",
    "islandId": "island_mist_bells",
    "toughness": 110,
    "speed": 62,
    "basePrice": 61,
    "rarityMultiplier": 1.25,
    "weakPointMultiplier": 2,
    "behavior": "burrow",
    "escapeSeconds": 16
  },
  {
    "id": "fish_echo_pike",
    "name": "回声梭鱼",
    "tier": "normal",
    "islandId": "island_mist_bells",
    "toughness": 118,
    "speed": 122,
    "basePrice": 68,
    "rarityMultiplier": 1.3,
    "weakPointMultiplier": 1.75,
    "behavior": "dash",
    "escapeSeconds": 12
  },
  {
    "id": "fish_fog_shell",
    "name": "雾甲鲷",
    "tier": "normal",
    "islandId": "island_mist_bells",
    "toughness": 138,
    "speed": 58,
    "basePrice": 76,
    "rarityMultiplier": 1.35,
    "weakPointMultiplier": 2.1,
    "behavior": "shield",
    "escapeSeconds": 19
  },
  {
    "id": "elite_belltower_ray",
    "name": "钟楼鳐",
    "tier": "elite",
    "islandId": "island_mist_bells",
    "toughness": 280,
    "speed": 105,
    "basePrice": 190,
    "rarityMultiplier": 1.65,
    "weakPointMultiplier": 1.9,
    "behavior": "split",
    "escapeSeconds": 24
  },
  {
    "id": "boss_fog_chronist",
    "name": "雾钟领航兽",
    "tier": "boss",
    "islandId": "island_mist_bells",
    "toughness": 620,
    "speed": 72,
    "basePrice": 620,
    "rarityMultiplier": 2,
    "weakPointMultiplier": 1.65,
    "behavior": "boss",
    "escapeSeconds": 90
  },
  {
    "id": "fish_cinder_mullet",
    "name": "烬须鲻",
    "tier": "normal",
    "islandId": "island_molten_tide",
    "toughness": 145,
    "speed": 88,
    "basePrice": 82,
    "rarityMultiplier": 1.3,
    "weakPointMultiplier": 1.85,
    "behavior": "school",
    "escapeSeconds": 14
  },
  {
    "id": "fish_lava_drill",
    "name": "熔钻鱼",
    "tier": "normal",
    "islandId": "island_molten_tide",
    "toughness": 168,
    "speed": 76,
    "basePrice": 94,
    "rarityMultiplier": 1.4,
    "weakPointMultiplier": 2.1,
    "behavior": "burrow",
    "escapeSeconds": 17
  },
  {
    "id": "fish_ash_kite",
    "name": "灰烬风筝鳐",
    "tier": "normal",
    "islandId": "island_molten_tide",
    "toughness": 156,
    "speed": 130,
    "basePrice": 102,
    "rarityMultiplier": 1.45,
    "weakPointMultiplier": 1.8,
    "behavior": "dash",
    "escapeSeconds": 12
  },
  {
    "id": "fish_basalt_crab",
    "name": "玄岩蟹鱼",
    "tier": "normal",
    "islandId": "island_molten_tide",
    "toughness": 210,
    "speed": 54,
    "basePrice": 116,
    "rarityMultiplier": 1.5,
    "weakPointMultiplier": 2.25,
    "behavior": "shield",
    "escapeSeconds": 20
  },
  {
    "id": "elite_furnace_fin",
    "name": "炉冠鳍王",
    "tier": "elite",
    "islandId": "island_molten_tide",
    "toughness": 360,
    "speed": 118,
    "basePrice": 260,
    "rarityMultiplier": 1.7,
    "weakPointMultiplier": 1.95,
    "behavior": "split",
    "escapeSeconds": 25
  },
  {
    "id": "boss_caldera_warden",
    "name": "熔潮守炉鲸",
    "tier": "boss",
    "islandId": "island_molten_tide",
    "toughness": 820,
    "speed": 78,
    "basePrice": 820,
    "rarityMultiplier": 2.1,
    "weakPointMultiplier": 1.7,
    "behavior": "boss",
    "escapeSeconds": 90
  }
] as FishConfig[];

export const bundledTools = [
  {
    "id": "tool_rod",
    "name": "弹力鱼竿",
    "kind": "rod",
    "unlockIsland": "island_foam_bay",
    "levels": [
      {
        "level": 1,
        "power": 12,
        "cooldownMs": 850,
        "lineStrength": 30,
        "upgradeCost": 0
      },
      {
        "level": 2,
        "power": 16,
        "cooldownMs": 760,
        "lineStrength": 48,
        "upgradeCost": 90
      },
      {
        "level": 3,
        "power": 21,
        "cooldownMs": 680,
        "lineStrength": 70,
        "upgradeCost": 220
      },
      {
        "level": 4,
        "power": 24,
        "cooldownMs": 640,
        "lineStrength": 82,
        "upgradeCost": 1050,
        "modifiers": {
          "weakPointRadiusScale": 1.18
        }
      },
      {
        "level": 5,
        "power": 27,
        "cooldownMs": 620,
        "lineStrength": 94,
        "upgradeCost": 1650,
        "modifiers": {
          "weakPointRadiusScale": 1.18,
          "freshnessFloorBonus": 0.12
        }
      }
    ]
  },
  {
    "id": "tool_cannon",
    "name": "泡泡连发炮",
    "kind": "cannon",
    "unlockIsland": "island_foam_bay",
    "levels": [
      {
        "level": 1,
        "power": 10,
        "cooldownMs": 260,
        "upgradeCost": 120
      },
      {
        "level": 2,
        "power": 13,
        "cooldownMs": 220,
        "upgradeCost": 240
      },
      {
        "level": 3,
        "power": 17,
        "cooldownMs": 185,
        "upgradeCost": 420
      },
      {
        "level": 4,
        "power": 19,
        "cooldownMs": 175,
        "upgradeCost": 1250,
        "modifiers": {
          "shieldPierce": 0.28
        }
      },
      {
        "level": 5,
        "power": 21,
        "cooldownMs": 168,
        "upgradeCost": 1900,
        "modifiers": {
          "shieldPierce": 0.28,
          "weakPointRadiusScale": 1.12
        }
      }
    ]
  },
  {
    "id": "tool_harpoon",
    "name": "磁力蓄能叉",
    "kind": "harpoon",
    "unlockIsland": "island_prism_reef",
    "levels": [
      {
        "level": 1,
        "power": 28,
        "cooldownMs": 1250,
        "upgradeCost": 260
      },
      {
        "level": 2,
        "power": 38,
        "cooldownMs": 1100,
        "upgradeCost": 460
      },
      {
        "level": 3,
        "power": 52,
        "cooldownMs": 950,
        "upgradeCost": 760
      },
      {
        "level": 4,
        "power": 57,
        "cooldownMs": 900,
        "upgradeCost": 1450,
        "modifiers": {
          "airborneBonus": 0.18
        }
      },
      {
        "level": 5,
        "power": 62,
        "cooldownMs": 860,
        "upgradeCost": 2200,
        "modifiers": {
          "airborneBonus": 0.18,
          "chargeTimeScale": 0.72
        }
      }
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
        "fishPool": [
          "fish_bayfin",
          "fish_shellback"
        ],
        "maxAlive": 5,
        "spawnIntervalSeconds": 3.4
      },
      {
        "durationSeconds": 45,
        "fishPool": [
          "fish_bayfin",
          "fish_shellback",
          "elite_prism_sail"
        ],
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
        "fishPool": [
          "fish_silver_ribbon",
          "fish_lantern_pod"
        ],
        "maxAlive": 7,
        "spawnIntervalSeconds": 2.9
      },
      {
        "durationSeconds": 55,
        "fishPool": [
          "fish_silver_ribbon",
          "fish_lantern_pod",
          "elite_iron_jaw"
        ],
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
        "fishPool": [
          "fish_ember_eel",
          "fish_reef_hopper"
        ],
        "maxAlive": 8,
        "spawnIntervalSeconds": 2.6
      },
      {
        "durationSeconds": 55,
        "fishPool": [
          "fish_ember_eel",
          "fish_reef_hopper",
          "elite_tempest_ray"
        ],
        "maxAlive": 8,
        "spawnIntervalSeconds": 2.4
      }
    ],
    "bossId": "boss_tide_singer",
    "bossPhases": [
      {
        "threshold": 1,
        "behavior": "声浪直线扫射",
        "speedMultiplier": 1,
        "patternIntervalSeconds": 4.5
      },
      {
        "threshold": 0.66,
        "behavior": "召唤双旋涡并暴露鳍部弱点",
        "speedMultiplier": 1.15,
        "patternIntervalSeconds": 4
      },
      {
        "threshold": 0.33,
        "behavior": "环场冲刺后进入长眩晕",
        "speedMultiplier": 1.35,
        "patternIntervalSeconds": 3.4
      }
    ]
  },
  {
    "id": "island_mist_bells",
    "name": "雾钟群岛",
    "unlockCost": 10000,
    "targetSessionSeconds": 300,
    "waves": [
      {
        "durationSeconds": 75,
        "fishPool": [
          "fish_mist_bell",
          "fish_clockwork_goby",
          "fish_echo_pike"
        ],
        "maxAlive": 8,
        "spawnIntervalSeconds": 2.5
      },
      {
        "durationSeconds": 55,
        "fishPool": [
          "fish_fog_shell",
          "elite_belltower_ray"
        ],
        "maxAlive": 8,
        "spawnIntervalSeconds": 2.3
      }
    ],
    "bossId": "boss_fog_chronist",
    "bossPhases": [
      {
        "threshold": 1,
        "behavior": "钟摆声浪横扫",
        "speedMultiplier": 1,
        "patternIntervalSeconds": 4.4
      },
      {
        "threshold": 0.66,
        "behavior": "雾影分身后露出真核",
        "speedMultiplier": 1.14,
        "patternIntervalSeconds": 3.9
      },
      {
        "threshold": 0.33,
        "behavior": "三次突进后长硬直",
        "speedMultiplier": 1.3,
        "patternIntervalSeconds": 3.3
      }
    ]
  },
  {
    "id": "island_molten_tide",
    "name": "熔潮火山",
    "unlockCost": 28000,
    "targetSessionSeconds": 300,
    "waves": [
      {
        "durationSeconds": 75,
        "fishPool": [
          "fish_cinder_mullet",
          "fish_lava_drill",
          "fish_ash_kite"
        ],
        "maxAlive": 8,
        "spawnIntervalSeconds": 2.45
      },
      {
        "durationSeconds": 55,
        "fishPool": [
          "fish_basalt_crab",
          "elite_furnace_fin"
        ],
        "maxAlive": 8,
        "spawnIntervalSeconds": 2.25
      }
    ],
    "bossId": "boss_caldera_warden",
    "bossPhases": [
      {
        "threshold": 1,
        "behavior": "熔浪直线预警",
        "speedMultiplier": 1,
        "patternIntervalSeconds": 4.2
      },
      {
        "threshold": 0.66,
        "behavior": "双热涡迫使横移",
        "speedMultiplier": 1.16,
        "patternIntervalSeconds": 3.8
      },
      {
        "threshold": 0.33,
        "behavior": "炉心冲锋后过热硬直",
        "speedMultiplier": 1.32,
        "patternIntervalSeconds": 3.2
      }
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
