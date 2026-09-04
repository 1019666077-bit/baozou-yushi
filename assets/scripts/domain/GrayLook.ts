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
  | "whale";

export interface FishLook {
  silhouette: FishSilhouette;
  body: Rgb;
  belly: Rgb;
  accent: Rgb;
  weakX: number;
  weakY: number;
  bodyRadius: number;
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

export function allFishSilhouettes(): FishSilhouette[] {
  return Object.keys(FISH).map((id) => FISH[id].silhouette);
}

export function harborIslandIds(): string[] {
  return ["island_foam_bay", "island_prism_reef", "island_storm_eye"];
}

export function harborIslandX(islandId: string): number {
  if (islandId === "island_prism_reef") return 170;
  if (islandId === "island_storm_eye") return 470;
  return -160;
}
