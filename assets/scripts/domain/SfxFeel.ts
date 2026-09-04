export type SfxId =
  | "cast"
  | "shot"
  | "hit"
  | "weak"
  | "perfect"
  | "catch"
  | "sell"
  | "ui";

export interface SfxTone {
  freq: number;
  ms: number;
  gain: number;
}

export function shouldPlaySfx(sfx: boolean): boolean {
  return sfx;
}

export function sfxTone(id: SfxId): SfxTone {
  if (id === "cast") return { freq: 320, ms: 90, gain: 0.08 };
  if (id === "shot") return { freq: 540, ms: 55, gain: 0.07 };
  if (id === "hit") return { freq: 680, ms: 70, gain: 0.08 };
  if (id === "weak") return { freq: 920, ms: 100, gain: 0.09 };
  if (id === "perfect") return { freq: 1040, ms: 140, gain: 0.1 };
  if (id === "catch") return { freq: 430, ms: 130, gain: 0.09 };
  if (id === "sell") return { freq: 760, ms: 120, gain: 0.09 };
  return { freq: 480, ms: 45, gain: 0.06 };
}
