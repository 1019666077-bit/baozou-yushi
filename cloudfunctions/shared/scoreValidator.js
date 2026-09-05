function validateRun(run, fishConfigs, toolConfigs) {
  const reasons = [];
  if (!run) {
    return { valid: false, reasons: ["invalid_payload"], acceptedScore: 0 };
  }
  const duration = run.finishedAt - run.startedAt;
  if (duration < 15_000 || duration > 15 * 60_000) {
    reasons.push("invalid_duration");
  }
  if (run.bestMultiplier < 1 || run.bestMultiplier > 3) {
    reasons.push("invalid_multiplier");
  }
  if (!Array.isArray(run.fish) || run.fish.length > Math.ceil(duration / 2_000) + 3) {
    reasons.push("impossible_capture_rate");
  }
  const tool = (toolConfigs ?? []).find((entry) => entry.id === run.toolId);
  if (!tool?.levels?.some((entry) => entry.level === run.toolLevel)) {
    reasons.push("invalid_tool");
  }

  const fishMap = new Map((fishConfigs ?? []).map((item) => [item.id, item]));
  let theoreticalMax = 0;
  for (const capture of run.fish ?? []) {
    const item = fishMap.get(capture.fishId);
    if (!item) {
      reasons.push("unknown_fish");
      continue;
    }
    if (capture.styleMultiplier < 1 || capture.styleMultiplier > 3) {
      reasons.push("invalid_capture_multiplier");
    }
    theoreticalMax += Math.ceil(item.basePrice * item.rarityMultiplier * 1.2 * 3);
  }
  if (run.totalCoins < 0 || run.totalCoins > theoreticalMax) {
    reasons.push("impossible_total");
  }
  const reportedTotal = (run.fish ?? []).reduce((sum, item) => sum + item.price, 0);
  if (reportedTotal !== run.totalCoins) reasons.push("total_mismatch");

  return {
    valid: reasons.length === 0,
    reasons: [...new Set(reasons)],
    acceptedScore: reasons.length === 0 ? Math.round(run.bestMultiplier * 100) : 0,
  };
}

module.exports = { validateRun };
