/**
 * 港口背景备选：完整渔市插画，不再用色块山/三角屋。
 * 仅 2D 代理。2D/辅助 ≠ Creator 3D。
 */

export const HARBOR_LOOKS = [
  { id: "morning", name: "早市码头", blurb: "晴海、晒鱼、白墙村", src: "./looks/morning.jpg" },
  { id: "dusk", name: "黄昏渔村", blurb: "晚霞、灯笼、炊烟", src: "./looks/dusk.jpg" },
  { id: "night", name: "夜灯鱼市", blurb: "月牙、灯火、倒影", src: "./looks/night.jpg" },
];

export const DEFAULT_HARBOR_LOOK = "morning";
const LOOK_KEY = "baozou-harbor-look";
const LEGACY = { noon: "morning", peach: "dusk", lantern: "night", mist: "morning" };

const cache = new Map();

export function readHarborLook() {
  try {
    const saved = localStorage.getItem(LOOK_KEY);
    const mapped = LEGACY[saved] ?? saved;
    if (HARBOR_LOOKS.some((look) => look.id === mapped)) return mapped;
  } catch {
    /* ignore */
  }
  return DEFAULT_HARBOR_LOOK;
}

export function writeHarborLook(id) {
  try {
    localStorage.setItem(LOOK_KEY, id);
  } catch {
    /* ignore */
  }
}

export function preloadHarborLooks() {
  return Promise.all(
    HARBOR_LOOKS.map(
      (look) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            cache.set(look.id, img);
            resolve(img);
          };
          img.onerror = () => resolve(null);
          img.src = look.src;
        }),
    ),
  );
}

export function paintHarborBackdrop(ctx, _phase, lookId) {
  const img = cache.get(lookId);
  if (!img) {
    ctx.fillStyle = "#083044";
    ctx.fillRect(0, 0, 1280, 720);
    return;
  }
  ctx.drawImage(img, 0, 0, 1280, 720);
  const top = ctx.createLinearGradient(0, 0, 0, 140);
  top.addColorStop(0, "rgba(8, 16, 28, 0.28)");
  top.addColorStop(1, "rgba(8, 16, 28, 0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, 1280, 160);
  const bot = ctx.createLinearGradient(0, 560, 0, 720);
  bot.addColorStop(0, "rgba(8, 16, 28, 0)");
  bot.addColorStop(1, "rgba(8, 16, 28, 0.18)");
  ctx.fillStyle = bot;
  ctx.fillRect(0, 540, 1280, 180);
}
