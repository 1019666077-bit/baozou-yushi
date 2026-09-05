import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fish = JSON.parse(
  fs.readFileSync(path.join(root, "assets/config/fish.json"), "utf8"),
);

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function simulatePlayer(id) {
  const rng = random(10_000 + id * 977);
  const skill = 0.35 + (id / 49) * 0.6;
  // 教学首售 11 金入账后再进泡沫湾。改前从 0 起算，会假装练潮码头没发生。
  let coins = 11;
  let elapsedMinutes = 0;
  let prismUnlockedAt = null;
  let stormUnlockedAt = null;
  let firstRodAt = null;
  let stage = "foam";
  let rodUpgradeBought = false;
  let cannonBought = false;
  let harpoonBought = false;
  let runs = 0;
  let multiplierTotal = 0;
  let totalCaptures = 0;

  while (elapsedMinutes < 45 && stormUnlockedAt === null) {
    const pool =
      stage === "foam"
        ? fish.filter((item) => item.islandId === "island_foam_bay")
        : stage === "prism"
          ? fish.filter((item) => item.islandId === "island_prism_reef")
          : fish.filter(
              (item) =>
                item.islandId === "island_storm_eye" && item.tier !== "boss",
            );
    const duration = stage === "foam" ? 3 : stage === "prism" ? 3.7 : 4.5;
    const captures = Math.floor(2 + skill * 2 + rng() * 2);
    totalCaptures += captures;
    let runCoins = 0;
    for (let i = 0; i < captures; i += 1) {
      const normalPool = pool.filter((item) => item.tier === "normal");
      const elitePool = pool.filter((item) => item.tier === "elite");
      const chosenPool =
        elitePool.length && rng() < 0.12 ? elitePool : normalPool;
      const target = chosenPool[Math.floor(rng() * chosenPool.length)];
      const multiplier = Math.min(
        3,
        1 + skill * 1.35 + (rng() - 0.5) * 0.45,
      );
      multiplierTotal += multiplier;
      runCoins += Math.round(
        target.basePrice *
          target.rarityMultiplier *
          (0.85 + rng() * 0.3) *
          multiplier,
      );
    }
    coins += runCoins;
    elapsedMinutes += duration;
    runs += 1;
    if (!rodUpgradeBought && coins >= 90) {
      coins -= 90;
      rodUpgradeBought = true;
      firstRodAt = elapsedMinutes;
    }
    if (stage === "foam" && coins >= 240) {
      coins -= 240;
      stage = "prism";
      prismUnlockedAt = elapsedMinutes;
    }
    if (stage === "prism" && !cannonBought && coins >= 120) {
      coins -= 120;
      cannonBought = true;
    }
    if (stage === "prism" && cannonBought && !harpoonBought && coins >= 260) {
      coins -= 260;
      harpoonBought = true;
    }
    if (stage === "prism" && harpoonBought && coins >= 680) {
      coins -= 680;
      stage = "storm";
      stormUnlockedAt = elapsedMinutes;
    }
  }

  return {
    id: `sim-${String(id + 1).padStart(2, "0")}`,
    skill: Number(skill.toFixed(2)),
    runs,
    firstRodAt,
    prismUnlockedAt,
    stormUnlockedAt,
    coins,
    averageStyleMultiplier: Number(
      (multiplierTotal / Math.max(1, totalCaptures)).toFixed(2),
    ),
  };
}

const players = Array.from({ length: 50 }, (_, index) => simulatePlayer(index));
const values = players.map((item) => item.stormUnlockedAt ?? 45).sort((a, b) => a - b);
const rodValues = players
  .map((item) => item.firstRodAt ?? 45)
  .sort((a, b) => a - b);
const percentile = (p, list = values) =>
  Number(
    list[Math.min(list.length - 1, Math.floor(p * list.length))].toFixed(1),
  );
const report = {
  generatedAt: new Date().toISOString(),
  kind: "automated_balance_simulation_not_human_playtest",
  simulatedPlayers: players.length,
  tutorialSaleCoins: 11,
  firstRodMinutes: {
    p10: percentile(0.1, rodValues),
    median: percentile(0.5, rodValues),
    p90: percentile(0.9, rodValues),
  },
  stormUnlockMinutes: {
    p10: percentile(0.1),
    median: percentile(0.5),
    p90: percentile(0.9),
  },
  target: "22–34 minutes to unlock Storm Eye",
  economyNote:
    "C：教学入账 11 后再进泡沫湾。标价 11/90 未改。风眼中位应仍落在 22–34。",
  players,
};

const reportDir = path.join(root, "reports");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "automated-balance-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    firstRodMinutes: report.firstRodMinutes,
    stormUnlockMinutes: report.stormUnlockMinutes,
  }),
);
