const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function validSave(save) {
  return (
    save &&
    save.schemaVersion === 1 &&
    Number.isInteger(save.revision) &&
    save.revision > 0 &&
    Number.isFinite(save.coins) &&
    save.coins >= 0 &&
    Array.isArray(save.tools) &&
    JSON.stringify(save).length < 32_000
  );
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const save = event.save;
  if (!validSave(save)) return { ok: false, error: "invalid_save" };

  const collection = db.collection("player_saves");
  const existing = await collection.where({ openid: OPENID }).limit(1).get();
  const current = existing.data[0];
  if (current && current.save.revision > save.revision) {
    return { ok: false, error: "revision_conflict", save: current.save };
  }
  const data = {
    openid: OPENID,
    save,
    updatedAt: db.serverDate(),
  };
  if (current) {
    await collection.doc(current._id).update({ data });
  } else {
    await collection.add({ data });
  }
  return { ok: true, revision: save.revision };
};
