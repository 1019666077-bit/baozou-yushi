const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const result = await db
    .collection("player_saves")
    .where({ openid: OPENID })
    .limit(1)
    .get();
  return { save: result.data[0]?.save ?? null };
};
