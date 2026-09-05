export type ButtonTone = "primary" | "secondary";

/** 主 CTA 暖色，次要按钮深青，拉开层级。 */
export function buttonFillRgb(tone: ButtonTone): [number, number, number] {
  return tone === "primary" ? [255, 156, 56] : [16, 78, 90];
}

export function buttonLabelRgb(tone: ButtonTone): [number, number, number] {
  return tone === "primary" ? [255, 252, 240] : [220, 238, 244];
}

export function goldHudRgb(): [number, number, number] {
  return [255, 220, 72];
}

export function spawnCap(lowPower: boolean): number {
  return lowPower ? 2 : 3;
}

export function shouldVibrate(
  vibration: boolean,
  parts: {
    weakPoint: boolean;
    airborne: boolean;
    combo: number;
    perfect?: boolean;
  },
): boolean {
  if (!vibration) return false;
  return (
    parts.perfect === true ||
    parts.weakPoint ||
    parts.airborne ||
    parts.combo >= 3
  );
}

export function settingCaption(name: string, on: boolean): string {
  return `${name} ${on ? "开" : "关"}`;
}

export function hitStopSeconds(
  kind: "miss" | "hit" | "weak" | "perfect" | "catch",
  lowPower: boolean,
): number {
  if (lowPower || kind === "miss") return 0;
  if (kind === "weak" || kind === "perfect") return 0.09;
  if (kind === "hit" || kind === "catch") return 0.05;
  return 0;
}

export function styleHudShouldPunch(
  prev: { multiplier: number; combo: number },
  next: { multiplier: number; combo: number },
): boolean {
  return next.multiplier > prev.multiplier + 1e-6 || next.combo > prev.combo;
}

export function styleHudPunchSeconds(lowPower: boolean): number {
  return lowPower ? 0.08 : 0.12;
}

export function styleHudPunchScaleAt(
  elapsed: number,
  lowPower: boolean,
): number {
  const duration = styleHudPunchSeconds(lowPower);
  if (duration <= 0) return 1;
  const peak = lowPower ? 1.08 : 1.16;
  const t = Math.min(1, Math.max(0, elapsed / duration));
  const env = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
  return 1 + (peak - 1) * Math.max(0, env);
}

export function styleHudPunchRgb(
  elapsed: number,
  lowPower: boolean,
): [number, number, number] {
  const gold = goldHudRgb();
  const rest: [number, number, number] = [240, 250, 255];
  const duration = styleHudPunchSeconds(lowPower);
  const t =
    duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / duration));
  const env = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
  const k = Math.max(0, env);
  return [
    Math.round(rest[0] + (gold[0] - rest[0]) * k),
    Math.round(rest[1] + (gold[1] - rest[1]) * k),
    Math.round(rest[2] + (gold[2] - rest[2]) * k),
  ];
}
