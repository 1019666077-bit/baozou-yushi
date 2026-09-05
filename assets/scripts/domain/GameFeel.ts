export type ButtonTone = "primary" | "secondary";
export type ButtonRole = "hero" | "bar" | "chip" | "mini" | "wide";

export interface ButtonSpec {
  width: number;
  height: number;
  fontSize: number;
  radius: number;
}

export interface Palette {
  primary: [number, number, number];
  secondary: [number, number, number];
  primaryInk: [number, number, number];
  secondaryInk: [number, number, number];
  gold: [number, number, number];
  cream: [number, number, number];
  plate: [number, number, number];
  hud: [number, number, number];
  strokePrimary: [number, number, number];
  strokeSecondary: [number, number, number];
}

/** RuntimeHome / RuntimePrototype / 代理预览共用色板。 */
export function feelPalette(): Palette {
  return {
    primary: [255, 138, 32],
    secondary: [18, 64, 78],
    primaryInk: [255, 250, 236],
    secondaryInk: [226, 242, 246],
    gold: [255, 210, 48],
    cream: [255, 248, 228],
    plate: [10, 22, 32],
    hud: [255, 252, 244],
    strokePrimary: [255, 228, 150],
    strokeSecondary: [64, 176, 176],
  };
}

/** 主 CTA 暖色，次要按钮深青，拉开层级。 */
export function buttonFillRgb(tone: ButtonTone): [number, number, number] {
  const p = feelPalette();
  return tone === "primary" ? p.primary : p.secondary;
}

export function buttonLabelRgb(tone: ButtonTone): [number, number, number] {
  const p = feelPalette();
  return tone === "primary" ? p.primaryInk : p.secondaryInk;
}

export function buttonStrokeRgb(tone: ButtonTone): [number, number, number] {
  const p = feelPalette();
  return tone === "primary" ? p.strokePrimary : p.strokeSecondary;
}

export function buttonRadius(): number {
  return 20;
}

export function buttonStrokeWidth(tone: ButtonTone): number {
  return tone === "primary" ? 4 : 2;
}

export function buttonSpec(role: ButtonRole): ButtonSpec {
  if (role === "hero") return { width: 300, height: 92, fontSize: 30, radius: buttonRadius() };
  if (role === "bar") return { width: 210, height: 86, fontSize: 28, radius: buttonRadius() };
  if (role === "wide") return { width: 300, height: 72, fontSize: 22, radius: buttonRadius() };
  if (role === "chip") return { width: 240, height: 58, fontSize: 22, radius: 16 };
  return { width: 150, height: 56, fontSize: 22, radius: 14 };
}

export function goldHudRgb(): [number, number, number] {
  return feelPalette().gold;
}

export function creamInkRgb(): [number, number, number] {
  return feelPalette().cream;
}

export function plateFillRgba(tutorial = false): [number, number, number, number] {
  return tutorial ? [12, 24, 34, 228] : [12, 24, 34, 200];
}

export function plateStrokeRgba(tutorial = false): [number, number, number, number] {
  return tutorial ? [255, 206, 64, 230] : [110, 196, 196, 110];
}

export function plateSize(): { width: number; height: number; radius: number } {
  return { width: 780, height: 52, radius: 14 };
}

export function coinJumpSeconds(): number {
  return 0.85;
}

/** 命中/入箱跳字停留，短到不挡下一步点击。 */
export function calloutHoldMs(): number {
  return 800;
}

export function coinJumpLiftPx(elapsed: number, duration = coinJumpSeconds()): number {
  const t = duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / duration));
  return 46 * t;
}

export function coinJumpAlpha(elapsed: number, duration = coinJumpSeconds()): number {
  const t = duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / duration));
  const fade = t < 0.2 ? 1 : 1 - (t - 0.2) / 0.8;
  return Math.max(0, fade);
}

export function sellPunchSeconds(lowPower: boolean): number {
  return lowPower ? 0.12 : 0.22;
}

export function discoveryPunchSeconds(lowPower: boolean): number {
  return lowPower ? 0.14 : 0.2;
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
