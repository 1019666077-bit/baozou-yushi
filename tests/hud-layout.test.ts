import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("fishing hud overlap contract", () => {
  it("hides talk buttons and the minimap during the fight and the catch card", () => {
    const css = fs.readFileSync(path.join(root, "tools/fishing-preview/hud.css"), "utf8");
    expect(css).toMatch(/body\.fighting #talks,\s*body\.fighting #map,\s*body\.card #talks,\s*body\.card #map \{ display: none !important; \}/);
    expect(css).toMatch(/\.fight \{[^}]*left: 12px; top: 64px;/);
    expect(css).not.toMatch(/bottom:\s*118px/);
  });

  it("hides the line whenever the bobber is hidden", () => {
    const preview = fs.readFileSync(path.join(root, "tools/fishing-preview/play.ts"), "utf8");
    const world = fs.readFileSync(path.join(root, "assets/scripts/fishing/FishingWorld.ts"), "utf8");
    expect(preview).toContain("const showLine = showBobber;");
    expect(preview).not.toContain('showLine = showBobber || rig.state === "landing"');
    expect(world).toContain("const showLine = show;");
    expect(world).not.toContain('showLine = show || rig.state === "landing"');
  });

  it("moves the creator tension bar off the lower center and hides the map", () => {
    const session = fs.readFileSync(path.join(root, "assets/scripts/fishing/FishingSession.ts"), "utf8");
    expect(session).toContain("node.setPosition(-420, 80)");
    expect(session).toContain('phase === "fighting" || phase === "hook" || phase === "card"');
  });

  it("checks idle, fight, card, and shop at the three viewports", () => {
    const overlap = fs.readFileSync(path.join(root, "tools/fishing-preview/hud-overlap.mjs"), "utf8");
    const validate = fs.readFileSync(path.join(root, "package.json"), "utf8");
    expect(overlap).toContain("375, 667");
    expect(overlap).toContain("414, 896");
    expect(overlap).toContain("768, 1024");
    for (const scene of ["idle", "fight", "card", "shop"]) expect(overlap).toContain(`"${scene}"`);
    expect(validate).toContain("hud:overlap");
  });
});
