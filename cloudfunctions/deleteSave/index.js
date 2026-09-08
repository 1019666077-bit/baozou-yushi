const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: "missing_openid" };

  const result = await db
    .collection("player_saves")
    .where({ openid: OPENID })
    .remove();
  return { ok: true, deleted: result.stats?.removed ?? 0 };
};
