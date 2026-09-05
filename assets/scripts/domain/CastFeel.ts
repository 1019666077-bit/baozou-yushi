/**
 * 抛竿蓄力 / 轨迹预览。教学一键仍能中，但甜区让命中有技巧感。
 * 代理与 Runtime 共用，避免预览另写一套。
 */
export const CAST_FEEL = {
  /** 蓄满所需按住时长。 */
  chargeMs: 720,
  /** 甜区：略偏后半段，短点偏早、长点偏晚。 */
  sweetLo: 0.52,
  sweetHi: 0.86,
  /** 教学/单击：到此时长自动甩，落在甜区中后。 */
  tutorialAutoMs: 420,
  /** 低于此值教学仍协助上钩，但不算甜区。 */
  minCharge: 0.18,
  previewPts: 8,
  /** 轨迹中段抬高，读得出抛物线而不是直线。 */
  previewLift: 78,
};

export type CastQuality = "early" | "sweet" | "late";

export function castChargeAt(holdMs: number): number {
  return Math.min(1, Math.max(0, holdMs / CAST_FEEL.chargeMs));
}

export function castSweet(charge: number): boolean {
  return charge >= CAST_FEEL.sweetLo && charge <= CAST_FEEL.sweetHi;
}

export function castQuality(charge: number): CastQuality {
  if (charge < CAST_FEEL.sweetLo) return "early";
  if (charge > CAST_FEEL.sweetHi) return "late";
  return "sweet";
}

/** 教学：只要蓄过一点就协助上钩，不惩罚新手。 */
export function tutorialCastAssists(charge: number): boolean {
  return charge >= CAST_FEEL.minCharge;
}

export function castPreviewPts(
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  charge: number,
): Array<{ x: number; y: number }> {
  const lift = CAST_FEEL.previewLift * (0.55 + 0.45 * charge);
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 1; i <= CAST_FEEL.previewPts; i++) {
    const t = i / CAST_FEEL.previewPts;
    pts.push({
      x: ox + (tx - ox) * t,
      y: oy + (ty - oy) * t + Math.sin(t * Math.PI) * lift,
    });
  }
  return pts;
}

export function castBarSpec(): {
  width: number;
  height: number;
  sweetLo: number;
  sweetHi: number;
} {
  return {
    width: 228,
    height: 16,
    sweetLo: CAST_FEEL.sweetLo,
    sweetHi: CAST_FEEL.sweetHi,
  };
}

/** 弱点脉动窗口：教学始终开放，非教学要踩在亮段才算技巧命中。 */
export function weakWindowK(nowMs: number): number {
  return 0.5 + 0.5 * Math.sin(nowMs / 130);
}

export function weakWindowOpen(nowMs: number, tutorial = false): boolean {
  if (tutorial) return true;
  return weakWindowK(nowMs) > 0.35;
}

export function castAutoReleaseMs(tutorial: boolean): number {
  return tutorial ? CAST_FEEL.tutorialAutoMs : CAST_FEEL.chargeMs * 0.72;
}
