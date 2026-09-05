/**
 * 抛竿蓄力 / 轨迹预览。
 * 教学仍可自动落到甜区；教完后的自由局必须玩家自己松手，早/晚是普通命中，准时才精彩。
 * 代理与 Runtime 共用，避免预览另写一套。
 */
export const CAST_FEEL = {
  /** 蓄满所需按住时长。略拉长，条和轨迹才读得出窗口。 */
  chargeMs: 880,
  /** 甜区收窄：偏后半段，点太早/太晚都出甜区。 */
  sweetLo: 0.58,
  sweetHi: 0.8,
  /** 教学/单击：到此时长自动甩，落在甜区中段。 */
  tutorialAutoMs: 610,
  /** 低于此值教学仍协助上钩，但不算甜区。 */
  minCharge: 0.18,
  previewPts: 10,
  /** 轨迹中段抬高，读得出抛物线而不是直线。 */
  previewLift: 92,
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

/** 自由局：绝不自动进甜区。超时只按「蓄满偏晚」结算。 */
export function castAutoReleases(tutorial: boolean): boolean {
  return tutorial;
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
    width: 268,
    height: 20,
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

/**
 * 教学：自动落到甜区。
 * 自由局：不自动松手；调用方只能在玩家再点「甩出」时 commit。
 * 返回 Infinity 表示没有自动甜区。
 */
export function castAutoReleaseMs(tutorial: boolean): number {
  return tutorial ? CAST_FEEL.tutorialAutoMs : Number.POSITIVE_INFINITY;
}

/** 早/晚普通命中，准时才把精彩度吃满。不改教学首售 11/90。 */
export function castStyleQuality(quality: CastQuality): number {
  if (quality === "sweet") return 1;
  if (quality === "late") return 0.62;
  return 0.52;
}

export function castIsSpectacular(quality: CastQuality): boolean {
  return quality === "sweet";
}
