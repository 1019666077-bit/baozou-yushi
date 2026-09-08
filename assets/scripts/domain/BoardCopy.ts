import type { RecentRun } from "../data/types";

export function bestStyleLine(score: number): string {
  return `本机最佳 ×${(Math.max(0, score) / 100).toFixed(2)}`;
}

export function boardLines(
  recent: RecentRun[],
  nameOf: (islandId: string) => string,
): string[] {
  if (recent.length === 0) return ["还没有出海记录"];
  return recent.map(
    (run, index) =>
      `${index + 1}. ${nameOf(run.islandId)} ${run.fishCount}条 ×${run.bestMultiplier.toFixed(2)} ${run.coins}金`,
  );
}

export function friendBoardHint(openData = false, signedIn = true): string {
  if (!signedIn) {
    return "未登录微信，这里只记你自己的成绩。登录后才会出现好友榜。";
  }
  return openData
    ? "下面是微信好友榜。没好友时只显示你自己。"
    : "这里先记你自己的成绩。微信真机登录后才会出现好友榜。";
}
