export function harborFailCopy(error: unknown): string {
  const raw = error instanceof Error ? error.message : "操作失败";
  if (raw.startsWith("Insufficient coins")) return "金币不足";
  if (raw.startsWith("Tool is locked behind island")) return "先解锁对应岛屿。";
  if (raw.startsWith("Tool not owned")) return "先买下这件工具。";
  if (raw.startsWith("Tool already maxed")) return "已经满级。";
  return raw;
}
