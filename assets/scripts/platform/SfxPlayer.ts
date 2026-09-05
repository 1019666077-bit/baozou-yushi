import { sfxVoices, type SfxId, type SfxVoice } from "../domain/SfxFeel";

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

type MiniBufferSource = {
  buffer: unknown;
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
  createBuffer?(channels: number, frames: number, rate: number): {
    getChannelData(channel: number): Float32Array;
  };
  createBufferSource?(): MiniBufferSource;
};

function createContext(): MiniAudioContext | undefined {
  try {
    const fromWx = (
      globalThis as { wx?: { createWebAudioContext?: () => MiniAudioContext } }
    ).wx?.createWebAudioContext?.();
    if (fromWx) return fromWx;
    const Ctor =
      (globalThis as { AudioContext?: new () => MiniAudioContext }).AudioContext ??
      (globalThis as { webkitAudioContext?: new () => MiniAudioContext })
        .webkitAudioContext;
    return Ctor ? new Ctor() : undefined;
  } catch {
    return undefined;
  }
}

function playVoice(ctx: MiniAudioContext, voice: SfxVoice): void {
  const now = ctx.currentTime + (voice.delay ?? 0);
  const dur = voice.ms / 1000;
  const attack = voice.attack ?? 0.006;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime?.(voice.gain, now + attack);
  if (!gain.gain.linearRampToValueAtTime) {
    gain.gain.setValueAtTime(voice.gain, now + attack);
  }
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  gain.connect(ctx.destination);

  if (voice.type === "noise" && ctx.createBuffer && ctx.createBufferSource) {
    const rate = ctx.sampleRate ?? 44100;
    const frames = Math.max(1, Math.floor(rate * dur));
    const buffer = ctx.createBuffer(1, frames, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    src.start(now);
    return;
  }

  const osc = ctx.createOscillator();
  osc.type = voice.type === "noise" ? "sawtooth" : voice.type;
  osc.frequency.value = voice.freq;
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

/**
 * 音效占位：多音色包络（主音 + 泛音/噪声）。
 * 预留 AudioSource 接线口，当前不加载外部音频包。
 */
export class SfxPlayer {
  private static enabled = true;
  private static ctx?: MiniAudioContext;
  /** 预留：日后挂 Creator AudioSource，现为 mute stub。 */
  static audioSource: { play?: (id: string) => void } | undefined;

  static setEnabled(value: boolean): void {
    this.enabled = value;
  }

  static unlock(): void {
    const ctx = this.context();
    if (ctx?.state === "suspended") void ctx.resume?.();
  }

  static play(id: SfxId): void {
    if (!this.enabled) return;
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume?.();
    if (this.audioSource?.play) {
      this.audioSource.play(id);
      return;
    }
    try {
      for (const voice of sfxVoices(id)) playVoice(ctx, voice);
    } catch {
      return;
    }
  }

  private static context(): MiniAudioContext | undefined {
    if (!this.ctx) this.ctx = createContext();
    return this.ctx;
  }
}
