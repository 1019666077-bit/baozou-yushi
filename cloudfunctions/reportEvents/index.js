const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const ALLOWED = new Set([
  "tutorial_start",
  "tutorial_finish",
  "cast",
  "fish_hooked",
  "fish_escaped",
  "fish_captured",
  "style_action",
  "run_finish",
  "upgrade_buy",
  "session_end",
]);

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const events = Array.isArray(event.events) ? event.events.slice(0, 100) : [];
  const valid = events.filter(
    (item) =>
      item &&
      ALLOWED.has(item.name) &&
      Number.isFinite(item.timestamp) &&
      JSON.stringify(item.payload ?? {}).length < 4_000,
  );
  if (!valid.length) return { ok: true, accepted: 0 };
  await db.collection("analytics_batches").add({
    data: {
      openid: OPENID,
      events: valid,
      createdAt: db.serverDate(),
    },
  });
  return { ok: true, accepted: valid.length };
};
