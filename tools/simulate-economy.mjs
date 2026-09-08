import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fish = JSON.parse(fs.readFileSync(path.join(root, "assets/config/fish.json"), "utf8"));
const islands = JSON.parse(fs.readFileSync(path.join(root, "assets/config/islands.json"), "utf8"));
const ORDER = [
  "island_foam_bay",
  "island_prism_reef",
  "island_storm_eye",
  "island_mist_bells",
  "island_molten_tide",
];

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
  let coins = 0;
  let stage = 0;
  let elapsedMinutes = 0;
  let fullBaselineUnlockMinutes = null;
  let runs = 0;
  let dailyCoinsAt15 = 0;
  let eligibleAdBonus = 0;
  let coinPackVisible = false;
  while (elapsedMinutes < 360 && fullBaselineUnlockMinutes === null) {
    const islandId = ORDER[stage];
    const pool = fish.filter((item) => item.islandId === islandId && item.tier !== "boss");
    const duration = 3.2 + stage * 0.45;
    const captures = Math.floor(2 + skill * 2 + rng() * 2);
    let earned = 0;
    for (let i = 0; i < captures; i += 1) {
      const target = pool[Math.floor(rng() * pool.length)];
      const style = Math.min(3, 1 + skill * 1.25 + (rng() - 0.5) * 0.4);
      earned += Math.round(
        target.basePrice * target.rarityMultiplier * (0.82 + rng() * 0.3) * style,
      );
    }
    coins += earned;
    if (runs >= 2 && runs < 5) eligibleAdBonus += Math.floor(earned * 0.5);
    elapsedMinutes += duration;
    runs += 1;
    if (elapsedMinutes <= 15) dailyCoinsAt15 += earned;
    const next = islands.find((item) => item.id === ORDER[stage + 1]);
    if (next && coins >= next.unlockCost) {
      coins -= next.unlockCost;
      stage += 1;
      if (stage >= 3) coinPackVisible = true;
      if (stage === ORDER.length - 1) fullBaselineUnlockMinutes = elapsedMinutes;
    }
  }
  return {
    id: `sim-${String(id + 1).padStart(2, "0")}`,
    skill: Number(skill.toFixed(2)),
    runs,
    fullBaselineUnlockMinutes,
    dailyCoinsAt15,
    coins,
    commercialScenario: {
      optionalRewardedBonus: eligibleAdBonus,
      coinPackVisible,
      smallestCoinPack: coinPackVisible ? 300 : 0,
    },
  };
}

const players = Array.from({ length: 50 }, (_, index) => simulatePlayer(index));
const unlocks = players
  .map((item) => item.fullBaselineUnlockMinutes ?? 360)
  .sort((a, b) => a - b);
const percentile = (values, p) =>
  Number(values[Math.min(values.length - 1, Math.floor(p * values.length))].toFixed(1));
const endlessRoundRewards = Array.from({ length: 20 }, (_, index) =>
  Math.round(100 * (1 + index * 0.04)),
);
const report = {
  generatedAt: new Date().toISOString(),
  kind: "automated_balance_simulation_not_human_playtest",
  simulatedPlayers: players.length,
  fullBaselineUnlockMinutes: {
    p10: percentile(unlocks, 0.1),
    median: percentile(unlocks, 0.5),
    p90: percentile(unlocks, 0.9),
  },
  daily15MinuteCoins: {
    median: percentile(players.map((item) => item.dailyCoinsAt15).sort((a, b) => a - b), 0.5),
  },
  endless: {
    firstRound: endlessRoundRewards[0],
    round20: endlessRoundRewards[19],
    linearStep: 4,
  },
  commercial: {
    rewardedBonusMedian: percentile(
      players
        .map((item) => item.commercialScenario.optionalRewardedBonus)
        .sort((a, b) => a - b),
      0.5,
    ),
    coinPackVisiblePlayers: players.filter(
      (item) => item.commercialScenario.coinPackVisible,
    ).length,
    note: "commercial values are reported separately and never alter baseline progression",
  },
  target: "baseline five-island unlock median 180–300 minutes; daily orders fit 15 minutes; endless reward is linear",
  players,
};

const reportDir = path.join(root, "reports");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "automated-balance-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify({
  fullBaselineUnlockMinutes: report.fullBaselineUnlockMinutes,
  daily15MinuteCoins: report.daily15MinuteCoins,
  endless: report.endless,
  commercial: report.commercial,
}));
