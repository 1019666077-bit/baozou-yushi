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
    body: [36, 214, 178],
    belly: [210, 250, 220],
    accent: [18, 142, 124],
    weakX: 26,
    weakY: 16,
    bodyRadius: 52,
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
    skyTop: [148, 222, 248],
    sky: [78, 198, 228],
    haze: [198, 238, 246],
    far: [42, 186, 204],
    mid: [18, 148, 176],
    near: [12, 112, 146],
    deep: [8, 58, 86],
    land: [236, 210, 118],
    landDark: [72, 168, 112],
    accent: [36, 168, 108],
  },
  island_prism_reef: {
    skyTop: [176, 186, 246],
    sky: [98, 148, 226],
    haze: [198, 208, 248],
    far: [46, 142, 206],
    mid: [24, 112, 176],
    near: [16, 86, 142],
    deep: [8, 42, 78],
    land: [86, 210, 214],
    landDark: [78, 92, 186],
    accent: [210, 118, 236],
  },
  island_storm_eye: {
    skyTop: [78, 104, 138],
    sky: [56, 90, 122],
    haze: [118, 138, 156],
    far: [24, 86, 118],
    mid: [14, 72, 98],
    near: [10, 60, 86],
    deep: [6, 28, 44],
    land: [92, 96, 78],
    landDark: [46, 52, 42],
    accent: [226, 92, 56],
  },
  island_tutorial: {
    skyTop: [168, 220, 242],
    sky: [92, 186, 218],
    haze: [214, 236, 246],
    far: [46, 168, 192],
    mid: [20, 136, 168],
    near: [14, 104, 138],
    deep: [8, 52, 76],
    land: [210, 186, 118],
    landDark: [86, 138, 112],
    accent: [255, 176, 72],
  },
};

const HARBOR: IslandLook = {
  skyTop: [255, 148, 72],
  sky: [255, 192, 118],
  haze: [255, 220, 168],
  far: [28, 168, 186],
  mid: [12, 122, 154],
  near: [8, 84, 118],
  deep: [4, 36, 58],
  land: [226, 178, 96],
  landDark: [72, 142, 108],
  accent: [255, 148, 42],
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
