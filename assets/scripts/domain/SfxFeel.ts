export type SfxId =
  | "cast"
  | "shot"
  | "hit"
  | "weak"
  | "perfect"
  | "catch"
  | "sell"
  | "ui"
  | "smash"
  | "splash"
  | "yank";

export interface SfxTone {
  freq: number;
  ms: number;
  gain: number;
  noise?: boolean;
}

export function shouldPlaySfx(sfx: boolean): boolean {
  return sfx;
}

/** WebAudio beep/噪声占位，不是真机采样。 */
export function sfxPlaceholderNote(): string {
  return "WebAudio 占位音效 ≠ 真机";
}

export function sfxTone(id: SfxId): SfxTone {
  if (id === "cast") return { freq: 320, ms: 90, gain: 0.08 };
  if (id === "shot") return { freq: 540, ms: 55, gain: 0.07 };
  if (id === "hit") return { freq: 680, ms: 70, gain: 0.08 };
  if (id === "weak") return { freq: 920, ms: 100, gain: 0.09 };
  if (id === "perfect") return { freq: 1040, ms: 140, gain: 0.1 };
  if (id === "catch") return { freq: 430, ms: 130, gain: 0.09 };
  if (id === "sell") return { freq: 760, ms: 120, gain: 0.09 };
  if (id === "smash") return { freq: 140, ms: 90, gain: 0.1, noise: true };
  if (id === "splash") return { freq: 220, ms: 80, gain: 0.07, noise: true };
  if (id === "yank") return { freq: 380, ms: 70, gain: 0.07 };
  return { freq: 480, ms: 45, gain: 0.06 };
}
