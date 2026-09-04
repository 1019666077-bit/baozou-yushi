const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const FISH_MAX = {
  fish_bayfin: 29,
  fish_shellback: 53,
  fish_silver_ribbon: 80,
  fish_lantern_pod: 112,
  fish_ember_eel: 156,
  fish_reef_hopper: 194,
  elite_prism_sail: 328,
  elite_iron_jaw: 540,
  elite_tempest_ray: 835,
  boss_tide_singer: 3456,
};

const TOOL_LEVELS = {
  tool_rod: 3,
  tool_cannon: 3,
  tool_harpoon: 3,
};

function validate(run) {
  const reasons = [];
  const duration = run.finishedAt - run.startedAt;
  if (duration < 15_000 || duration > 900_000) reasons.push("invalid_duration");
  if (run.bestMultiplier < 1 || run.bestMultiplier > 3) {
    reasons.push("invalid_multiplier");
  }
  if (!TOOL_LEVELS[run.toolId] || run.toolLevel > TOOL_LEVELS[run.toolId]) {
    reasons.push("invalid_tool");
  }
  if (!Array.isArray(run.fish) || run.fish.length > Math.ceil(duration / 2_000) + 3) {
    reasons.push("impossible_capture_rate");
  }
  let reportedTotal = 0;
  let theoreticalMax = 0;
  for (const item of run.fish ?? []) {
    if (!FISH_MAX[item.fishId]) reasons.push("unknown_fish");
    if (item.styleMultiplier < 1 || item.styleMultiplier > 3) {
      reasons.push("invalid_capture_multiplier");
    }
    reportedTotal += item.price;
    theoreticalMax += FISH_MAX[item.fishId] ?? 0;
  }
  if (reportedTotal !== run.totalCoins) reasons.push("total_mismatch");
  if (run.totalCoins < 0 || run.totalCoins > theoreticalMax) {
    reasons.push("impossible_total");
  }
  return [...new Set(reasons)];
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const run = event.run;
  if (!run || JSON.stringify(run).length > 64_000) {
    return { ok: false, reasons: ["invalid_payload"] };
  }
  const reasons = validate(run);
  if (reasons.length) return { ok: false, reasons };

  const score = Math.round(run.bestMultiplier * 100);
  await db.collection("leaderboard").add({
    data: {
      openid: OPENID,
      score,
      runId: run.runId,
      islandId: run.islandId,
      createdAt: db.serverDate(),
    },
  });
  try {
    await cloud.openapi.storage.setUserStorage({
      openid: OPENID,
      kvList: [
        {
          key: "best_style",
          value: JSON.stringify({
            wxgame: {
              score,
              update_time: Math.floor(Date.now() / 1000),
            },
          }),
        },
      ],
    });
  } catch (error) {
    console.warn("friend leaderboard upload failed", error);
  }
  return { ok: true, score };
};
