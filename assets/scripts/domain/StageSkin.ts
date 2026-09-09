/**
 * 运行时自绘小贴图（木板条 / 水纹）。原创程序像素，不进包体、不引用竞品。
 */
export const RUNTIME_TEX_SIZE = 64;

export type AlbedoPixels = {
  width: number;
  height: number;
  data: Uint8Array;
};

function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 45.164) * 43758.5453;
  return n - Math.floor(n);
}

/** 纵向木板条：深缝 + 深浅板 + 细木纹。 */
export function paintWoodAlbedo(size = RUNTIME_TEX_SIZE): AlbedoPixels {
  const n = Math.max(16, Math.min(128, size));
  const data = new Uint8Array(n * n * 4);
  const planks = 6;
  const plankW = n / planks;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const p = Math.floor(x / plankW);
      const local = x - p * plankW;
      const seam = local < 1.6 || local > plankW - 1.2;
      const grain = Math.sin(y * 0.55 + p * 1.7) * 10 + hash2(x, y, p) * 14;
      const odd = p % 2 === 0;
      let r = odd ? 214 : 186;
      let g = odd ? 154 : 118;
      let b = odd ? 88 : 62;
      r = Math.max(0, Math.min(255, Math.round(r + grain)));
      g = Math.max(0, Math.min(255, Math.round(g + grain * 0.7)));
      b = Math.max(0, Math.min(255, Math.round(b + grain * 0.4)));
      if (seam) {
        r = 72;
        g = 42;
        b = 22;
      }
      const i = (y * n + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width: n, height: n, data };
}

/** 水纹：横带 + 碎浪白边，给大板水面当 albedo。 */
export function paintWaterAlbedo(size = RUNTIME_TEX_SIZE): AlbedoPixels {
  const n = Math.max(16, Math.min(128, size));
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const band = 0.5 + 0.5 * Math.sin(y * 0.28 + x * 0.05);
      const chop = 0.5 + 0.5 * Math.sin(x * 0.41 - y * 0.19);
      const foam = Math.sin(x * 0.9 + y * 0.35) * Math.sin(y * 0.22);
      const speckle = hash2(x, y, 3) * 0.12;
      const t = Math.min(1, Math.max(0, band * 0.55 + chop * 0.3 + speckle));
      let r = Math.round(18 + t * 70);
      let g = Math.round(88 + t * 90);
      let b = Math.round(118 + t * 80);
      if (foam > 0.62) {
        r = Math.min(255, r + 90);
        g = Math.min(255, g + 80);
        b = Math.min(255, b + 55);
      }
      const i = (y * n + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3]  = 255;
    }
  }
  return { width: n, height: n, data };
}

export function albedoContrast(pixels: AlbedoPixels): number {
  let min = 255;
  let max = 0;
  for (let i = 0; i < pixels.data.length; i += 4) {
    const l = (pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3;
    if (l < min) min = l;
    if (l > max) max = l;
  }
  return max - min;
}
