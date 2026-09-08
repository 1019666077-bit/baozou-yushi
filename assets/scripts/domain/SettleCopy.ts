import type { PlayerSave, RunSummary } from "../data/types";
import { applyOrderEvent, ensureDailyOrders } from "./DailyOrders";

export function settleHeadline(summary: RunSummary): string {
  if (summary.fish.length === 0) return "空手回港";
  return `本局卖出${summary.totalCoins}金 · 最高${summary.bestStyleGrade ?? "C"}级 ×${summary.bestMultiplier.toFixed(2)}`;
}

export function settleRows(
  summary: RunSummary,
  nameOf: (fishId: string) => string,
): string[] {
  const rows = summary.fish.map(
    (item) =>
      `${nameOf(item.fishId)} ${item.styleGrade ?? "C"}级 ×${item.styleMultiplier.toFixed(2)} → ${item.price}金`,
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
  mastery: PlayerSave["fishMastery"] = {},
): string[] {
  const known = new Set(discovered);
  return all.map((fish) => {
    if (!known.has(fish.id)) return `${fish.name} 未收`;
    const value = mastery[fish.id];
    return `${fish.name} 熟练${value?.mastery ?? 0} · ${value?.captures ?? 0}捕 · 最佳${value?.bestGrade ?? "C"}`;
  });
}

export function settleRun(
  save: PlayerSave,
  summary: RunSummary,
): PlayerSave {
  const discovered = new Set(save.discoveredFish);
  for (const item of summary.fish) discovered.add(item.fishId);
  const rank = { C: 0, B: 1, A: 2, S: 3 } as const;
  const fishMastery = { ...save.fishMastery };
  let dailyOrders = ensureDailyOrders(save.dailyOrders);
  const toolKind =
    summary.toolId === "tool_cannon"
      ? "cannon"
      : summary.toolId === "tool_harpoon"
        ? "harpoon"
        : "rod";
  for (const item of summary.fish) {
    const grade = item.styleGrade ?? "C";
    const current = fishMastery[item.fishId];
    fishMastery[item.fishId] = {
      fishId: item.fishId,
      captures: (current?.captures ?? 0) + 1,
      bestGrade:
        !current || rank[grade] > rank[current.bestGrade] ? grade : current.bestGrade,
      mastery: Math.min(
        100,
        (current?.mastery ?? 0) + 2 + rank[grade] * 2,
      ),
    };
    dailyOrders = applyOrderEvent(dailyOrders, {
      captures: 1,
      airborne: item.airborneCapture === true,
      grade,
      toolKind,
      islandId: summary.islandId,
    });
  }
  const defeatedBoss = summary.fish.some((item) =>
    item.fishId.startsWith("boss_"),
  );
  return {
    ...save,
    coins: save.coins + summary.totalCoins,
    discoveredFish: Array.from(discovered),
    fishMastery,
    dailyOrders,
    bestStyleScore: Math.max(
      save.bestStyleScore,
      Math.round(summary.bestMultiplier * 100),
    ),
    tutorialComplete:
      save.tutorialComplete || summary.tutorialCompleted === true,
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
    endlessTide: {
      ...save.endlessTide,
      unlocked: save.endlessTide.unlocked || defeatedBoss,
    },
  };
}
