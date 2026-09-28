/**
 * 钓鱼循环声的速率和音量。数字来自 tidewater `SoundScape.rodLoop`。
 * 不创建播放器。预览和 Cocos 各自按这些数去播。
 */

/** 摇轮。crankSpeed 是收线速率（约 0..1.6），再除以 1.4，夹在 0.45..1.3。 */
export function reelWindRate(crankSpeed: number): number {
  return Math.min(1.3, Math.max(0.45, crankSpeed / 1.4));
}

/** 鱼往外冲才响。payOut 是出线速度，米/秒。 */
export function reelDragRate(payOut: number): number {
  return 0.7 + Math.max(0, payOut) * 0.25;
}

/** 拉力从 0.7 渐入，到 1 满。低于 0.7 不响。 */
export function strainGain(tension: number): number {
  if (tension <= 0.7) return 0;
  const t = Math.min(1, (tension - 0.7) / 0.3);
  return t * t * (3 - 2 * t);
}

export function swishRate(power: number): number {
  return 0.9 + Math.min(1, Math.max(0, power)) * 0.2;
}

/** 蓄力越大抛竿越轻，满蓄力大约低 9 dB。 */
export function swishGain(power: number): number {
  return Math.pow(10, (-9 * Math.min(1, Math.max(0, power))) / 20);
}
