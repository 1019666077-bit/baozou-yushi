import { createRequire } from "node:module";
import type { FishConfig, RunSummary, ToolConfig } from "../../assets/scripts/data/types";

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
  acceptedScore: number;
}

const require = createRequire(import.meta.url);
const impl = require("./scoreValidator.js") as {
  validateRun: (
    run: RunSummary,
    fishConfigs: FishConfig[],
    toolConfigs: ToolConfig[],
  ) => ValidationResult;
};

/** 与 cloudfunctions/shared/scoreValidator.js 同一份实现，供测试与云函数共用。 */
export function validateRun(
  run: RunSummary,
  fishConfigs: FishConfig[],
  toolConfigs: ToolConfig[],
): ValidationResult {
  return impl.validateRun(run, fishConfigs, toolConfigs);
}
