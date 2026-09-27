/**
 * 鱼竿对绿区的加宽。tidewater `CatchMinigame` 的绿区固定为 [0.3, 0.85]，
 * 鱼竿只改抛投距离。这里让 0 级严格等于原绿区，每升一级向两侧加宽，
 * 这样鱼竿升级会真实改变拉力对抗。
 */
export function greenBand(rodLevel: number): [number, number] {
  const steps = Math.max(0, rodLevel | 0);
  const widen = steps * 0.035;
  return [Math.max(0.16, 0.3 - widen), Math.min(0.96, 0.85 + widen)];
}
