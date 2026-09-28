/**
 * 绿区固定为 tidewater `CatchMinigame` 的 [0.3, 0.85]。
 * 鱼竿升级只改抛投距离，等级参数保留是为了旧调用点，不再加宽。
 */
export function greenBand(_rodLevel = 0): [number, number] {
  return [0.3, 0.85];
}
