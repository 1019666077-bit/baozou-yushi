export type Rgb = readonly [number, number, number];

export type FishSilhouette =
  | "bayfin"
  | "shell"
  | "ribbon"
  | "pod"
  | "eel"
  | "hopper"
  | "sail"
  | "jaw"
  | "ray"
  | "whale"
  | "bell"
  | "goby"
  | "pike"
  | "fogShell"
  | "towerRay"
  | "chronist"
  | "cinder"
  | "drill"
  | "ashKite"
  | "basalt"
  | "furnace"
  | "warden";

export interface FishLook {
  silhouette: FishSilhouette;
  body: Rgb;
  belly: Rgb;
  accent: Rgb;
  weakX: number;
  weakY: number;
  bodyRadius: number;
}

export interface DeckFishShape {
  length: number;
  height: number;
  width: number;
  finX: number;
  finHeight: number;
}

export interface IslandLook {
  skyTop: Rgb;
  sky: Rgb;
  haze: Rgb;
  far: Rgb;
  mid: Rgb;
  near: Rgb;
  deep: Rgb;
  land: Rgb;
  landDark: Rgb;
  accent: Rgb;
}

export interface IslandRules {
  water: "calm-bands" | "prism-chop" | "storm-swell" | "fog-ripple" | "lava-tide";
  fog: "clear" | "salt-haze" | "heavy-bells" | "ash";
  weather: "sunny" | "sparkle" | "squall" | "drizzle" | "embers";
  deck: "sunbleached" | "lacquered" | "stormworn" | "brassbound" | "charred";
  waveSlant: number;
  fogAlpha: number;
}

const ISLAND_RULES: Record<string, IslandRules> = {
  island_foam_bay: {
    water: "calm-bands", fog: "clear", weather: "sunny",
    deck: "sunbleached", waveSlant: 0, fogAlpha: 0.1,
  },
  island_prism_reef: {
    water: "prism-chop", fog: "salt-haze", weather: "sparkle",
    deck: "lacquered", waveSlant: 5, fogAlpha: 0.18,
  },
  island_storm_eye: {
    water: "storm-swell", fog: "salt-haze", weather: "squall",
    deck: "stormworn", waveSlant: 12, fogAlpha: 0.3,
  },
  island_mist_bells: {
    water: "fog-ripple", fog: "heavy-bells", weather: "drizzle",
    deck: "brassbound", waveSlant: 3, fogAlpha: 0.46,
  },
  island_molten_tide: {
    water: "lava-tide", fog: "ash", weather: "embers",
    deck: "charred", waveSlant: 8, fogAlpha: 0.26,
  },
};

const FISH: Record<string, FishLook> = {
  fish_bayfin: {
    silhouette: "bayfin",
    body: [72, 196, 168],
    belly: [186, 236, 196],
    accent: [46, 138, 128],
    weakX: 26,
    weakY: 16,
    bodyRadius: 50,
  },
  fish_shellback: {
    silhouette: "shell",
    body: [176, 142, 86],
    belly: [230, 206, 150],
    accent: [132, 96, 58],
    weakX: 22,
    weakY: 10,
    bodyRadius: 54,
  },
  fish_silver_ribbon: {
    silhouette: "ribbon",
    body: [198, 220, 232],
    belly: [240, 248, 252],
    accent: [120, 168, 196],
    weakX: 36,
    weakY: 4,
    bodyRadius: 48,
  },
  fish_lantern_pod: {
    silhouette: "pod",
    body: [86, 122, 168],
    belly: [255, 214, 110],
    accent: [255, 236, 150],
    weakX: 8,
    weakY: 6,
    bodyRadius: 46,
  },
  fish_ember_eel: {
    silhouette: "eel",
    body: [214, 92, 64],
    belly: [255, 176, 96],
    accent: [255, 120, 72],
    weakX: 18,
    weakY: 0,
    bodyRadius: 42,
  },
  fish_reef_hopper: {
    silhouette: "hopper",
    body: [64, 176, 124],
    belly: [170, 228, 150],
    accent: [40, 118, 92],
    weakX: 20,
    weakY: 14,
    bodyRadius: 48,
  },
  elite_prism_sail: {
    silhouette: "sail",
    body: [64, 186, 196],
    belly: [186, 236, 232],
    accent: [168, 92, 210],
    weakX: 12,
    weakY: 28,
    bodyRadius: 52,
  },
  elite_iron_jaw: {
    silhouette: "jaw",
    body: [118, 128, 142],
    belly: [196, 186, 168],
    accent: [72, 78, 92],
    weakX: 30,
    weakY: 8,
    bodyRadius: 56,
  },
  elite_tempest_ray: {
    silhouette: "ray",
    body: [58, 96, 168],
    belly: [120, 168, 214],
    accent: [90, 210, 210],
    weakX: 18,
    weakY: 6,
    bodyRadius: 58,
  },
  boss_tide_singer: {
    silhouette: "whale",
    body: [62, 86, 148],
    belly: [150, 186, 214],
    accent: [255, 210, 120],
    weakX: 28,
    weakY: 14,
    bodyRadius: 56,
  },
  fish_mist_bell: {
    silhouette: "bell", body: [112, 188, 192], belly: [210, 236, 222],
    accent: [238, 214, 132], weakX: 8, weakY: 18, bodyRadius: 46,
  },
  fish_clockwork_goby: {
    silhouette: "goby", body: [136, 148, 126], belly: [218, 210, 164],
    accent: [186, 132, 74], weakX: 30, weakY: 2, bodyRadius: 50,
  },
  fish_echo_pike: {
    silhouette: "pike", body: [78, 132, 166], belly: [176, 218, 224],
    accent: [118, 226, 204], weakX: 36, weakY: 6, bodyRadius: 44,
  },
  fish_fog_shell: {
    silhouette: "fogShell", body: [108, 116, 132], belly: [190, 200, 196],
    accent: [156, 188, 188], weakX: -4, weakY: 20, bodyRadius: 55,
  },
  elite_belltower_ray: {
    silhouette: "towerRay", body: [78, 102, 154], belly: [156, 186, 214],
    accent: [232, 188, 104], weakX: 0, weakY: 26, bodyRadius: 59,
  },
  boss_fog_chronist: {
    silhouette: "chronist", body: [66, 88, 116], belly: [148, 170, 184],
    accent: [238, 194, 92], weakX: 24, weakY: 20, bodyRadius: 60,
  },
  fish_cinder_mullet: {
    silhouette: "cinder", body: [150, 76, 62], belly: [226, 148, 86],
    accent: [255, 202, 94], weakX: 22, weakY: 10, bodyRadius: 48,
  },
  fish_lava_drill: {
    silhouette: "drill", body: [126, 62, 54], belly: [220, 116, 70],
    accent: [255, 174, 62], weakX: 34, weakY: 0, bodyRadius: 50,
  },
  fish_ash_kite: {
    silhouette: "ashKite", body: [96, 76, 84], belly: [180, 142, 130],
    accent: [242, 126, 72], weakX: 8, weakY: 12, bodyRadius: 58,
  },
  fish_basalt_crab: {
    silhouette: "basalt", body: [78, 70, 68], belly: [142, 120, 102],
    accent: [230, 104, 58], weakX: 2, weakY: 16, bodyRadius: 58,
  },
  elite_furnace_fin: {
    silhouette: "furnace", body: [124, 52, 44], belly: [214, 106, 62],
    accent: [255, 214, 76], weakX: 12, weakY: 30, bodyRadius: 61,
  },
  boss_caldera_warden: {
    silhouette: "warden", body: [84, 52, 50], belly: [168, 84, 62],
    accent: [255, 174, 60], weakX: 30, weakY: 12, bodyRadius: 64,
  },
};

const ISLANDS: Record<string, IslandLook> = {
  island_foam_bay: {
    skyTop: [168, 214, 236],
    sky: [126, 196, 216],
    haze: [210, 232, 236],
    far: [64, 168, 186],
    mid: [32, 140, 168],
    near: [22, 108, 138],
    deep: [12, 62, 86],
    land: [214, 196, 132],
    landDark: [92, 148, 108],
    accent: [48, 138, 96],
  },
  island_prism_reef: {
    skyTop: [164, 176, 228],
    sky: [110, 154, 210],
    haze: [186, 200, 236],
    far: [48, 132, 186],
    mid: [28, 108, 158],
    near: [18, 86, 132],
    deep: [10, 46, 78],
    land: [92, 186, 196],
    landDark: [72, 96, 168],
    accent: [186, 110, 214],
  },
  island_storm_eye: {
    skyTop: [92, 118, 148],
    sky: [70, 104, 132],
    haze: [120, 142, 158],
    far: [32, 96, 124],
    mid: [18, 82, 108],
    near: [12, 72, 96],
    deep: [8, 36, 52],
    land: [86, 92, 78],
    landDark: [52, 58, 48],
    accent: [196, 96, 64],
  },
  island_mist_bells: {
    skyTop: [154, 174, 186], sky: [112, 148, 164], haze: [196, 210, 208],
    far: [72, 132, 142], mid: [42, 108, 124], near: [24, 82, 102],
    deep: [12, 44, 62], land: [128, 134, 112], landDark: [66, 84, 78],
    accent: [224, 188, 96],
  },
  island_molten_tide: {
    skyTop: [112, 82, 78], sky: [92, 64, 66], haze: [164, 108, 84],
    far: [82, 70, 76], mid: [68, 54, 62], near: [50, 40, 50],
    deep: [26, 24, 34], land: [108, 72, 58], landDark: [54, 42, 44],
    accent: [244, 112, 52],
  },
  island_tutorial: {
    skyTop: [176, 210, 228],
    sky: [132, 186, 210],
    haze: [206, 226, 236],
    far: [58, 150, 176],
    mid: [30, 128, 156],
    near: [20, 98, 128],
    deep: [12, 56, 78],
    land: [176, 168, 128],
    landDark: [96, 122, 108],
    accent: [214, 168, 92],
  },
};

const HARBOR: IslandLook = {
  skyTop: [255, 186, 132],
  sky: [132, 186, 214],
  haze: [255, 220, 176],
  far: [48, 150, 176],
  mid: [24, 122, 150],
  near: [16, 92, 122],
  deep: [10, 52, 74],
  land: [196, 168, 108],
  landDark: [78, 128, 108],
  accent: [255, 168, 72],
};

export function fishLook(id: string): FishLook {
  return FISH[id] ?? FISH.fish_bayfin;
}

export function islandLook(islandId: string, harbor = false): IslandLook {
  if (harbor) return HARBOR;
  return ISLANDS[islandId] ?? ISLANDS.island_foam_bay;
}

export function islandRules(islandId: string): IslandRules {
  return ISLAND_RULES[islandId] ?? ISLAND_RULES.island_foam_bay;
}

export function allFishSilhouettes(): FishSilhouette[] {
  return Object.keys(FISH).map((id) => FISH[id].silhouette);
}

export function fishVisualSignature(id: string): string {
  const look = fishLook(id);
  return [
    look.silhouette,
    look.weakX,
    look.weakY,
    look.bodyRadius,
  ].join(":");
}

export function allFishVisualSignatures(): string[] {
  return Object.keys(FISH).map(fishVisualSignature);
}

export function deckFishShape(id: string): DeckFishShape {
  const silhouettes = allFishSilhouettes();
  const index = Math.max(0, silhouettes.indexOf(fishLook(id).silhouette));
  return {
    length: 1.25 + (index % 6) * 0.11,
    height: 0.28 + (index % 4) * 0.08,
    width: 0.38 + (index % 5) * 0.06,
    finX: -0.42 + (index % 7) * 0.14,
    finHeight: 0.18 + (index % 8) * 0.07,
  };
}

export function harborIslandIds(): string[] {
  return [
    "island_foam_bay",
    "island_prism_reef",
    "island_storm_eye",
    "island_mist_bells",
    "island_molten_tide",
  ];
}

export function harborIslandX(islandId: string): number {
  return -500 + harborIslandIds().indexOf(islandId) * 250;
}
