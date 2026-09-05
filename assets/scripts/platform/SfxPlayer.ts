import { sfxTone, type SfxId } from "../domain/SfxFeel";

type MiniOscillator = {
  type: string;
  frequency: { value: number };
  connect(node: unknown): void;
  start(): void;
  stop(when: number): void;
};

type MiniGain = {
  gain: {
    value: number;
    setValueAtTime(value: number, time: number): void;
    exponentialRampToValueAtTime(value: number, time: number): void;
  };
  connect(node: unknown): void;
};

type MiniAudioContext = {
  currentTime: number;
  destination: unknown;
  state?: string;
  resume?: () => Promise<void>;
  createOscillator(): MiniOscillator;
  createGain(): MiniGain;
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

/**
 * 音效占位：优先 WebAudio / 微信 WebAudio 短振荡。
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
    const tone = sfxTone(id);
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = id === "shot" || id === "hit" ? "triangle" : "sine";
      osc.frequency.value = tone.freq;
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(tone.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.ms / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + tone.ms / 1000 + 0.02);
    } catch {
      return;
    }
  }

  private static context(): MiniAudioContext | undefined {
    if (!this.ctx) this.ctx = createContext();
    return this.ctx;
  }
}
