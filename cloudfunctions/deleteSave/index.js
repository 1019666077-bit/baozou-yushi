const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function removeByOpenId(collectionName, openid) {
  const collection = db.collection(collectionName);
  const existing = await collection.where({ openid }).limit(20).get();
  for (const doc of existing.data ?? []) {
    await collection.doc(doc._id).remove();
  }
  return existing.data?.length ?? 0;
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const saves = await removeByOpenId("player_saves", OPENID);
  let scores = 0;
  let events = 0;
  try {
    scores = await removeByOpenId("leaderboard", OPENID);
  } catch (error) {
    console.warn("deleteSave leaderboard skipped", error);
  }
  try {
    events = await removeByOpenId("analytics_batches", OPENID);
  } catch (error) {
    console.warn("deleteSave analytics skipped", error);
  }
  return { ok: true, deleted: { saves, scores, events } };
};
