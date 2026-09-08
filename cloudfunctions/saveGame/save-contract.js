"use strict";

function validSave(save) {
  return (
    save &&
    save.schemaVersion === 3 &&
    Number.isInteger(save.revision) &&
    save.revision > 0 &&
    Number.isFinite(save.updatedAt) &&
    Number.isFinite(save.coins) &&
    save.coins >= 0 &&
    Array.isArray(save.unlockedIslands) &&
    Array.isArray(save.tools) &&
    save.tools.every(
      (tool) =>
        tool &&
        typeof tool.toolId === "string" &&
        Number.isInteger(tool.level) &&
        tool.level >= 1 &&
        tool.level <= 5,
    ) &&
    Array.isArray(save.discoveredFish) &&
    save.settings &&
    typeof save.settings === "object" &&
    JSON.stringify(save).length < 32_000
  );
}

function revisionConflict(current, incoming) {
  return !!current && current.revision >= incoming.revision;
}

module.exports = { validSave, revisionConflict };
