export const ISLAND_PACK_NAMES = [
  "island_foam_bay",
  "island_prism_reef",
  "island_storm_eye",
] as const;

export type IslandPackName = (typeof ISLAND_PACK_NAMES)[number];

/** 教学关 island_tutorial 没有真实 bundle，返回 undefined，加载层直接成功。 */
export function islandPackName(islandId: string): IslandPackName | undefined {
  return ISLAND_PACK_NAMES.find((name) => name === islandId);
}

export type SailAfterPack = "enter_sea" | "stay_harbor";

/** 分包没装上就留在港口；只有就绪才允许挂 RuntimePrototype。 */
export function decideSailAfterPack(packReady: boolean): SailAfterPack {
  return packReady ? "enter_sea" : "stay_harbor";
}

export function harborSailWait(islandName: string): string {
  return `正在驶向${islandName}…`;
}

export function harborPackFailCopy(islandName: string): string {
  return `${islandName}分包没装上，先留在港口。点出海可重试。`;
}
