/**
 * 钓鱼音效切片。时间来自 tidewater `src/audio/soundBank.js`。
 * 文件是 CC0 录音转成的 mp3，放在分包，不进主包。
 */
export interface AudioClip {
  file: string;
  loop?: boolean;
  slices?: readonly (readonly [number, number])[];
}

export const AUDIO_CLIPS: { [id: string]: AudioClip } = {
  reel_wind: { file: "reel_wind.mp3", loop: true },
  reel_drag: { file: "reel_drag.mp3", loop: true },
  line_strain: { file: "line_strain.mp3", loop: true },
  rod_swish: { file: "rod_swish.mp3", slices: [[0.08, 0.404], [0.564, 0.445], [1.089, 0.604], [1.773, 0.424], [2.277, 0.604]] },
  bail_click: { file: "bail_click.mp3", slices: [[0.08, 0.164], [0.324, 0.174], [0.578, 0.144], [0.802, 0.184]] },
  line_out: { file: "line_out.mp3", slices: [[0.08, 0.644]] },
  plop: { file: "plop.mp3", slices: [[0.08, 0.624], [0.784, 0.264]] },
  line_snap: { file: "line_snap.mp3", slices: [[0.08, 0.554], [0.714, 0.504], [1.298, 0.504], [1.882, 0.504]] },
  fish_splash: { file: "fish_splash.mp3", slices: [[0.08, 0.464], [0.624, 0.324], [1.028, 0.504], [1.612, 1.204], [2.896, 1.304]] },
  fish_flop: { file: "fish_flop.mp3", slices: [[0.08, 1.354], [1.514, 0.304], [1.898, 0.304], [2.282, 0.324]] },
  coins: { file: "coins.mp3", slices: [[0.08, 1.604]] },
  splash: { file: "splash.mp3", slices: [[0.08, 1.2]] },
};

export const AUDIO_IDS = Object.keys(AUDIO_CLIPS);
