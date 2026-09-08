const cloud = require("wx-server-sdk");
const { validSave, revisionConflict } = require("./save-contract");
const { islands, tools, fish } = require("../shared/gameCatalog");

const ISLAND_IDS = new Set(islands);
const TOOL_IDS = new Set(tools.map((item) => item.id));
const FISH_IDS = new Set(fish.map((item) => item.id));

function validCatalogReferences(save) {
  return (
    save.coins <= 1_000_000_000 &&
    typeof save.tutorialComplete === "boolean" &&
    save.unlockedIslands.length <= ISLAND_IDS.size &&
    save.unlockedIslands.every((id) => ISLAND_IDS.has(id)) &&
    save.tools.length > 0 &&
    save.tools.length <= TOOL_IDS.size &&
    save.tools.every((entry) => TOOL_IDS.has(entry.toolId)) &&
    save.discoveredFish.length <= FISH_IDS.size &&
    save.discoveredFish.every((id) => FISH_IDS.has(id))
  );
}

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: "missing_openid" };
  const save = event?.save;
  if (!validSave(save) || !validCatalogReferences(save)) {
    return { ok: false, error: "invalid_save" };
  }

  const collection = db.collection("player_saves");
  const existing = await collection.where({ openid: OPENID }).limit(1).get();
  const current = existing.data[0];
  if (
    current?.save?.revision === save.revision &&
    JSON.stringify(current.save) === JSON.stringify(save)
  ) {
    return { ok: true, revision: save.revision, idempotent: true };
  }
  if (current && revisionConflict(current.save, save)) {
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
