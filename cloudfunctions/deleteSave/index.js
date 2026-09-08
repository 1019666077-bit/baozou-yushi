const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: "missing_openid" };

  const removeOwned = async (collectionName) => {
    const result = await db
      .collection(collectionName)
      .where({ openid: OPENID })
      .remove();
    return result.stats?.removed ?? 0;
  };

  const saves = await removeOwned("player_saves");
  let scores = 0;
  let events = 0;
  try {
    scores = await removeOwned("leaderboard");
  } catch (error) {
    console.warn("deleteSave leaderboard skipped", error);
  }
  try {
    events = await removeOwned("analytics_batches");
  } catch (error) {
    console.warn("deleteSave analytics skipped", error);
  }
  return {
    ok: true,
    deleted: saves + scores + events,
    deletedByCollection: { saves, scores, events },
  };
};
