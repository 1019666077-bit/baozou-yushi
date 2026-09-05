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
