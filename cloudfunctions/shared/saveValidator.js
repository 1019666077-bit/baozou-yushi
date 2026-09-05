const { islands, tools, fish } = require("./gameCatalog");

const ISLAND_IDS = new Set(islands);
const TOOL_IDS = new Set(tools.map((item) => item.id));
const FISH_IDS = new Set(fish.map((item) => item.id));
const MAX_LEVEL = 3;

function validSave(save) {
  if (!save || save.schemaVersion !== 1) return false;
  if (!Number.isInteger(save.revision) || save.revision <= 0) return false;
  if (!Number.isFinite(save.coins) || save.coins < 0 || save.coins > 1_000_000_000) {
    return false;
  }
  if (JSON.stringify(save).length >= 32_000) return false;
  if (!Array.isArray(save.tools) || save.tools.length === 0 || save.tools.length > 8) {
    return false;
  }
  for (const entry of save.tools) {
    if (!entry || !TOOL_IDS.has(entry.toolId)) return false;
    if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > MAX_LEVEL) {
      return false;
    }
  }
  if (!Array.isArray(save.unlockedIslands) || save.unlockedIslands.length === 0) {
    return false;
  }
  if (!save.unlockedIslands.every((id) => ISLAND_IDS.has(id))) return false;
  if (!Array.isArray(save.discoveredFish)) return false;
  if (!save.discoveredFish.every((id) => FISH_IDS.has(id))) return false;
  if (typeof save.tutorialComplete !== "boolean") return false;
  if (
    save.completedRuns !== undefined &&
    (!Number.isInteger(save.completedRuns) || save.completedRuns < 0)
  ) {
    return false;
  }
  if (
    save.bestStyleScore !== undefined &&
    (!Number.isFinite(save.bestStyleScore) || save.bestStyleScore < 0)
  ) {
    return false;
  }
  return true;
}

module.exports = { validSave, ISLAND_IDS, TOOL_IDS, FISH_IDS };
