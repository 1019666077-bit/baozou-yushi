import type { PlayerSave, RunSummary } from "../data/types";
import { TUTORIAL_ISLAND_ID } from "./TutorialFlow";

export function settleHeadline(summary: RunSummary): string {
  if (summary.fish.length === 0) return "空手回港";
  return `本局卖出${summary.totalCoins}金 · 最高×${summary.bestMultiplier.toFixed(2)}`;
}

export function settleRows(
  summary: RunSummary,
  nameOf: (fishId: string) => string,
): string[] {
  const rows = summary.fish.map(
    (item) =>
      `${nameOf(item.fishId)} ×${item.styleMultiplier.toFixed(2)} → ${item.price}金`,
  );
  if (rows.length <= 6) return rows;
  return [...rows.slice(0, 5), `还有${rows.length - 5}条入箱`];
}

export function settleSlogan(summary: RunSummary): string {
  if (summary.fish.length === 0) return "拽上岸、砸漂亮，搬进鱼箱才卖得出价。";
  if (summary.bestMultiplier >= 1.4) return "打得越漂亮，鱼越值钱";
  return "弱点、浮空砸、连击、入箱都会抬价。";
}

export function bookLines(
  all: Array<{ id: string; name: string }>,
  discovered: string[],
): string[] {
  const known = new Set(discovered);
  return all.map((fish) =>
    known.has(fish.id) ? `${fish.name} 已收` : `${fish.name} 未收`,
  );
}

export function applyRunRewards(
  save: PlayerSave,
  summary: RunSummary,
): PlayerSave {
  const discovered = new Set(save.discoveredFish);
  for (const item of summary.fish) discovered.add(item.fishId);
  return {
    ...save,
    coins: save.coins + summary.totalCoins,
    discoveredFish: Array.from(discovered),
    bestStyleScore: Math.max(
      save.bestStyleScore,
      Math.round(summary.bestMultiplier * 100),
    ),
    tutorialComplete:
      save.tutorialComplete ||
      (summary.islandId === TUTORIAL_ISLAND_ID && summary.fish.length > 0),
    completedRuns: (save.completedRuns ?? 0) + 1,
    recentRuns: [
      {
        islandId: summary.islandId,
        coins: summary.totalCoins,
        bestMultiplier: summary.bestMultiplier,
        fishCount: summary.fish.length,
      },
      ...(save.recentRuns ?? []),
    ].slice(0, 5),
  };
}
