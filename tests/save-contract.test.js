import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  validSave,
  revisionConflict,
} = require("../cloudfunctions/saveGame/save-contract.js");

const schema3 = {
  schemaVersion: 3,
  revision: 4,
  updatedAt: 1_000,
  coins: 20,
  unlockedIslands: ["island_foam_bay"],
  tools: [{ toolId: "tool_rod", level: 5 }],
  discoveredFish: [],
  settings: { sfx: true },
};

describe("saveGame contract", () => {
  it("accepts schema 3 and rejects legacy or invalid levels", () => {
    expect(validSave(schema3)).toBe(true);
    expect(validSave({ ...schema3, schemaVersion: 1 })).toBe(false);
    expect(
      validSave({
        ...schema3,
        tools: [{ toolId: "tool_rod", level: 6 }],
      }),
    ).toBe(false);
  });

  it("rejects stale and equal revisions as conflicts", () => {
    expect(revisionConflict(schema3, { ...schema3, revision: 3 })).toBe(true);
    expect(revisionConflict(schema3, schema3)).toBe(true);
    expect(revisionConflict(schema3, { ...schema3, revision: 5 })).toBe(false);
  });
});
