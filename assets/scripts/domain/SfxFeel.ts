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

/**
 * 按事件分层的占位包络：低音体 + 中段音色 + 噪声空气。
 * 仍是振荡器，不是采样，但听得出「甩 / 砸 / 入箱」不是同一声哔。
 */
export function sfxVoices(id: SfxId): SfxVoice[] {
  if (id === "cast") {
    return [
      { type: "sine", freq: 210, ms: 70, gain: 0.05, attack: 0.004 },
      { type: "triangle", freq: 420, ms: 140, gain: 0.055, delay: 0.02 },
      { type: "sine", freq: 640, ms: 90, gain: 0.03, delay: 0.05 },
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
      { type: "triangle", freq: 520, ms: 80, gain: 0.07 },
      { type: "sine", freq: 260, ms: 110, gain: 0.04, delay: 0.012 },
      { type: "noise", freq: 140, ms: 50, gain: 0.025, delay: 0.008 },
    ];
  }
  if (id === "weak") {
    return [
      { type: "triangle", freq: 880, ms: 90, gain: 0.07 },
      { type: "sine", freq: 1320, ms: 120, gain: 0.045, delay: 0.03 },
      { type: "sine", freq: 1760, ms: 70, gain: 0.025, delay: 0.08 },
    ];
  }
  if (id === "perfect") {
    return [
      { type: "sine", freq: 980, ms: 150, gain: 0.08 },
      { type: "triangle", freq: 1470, ms: 120, gain: 0.045, delay: 0.05 },
      { type: "sine", freq: 1960, ms: 80, gain: 0.025, delay: 0.1 },
    ];
  }
  if (id === "catch") {
    return [
      { type: "sine", freq: 360, ms: 90, gain: 0.05, attack: 0.01 },
      { type: "triangle", freq: 540, ms: 140, gain: 0.05, delay: 0.04 },
      { type: "sine", freq: 720, ms: 100, gain: 0.03, delay: 0.1 },
    ];
  }
  if (id === "sell") {
    return [
      { type: "sine", freq: 660, ms: 110, gain: 0.06 },
      { type: "triangle", freq: 880, ms: 150, gain: 0.05, delay: 0.06 },
      { type: "sine", freq: 1100, ms: 110, gain: 0.035, delay: 0.13 },
      { type: "sine", freq: 1320, ms: 80, gain: 0.02, delay: 0.2 },
    ];
  }
  if (id === "smash") {
    return [
      { type: "sine", freq: 72, ms: 140, gain: 0.09, attack: 0.002 },
      { type: "sawtooth", freq: 118, ms: 110, gain: 0.055 },
      { type: "noise", freq: 70, ms: 180, gain: 0.08, delay: 0.008 },
      { type: "triangle", freq: 190, ms: 70, gain: 0.03, delay: 0.05 },
    ];
  }
  if (id === "splash") {
    return [
      { type: "noise", freq: 240, ms: 110, gain: 0.06 },
      { type: "sine", freq: 160, ms: 90, gain: 0.035, delay: 0.015 },
      { type: "triangle", freq: 280, ms: 60, gain: 0.02, delay: 0.04 },
    ];
  }
  if (id === "yank") {
    return [
      { type: "sine", freq: 300, ms: 80, gain: 0.055, attack: 0.01 },
      { type: "triangle", freq: 220, ms: 120, gain: 0.04, delay: 0.02 },
      { type: "sine", freq: 480, ms: 50, gain: 0.02, delay: 0.06 },
    ];
  }
  return [
    { type: "sine", freq: 460, ms: 40, gain: 0.04 },
    { type: "triangle", freq: 620, ms: 35, gain: 0.02, delay: 0.02 },
  ];
}

/** 自由局蓄力：早/准时/晚三套占位音色，听得出不是同一声哔。 */
export function sfxCastVoices(quality: "early" | "sweet" | "late"): SfxVoice[] {
  if (quality === "sweet") {
    return [
      { type: "sine", freq: 280, ms: 80, gain: 0.055, attack: 0.004 },
      { type: "triangle", freq: 560, ms: 150, gain: 0.06, delay: 0.02 },
      { type: "sine", freq: 840, ms: 110, gain: 0.035, delay: 0.06 },
    ];
  }
  if (quality === "late") {
    return [
      { type: "sawtooth", freq: 160, ms: 90, gain: 0.05 },
      { type: "triangle", freq: 300, ms: 80, gain: 0.03, delay: 0.03 },
    ];
  }
  return [
    { type: "sine", freq: 180, ms: 70, gain: 0.045 },
    { type: "triangle", freq: 260, ms: 60, gain: 0.03, delay: 0.02 },
  ];
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
