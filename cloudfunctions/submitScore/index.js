const cloud = require("wx-server-sdk");
const { validateRun } = require("../shared/scoreValidator");
const { fish, tools } = require("../shared/gameCatalog");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const run = event.run;
  if (!run || JSON.stringify(run).length > 64_000) {
    return { ok: false, reasons: ["invalid_payload"] };
  }
  const result = validateRun(run, fish, tools);
  if (!result.valid) return { ok: false, reasons: result.reasons };

  const score = result.acceptedScore;
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
