import {
  sfxCastVoices,
  sfxRecipe,
  sfxVoices,
  type SfxId,
  type SfxTone,
  type SfxVoice,
} from "../domain/SfxFeel";
import type { CastQuality } from "../domain/CastFeel";
import { createWechatAudioContext } from "./WechatAudio";

type MiniOscillator = {
  type: string;
  frequency: { value: number };
  connect(node: unknown): void;
  start(when?: number): void;
  stop(when: number): void;
};

type MiniGain = {
  gain: {
    value: number;
    setValueAtTime(value: number, time: number): void;
    linearRampToValueAtTime?(value: number, time: number): void;
    exponentialRampToValueAtTime(value: number, time: number): void;
  };
  connect(node: unknown): void;
};

type MiniAudioBuffer = {
  getChannelData(channel: number): Float32Array;
};

type MiniBufferSource = {
  buffer: MiniAudioBuffer | null;
  connect(node: unknown): void;
  start(when?: number): void;
};

type MiniAudioContext = {
  currentTime: number;
  destination: unknown;
  sampleRate?: number;
  state?: string;
  resume?: () => Promise<void>;
  createOscillator(): MiniOscillator;
  createGain(): MiniGain;
  createBuffer?(
    channels: number,
    frames: number,
    sampleRate: number,
  ): MiniAudioBuffer;
  createBufferSource?(): MiniBufferSource;
};

function createContext(): MiniAudioContext | undefined {
  try {
    const fromWx = createWechatAudioContext<MiniAudioContext>();
    if (fromWx) return fromWx;
    const Ctor =
      (globalThis as { AudioContext?: new () => MiniAudioContext })
        .AudioContext ??
      (globalThis as { webkitAudioContext?: new () => MiniAudioContext })
        .webkitAudioContext;
    return Ctor ? new Ctor() : undefined;
  } catch {
    return undefined;
  }
}

function safeResume(ctx: MiniAudioContext): void {
  if (ctx.state !== "suspended") return;
  try {
    void ctx.resume?.().catch(() => undefined);
  } catch {
    return;
  }
}

export function playSynthRecipe(
  ctx: MiniAudioContext | undefined,
  recipe: readonly SfxTone[],
  enabled: boolean,
): boolean {
  if (!enabled || !ctx) return false;
  try {
    const now = ctx.currentTime;
    for (const tone of recipe) {
      const start = now + (tone.delayMs ?? 0) / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.wave ?? "sine";
      osc.frequency.value = tone.freq;
      gain.gain.setValueAtTime(tone.gain, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + tone.ms / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + tone.ms / 1000 + 0.02);
    }
    return true;
  } catch {
    return false;
  }
}

function playVoice(ctx: MiniAudioContext, voice: SfxVoice): void {
  const now = ctx.currentTime + (voice.delay ?? 0);
  const duration = voice.ms / 1000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime?.(
    voice.gain,
    now + (voice.attack ?? 0.006),
  );
  if (!gain.gain.linearRampToValueAtTime) {
    gain.gain.setValueAtTime(voice.gain, now + (voice.attack ?? 0.006));
  }
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  gain.connect(ctx.destination);

  const createBuffer = ctx.createBuffer?.bind(ctx);
  const createBufferSource = ctx.createBufferSource?.bind(ctx);
  if (voice.type === "noise" && createBuffer && createBufferSource) {
    const rate = ctx.sampleRate ?? 44100;
    const frames = Math.max(1, Math.floor(rate * duration));
    const buffer = createBuffer(1, frames, rate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / frames);
    }
    const source = createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start(now);
    return;
  }

  const oscillator = ctx.createOscillator();
  oscillator.type = voice.type === "noise" ? "sawtooth" : voice.type;
  oscillator.frequency.value = voice.freq;
  oscillator.connect(gain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

export class SfxPlayer {
  private static enabled = true;
  private static ctx?: MiniAudioContext;

  static setEnabled(value: boolean): void {
    this.enabled = value;
  }

  static unlock(): void {
    if (!this.enabled) return;
    const ctx = this.context();
    if (ctx) safeResume(ctx);
  }

  static play(id: SfxId): void {
    if (!this.enabled) return;
    const ctx = this.context();
    if (!ctx) return;
    safeResume(ctx);
    try {
      for (const voice of sfxVoices(id)) playVoice(ctx, voice);
      return;
    } catch {
      // Fall through to the simpler recipe for partial WebAudio implementations.
    }
    playSynthRecipe(ctx, sfxRecipe(id), this.enabled);
  }

  static playCast(quality: CastQuality): void {
    if (!this.enabled) return;
    const ctx = this.context();
    if (!ctx) return;
    safeResume(ctx);
    try {
      for (const voice of sfxCastVoices(quality)) playVoice(ctx, voice);
    } catch {
      playSynthRecipe(ctx, sfxRecipe("cast"), this.enabled);
    }
  }

  private static context(): MiniAudioContext | undefined {
    if (!this.ctx) this.ctx = createContext();
    return this.ctx;
  }
}
