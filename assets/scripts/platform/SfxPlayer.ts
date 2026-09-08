import { sfxRecipe, type SfxId, type SfxTone } from "../domain/SfxFeel";
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
    const fromWx = createWechatAudioContext<MiniAudioContext>();
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
    playSynthRecipe(ctx, sfxRecipe(id), this.enabled);
  }

  private static context(): MiniAudioContext | undefined {
    if (!this.ctx) this.ctx = createContext();
    return this.ctx;
  }
}
