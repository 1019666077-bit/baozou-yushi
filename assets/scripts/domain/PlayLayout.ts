/**
 * 半屏操作约定：主要交互落在设计分辨率下半屏，上半留给海/岛。
 * RuntimePrototype 与文档共用，避免左右全高垫再挡透视。
 */
export const PLAY_LAYOUT = {
  designW: 1280,
  designH: 720,
  /** 设计坐标：中线 y=0，下半屏 y<0。 */
  actionTopY: 0,
  actionBottomY: -360,
  movePad: { x: -320, y: -180, w: 640, h: 360 },
  aimPad: { x: 320, y: -180, w: 640, h: 360 },
  barY: -292,
} as const;

export function inActionBand(y: number): boolean {
  return y <= PLAY_LAYOUT.actionTopY && y >= PLAY_LAYOUT.actionBottomY;
}

export function clampToActionBand(
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: Math.min(620, Math.max(-620, x)),
    y: Math.min(PLAY_LAYOUT.actionTopY - 8, Math.max(PLAY_LAYOUT.actionBottomY + 24, y)),
  };
}

export function actionBandCaption(): string {
  return "主操作在下半屏：左移船，右瞄准，扛鱼后拖去鱼箱。";
}
