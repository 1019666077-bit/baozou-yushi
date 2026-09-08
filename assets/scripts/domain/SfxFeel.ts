export type SfxId =
  | "cast"
  | "shot"
  | "hit"
  | "weak"
  | "perfect"
  | "catch"
  | "sell"
  | "bossWarn"
  | "purchase"
  | "ui";

export interface SfxTone {
  freq: number;
  ms: number;
  gain: number;
  wave?: "sine" | "triangle" | "square" | "sawtooth";
  delayMs?: number;
}

export type SfxRecipe = readonly SfxTone[];

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

export function sfxRecipe(id: SfxId): SfxRecipe {
  const base = sfxTone(id);
  if (id === "weak") {
    return [
      { ...base, wave: "triangle" },
      { freq: 1380, ms: 72, gain: 0.045, wave: "sine", delayMs: 24 },
    ];
  }
  if (id === "perfect") {
    return [
      { freq: 760, ms: 90, gain: 0.07, wave: "triangle" },
      { freq: 1040, ms: 150, gain: 0.08, wave: "sine", delayMs: 58 },
      { freq: 1520, ms: 95, gain: 0.04, wave: "sine", delayMs: 110 },
    ];
  }
  if (id === "catch") {
    return [
      { freq: 260, ms: 110, gain: 0.08, wave: "triangle" },
      { freq: 520, ms: 130, gain: 0.06, wave: "sine", delayMs: 42 },
    ];
  }
  if (id === "sell") {
    return [
      { freq: 620, ms: 65, gain: 0.06, wave: "square" },
      { freq: 930, ms: 95, gain: 0.05, wave: "sine", delayMs: 52 },
    ];
  }
  if (id === "bossWarn") {
    return [
      { freq: 150, ms: 180, gain: 0.09, wave: "sawtooth" },
      { freq: 112, ms: 220, gain: 0.08, wave: "triangle", delayMs: 190 },
    ];
  }
  if (id === "purchase") {
    return [
      { freq: 660, ms: 75, gain: 0.055, wave: "sine" },
      { freq: 990, ms: 120, gain: 0.065, wave: "triangle", delayMs: 62 },
    ];
  }
  return [{ ...base, wave: id === "shot" || id === "hit" ? "triangle" : "sine" }];
}
