/**
 * Cocos 钓鱼音效。文件在 fishing-audio 分包，主包只留这段加载代码。
 * 速率和音量用 audio/mix.ts 里的原版数字。分包加载失败就保持安静。
 */
import { AudioClip, AudioSource, Node, assetManager } from "cc";
import { AUDIO_CLIPS } from "./bank";
import { reelDragRate, reelWindRate, strainGain, swishGain, swishRate } from "./mix";

export class FishingAudio {
  private readonly root: Node;
  private readonly clips = new Map<string, AudioClip>();
  private readonly loops = new Map<string, AudioSource>();
  private readonly shot: AudioSource;
  private sliceEnd = 0;
  private ready = false;
  private bailOpen = false;

  constructor(parent: Node) {
    this.root = new Node("FishingAudio");
    this.root.parent = parent;
    for (const id of ["reel_wind", "reel_drag", "line_strain"]) {
      this.loops.set(id, this.source(id, true));
    }
    this.shot = this.source("shot", false);
    this.load();
  }

  swish(power: number): void {
    this.play("rod_swish", swishRate(power), swishGain(power));
    this.play("line_out");
  }

  play(id: string, rate = 1, gain = 1): void {
    const clip = this.clips.get(id);
    const spec = AUDIO_CLIPS[id];
    if (!this.ready || !clip || !spec) return;
    const slice = spec.slices?.[Math.floor(Math.random() * spec.slices.length)];
    const start = slice ? slice[0] : 0;
    const length = slice ? slice[1] : 0;
    this.shot.stop();
    this.shot.clip = clip;
    this.shot.loop = false;
    this.shot.volume = Math.min(1, Math.max(0, gain));
    this.setRate(this.shot, rate);
    this.shot.play();
    this.shot.currentTime = start;
    this.sliceEnd = length > 0 ? start + length : 0;
  }

  tick(crank: number, payOut: number, tension: number, fighting: boolean, bailOpen: boolean): void {
    if (this.sliceEnd > 0 && this.shot.currentTime >= this.sliceEnd - 0.02) {
      this.shot.pause();
      this.sliceEnd = 0;
    }
    if (bailOpen !== this.bailOpen) {
      this.bailOpen = bailOpen;
      this.play("bail_click");
    }
    const strain = fighting ? strainGain(tension) : 0;
    this.loopAt("reel_wind", crank > 0.02, 0.85, reelWindRate(crank));
    this.loopAt("reel_drag", fighting && payOut > 0.02, 0.8, reelDragRate(Math.min(8, payOut)));
    this.loopAt("line_strain", strain > 0.001, strain, 1);
  }

  private load(): void {
    assetManager.loadBundle("fishing-audio", (error, bundle) => {
      if (error || !bundle) return;
      const ids = Object.keys(AUDIO_CLIPS);
      let left = ids.length;
      for (const id of ids) {
        const file = AUDIO_CLIPS[id].file.replace(/\.mp3$/, "");
        bundle.load(file, AudioClip, (loadError, clip) => {
          if (!loadError && clip) this.clips.set(id, clip);
          left -= 1;
          if (left === 0) this.ready = this.clips.size > 0;
        });
      }
    });
  }

  private source(name: string, loop: boolean): AudioSource {
    const node = new Node(name);
    node.parent = this.root;
    const src = node.addComponent(AudioSource);
    src.loop = loop;
    src.playOnAwake = false;
    src.volume = 0;
    return src;
  }

  private loopAt(id: string, on: boolean, volume: number, rate: number): void {
    const src = this.loops.get(id);
    const clip = this.clips.get(id);
    if (!src || !clip) return;
    src.volume = Math.min(1, Math.max(0, volume));
    this.setRate(src, rate);
    if (on && volume > 0.001) {
      if (!src.playing) {
        src.clip = clip;
        src.loop = true;
        src.play();
      }
    } else if (src.playing) src.pause();
  }

  /** Creator 3.8 的 AudioSource 类型没有 playbackRate。运行时有就跟上转速。 */
  private setRate(src: AudioSource, rate: number): void {
    const extra = src as AudioSource & { playbackRate?: number };
    if ("playbackRate" in extra) {
      const clamped = Math.min(4, Math.max(0.5, Number.isFinite(rate) ? rate : 1));
      extra.playbackRate = clamped;
    }
  }
}
