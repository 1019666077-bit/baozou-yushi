/**
 * 港口已定：现代早市码头。仅 2D 代理。2D/辅助 ≠ Creator 3D。
 */

const HARBOR_SRC = "./looks/morning.jpg";
let harborImage = null;

export function preloadHarborLooks() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      harborImage = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = HARBOR_SRC;
  });
}

export function paintHarborBackdrop(ctx) {
  if (!harborImage) {
    ctx.fillStyle = "#083044";
    ctx.fillRect(0, 0, 1280, 720);
    return;
  }
  ctx.drawImage(harborImage, 0, 0, 1280, 720);
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
