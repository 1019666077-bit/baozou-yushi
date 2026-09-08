export type CloudKind = "local" | "syncing" | "cloud" | "offline" | "unsigned";

export function cloudStatusLine(kind: CloudKind): string {
  if (kind === "syncing") return "正在对云档…";
  if (kind === "cloud") return "云档已同步";
  if (kind === "offline") return "云档未开，进度先记本机";
  if (kind === "unsigned") return "未登录，进度先记本机";
  return "本机档";
}

export function harborNotice(
  notice: string | undefined,
  fallback = "卖鱼后看榜。打得漂亮会上本机最佳。",
): string {
  const trimmed = (notice ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function islandClosed(islandId: string, disabled: string[]): boolean {
  return disabled.indexOf(islandId) >= 0;
}

export function closedIslandCaption(name: string): string {
  return `${name} 暂未开放`;
}
