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

export type SfxWave = "sine" | "triangle" | "square" | "sawtooth" | "noise";

export interface SfxTone {
  freq: number;
  ms: number;
  gain: number;
  noise?: boolean;
}

export interface SfxVoice {
  type: SfxWave;
  freq: number;
  ms: number;
  gain: number;
  delay?: number;
  attack?: number;
}

export function shouldPlaySfx(sfx: boolean): boolean {
  return sfx;
}

/** WebAudio 多音色包络占位，不是真机采样。 */
export function sfxPlaceholderNote(): string {
  return "WebAudio 占位音效 ≠ 真机";
}

/** 多音色包络：主音 + 泛音/噪声，仍是占位。 */
export function sfxVoices(id: SfxId): SfxVoice[] {
  if (id === "cast") {
    return [
      { type: "sine", freq: 320, ms: 90, gain: 0.07, attack: 0.008 },
      { type: "triangle", freq: 480, ms: 120, gain: 0.045, delay: 0.03 },
    ];
  }
  if (id === "shot") {
    return [
      { type: "triangle", freq: 540, ms: 55, gain: 0.06 },
      { type: "sine", freq: 820, ms: 40, gain: 0.03, delay: 0.02 },
    ];
  }
  if (id === "hit") {
    return [
      { type: "triangle", freq: 680, ms: 70, gain: 0.07 },
      { type: "sine", freq: 340, ms: 90, gain: 0.035, delay: 0.015 },
    ];
  }
  if (id === "weak") {
    return [
      { type: "triangle", freq: 920, ms: 100, gain: 0.08 },
      { type: "sine", freq: 1380, ms: 80, gain: 0.04, delay: 0.04 },
    ];
  }
  if (id === "perfect") {
    return [
      { type: "sine", freq: 1040, ms: 140, gain: 0.08 },
      { type: "triangle", freq: 1560, ms: 110, gain: 0.045, delay: 0.05 },
    ];
  }
  if (id === "catch") {
    return [
      { type: "sine", freq: 430, ms: 130, gain: 0.07 },
      { type: "triangle", freq: 640, ms: 100, gain: 0.04, delay: 0.06 },
    ];
  }
  if (id === "sell") {
    return [
      { type: "sine", freq: 760, ms: 120, gain: 0.07 },
      { type: "triangle", freq: 950, ms: 140, gain: 0.05, delay: 0.07 },
      { type: "sine", freq: 1140, ms: 90, gain: 0.03, delay: 0.14 },
    ];
  }
  if (id === "smash") {
    return [
      { type: "sawtooth", freq: 140, ms: 90, gain: 0.08 },
      { type: "noise", freq: 90, ms: 110, gain: 0.06, delay: 0.01 },
    ];
  }
  if (id === "splash") {
    return [
      { type: "noise", freq: 220, ms: 80, gain: 0.055 },
      { type: "sine", freq: 180, ms: 70, gain: 0.03, delay: 0.02 },
    ];
  }
  if (id === "yank") {
    return [
      { type: "sine", freq: 380, ms: 70, gain: 0.06 },
      { type: "triangle", freq: 260, ms: 90, gain: 0.035, delay: 0.025 },
    ];
  }
  return [{ type: "sine", freq: 480, ms: 45, gain: 0.05 }];
}

export function sfxTone(id: SfxId): SfxTone {
  const voice = sfxVoices(id)[0];
  return {
    freq: voice.freq,
    ms: voice.ms,
    gain: voice.gain,
    noise: voice.type === "noise" || sfxVoices(id).some((v) => v.type === "noise"),
  };
}
