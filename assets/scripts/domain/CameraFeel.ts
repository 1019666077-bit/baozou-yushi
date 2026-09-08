/**
 * 2.5D 猎场相机。短、克制，低配关掉跟镜与微震。
 * 不挡下一步点击：跟镜 ≤0.35s 量级，震幅小于 0.12 世界单位。
 */
export interface CamPose {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
}

/** 猎场默认：略俯视码头，海在右侧。 */
export const CAM_REST: CamPose = {
  x: 0.3,
  y: 6.15,
  z: 8.9,
  pitch: -28,
  yaw: 9,
};

/** 港口日落机位，再近一点看清水域透视和市集层次。 */
export const HARBOR_CAM_REST: CamPose = {
  x: -0.15,
  y: 6.85,
  z: 10.9,
  pitch: -26,
  yaw: 13,
};

export const CAM_FEEL = {
  /** 抛竿跟线：镜头往海里送一点，很快回。 */
  yankPullZ: 0.72,
  yankPullX: 0.38,
  yankDropY: 0.14,
  yankPitch: -2.4,
  yankYaw: 1.5,
  /** 命中微震。低配为 0。 */
  smashSeconds: 0.22,
  smashAmp: 0.14,
  /** 翻扑跟镜：鱼在空中时略抬并低头看鱼，贴地立刻回。 */
  flopLiftY: 0.34,
  flopPullZ: 0.22,
  flopPitch: -1.7,
  /** 港口闲时轻晃，低配关。 */
  harborSway: 0.07,
};

export function yankCamK(fishX: number, targetX = -340, span = 420): number {
  const t = Math.min(1, Math.max(0, (fishX - targetX) / span));
  return Math.sin(t * Math.PI);
}

export function camYankOffset(k: number): { x: number; y: number; z: number; pitch: number; yaw: number } {
  return {
    x: CAM_FEEL.yankPullX * k,
    y: -CAM_FEEL.yankDropY * k,
    z: CAM_FEEL.yankPullZ * k,
    pitch: CAM_FEEL.yankPitch * k,
    yaw: CAM_FEEL.yankYaw * k,
  };
}

export function camSmashOffset(
  elapsed: number,
  duration = CAM_FEEL.smashSeconds,
  lowPower = false,
): { x: number; y: number; z: number; pitch: number } {
  if (lowPower || duration <= 0 || elapsed < 0 || elapsed >= duration) {
    return { x: 0, y: 0, z: 0, pitch: 0 };
  }
  const t = 1 - elapsed / duration;
  const amp = CAM_FEEL.smashAmp * t;
  return {
    x: Math.sin(elapsed * 68) * amp,
    y: Math.cos(elapsed * 86) * amp * 0.55,
    z: 0,
    pitch: Math.sin(elapsed * 74) * amp * 6,
  };
}

export function camFlopOffset(airborne: boolean): {
  x: number;
  y: number;
  z: number;
  pitch: number;
} {
  if (!airborne) return { x: 0, y: 0, z: 0, pitch: 0 };
  return { x: 0, y: CAM_FEEL.flopLiftY, z: -CAM_FEEL.flopPullZ, pitch: CAM_FEEL.flopPitch };
}

export function camHarborSway(elapsed: number, lowPower: boolean): { x: number; y: number } {
  if (lowPower) return { x: 0, y: 0 };
  return {
    x: Math.sin(elapsed * 0.35) * CAM_FEEL.harborSway,
    y: Math.cos(elapsed * 0.28) * CAM_FEEL.harborSway * 0.4,
  };
}

export function composeHuntCam(input: {
  rest?: CamPose;
  yankK?: number;
  airborne?: boolean;
  smashElapsed?: number;
  smashDuration?: number;
  lowPower?: boolean;
}): CamPose {
  const rest = input.rest ?? CAM_REST;
  const yank = camYankOffset(input.yankK ?? 0);
  const smash = camSmashOffset(
    input.smashElapsed ?? 1,
    input.smashDuration ?? CAM_FEEL.smashSeconds,
    input.lowPower === true,
  );
  const flop = input.lowPower
    ? { x: 0, y: 0, z: 0, pitch: 0 }
    : camFlopOffset(input.airborne === true);
  return {
    x: rest.x + yank.x + smash.x + flop.x,
    y: rest.y + yank.y + smash.y + flop.y,
    z: rest.z + yank.z + smash.z + flop.z,
    pitch: rest.pitch + yank.pitch + smash.pitch + flop.pitch,
    yaw: rest.yaw + yank.yaw,
  };
}

export function smashHoldSeconds(lowPower: boolean): number {
  return lowPower ? 0 : CAM_FEEL.smashSeconds;
}
