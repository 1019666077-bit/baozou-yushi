import { JsonAsset, assetManager } from "cc";
import { islandPackName } from "../domain/IslandPack";

const ready = new Set<string>();

export function ensureIslandPack(islandId: string): Promise<boolean> {
  const name = islandPackName(islandId);
  // 教学关 island_tutorial 没有真实 bundle：islandPackName 为 undefined，直接成功。
  if (!name) return Promise.resolve(true);
  if (ready.has(name) || assetManager.getBundle(name)) {
    ready.add(name);
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    assetManager.loadBundle(name, (error, bundle) => {
      if (error || !bundle) {
        resolve(false);
        return;
      }
      bundle.load("pack", JsonAsset, (loadError) => {
        if (!loadError) ready.add(name);
        resolve(!loadError);
      });
    });
  });
}
