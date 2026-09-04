const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const fallback = {
  version: 1,
  minClientVersion: "0.1.0",
  stylePointScale: 1,
  economyScale: 1,
  disabledIslands: [],
  notice: "",
};

exports.main = async () => {
  const result = await db
    .collection("remote_config")
    .where({ key: "production" })
    .limit(1)
    .get();
  return { config: result.data[0]?.value ?? fallback };
};
