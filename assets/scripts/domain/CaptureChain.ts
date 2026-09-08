import type { StyleGrade } from "./StyleGrade";

export const CAPTURE_CHAIN_TIMEOUT_MS = 10_000;

export interface CaptureChainSnapshot {
  count: number;
  best: number;
  lastHighGradeAtMs: number;
}

export function createCaptureChain(): CaptureChainSnapshot {
  return { count: 0, best: 0, lastHighGradeAtMs: -Infinity };
}

export function advanceCaptureChain(
  previous: CaptureChainSnapshot,
  grade: StyleGrade,
  atMs: number,
  timeoutMs = CAPTURE_CHAIN_TIMEOUT_MS,
): CaptureChainSnapshot {
  const highGrade = grade === "A" || grade === "S";
  const inTime = atMs - previous.lastHighGradeAtMs <= timeoutMs;
  const count = highGrade ? (inTime ? previous.count + 1 : 1) : 0;
  return {
    count,
    best: Math.max(previous.best, count),
    lastHighGradeAtMs: highGrade ? atMs : -Infinity,
  };
}
