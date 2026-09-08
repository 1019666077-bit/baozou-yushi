import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("commercial runtime wiring", () => {
  it("passes weekly rules into a dedicated seeded 180-second runtime", () => {
    const home = read("assets/scripts/RuntimeHome.ts");
    const runtime = read("assets/scripts/RuntimePrototype.ts");
    expect(home).toContain("weeklyRules: rules");
    expect(runtime).toContain("private tickWeeklyWave");
    expect(runtime).toContain("this.weeklyRandom.pick(rules.fishPool)");
    expect(runtime).toContain("rules.durationSeconds - this.runElapsed");
  });

  it("preserves weekly ad suppression through settlement", () => {
    const home = read("assets/scripts/RuntimeHome.ts");
    expect(home).toContain("this.showSettle(summary, false, true)");
    expect(home).toContain("adGrants.showInterstitial(weekly)");
  });

  it("uses endless state for round completion, withdrawal, and failure", () => {
    const runtime = read("assets/scripts/RuntimePrototype.ts");
    expect(runtime).toContain("completeEndlessRound(this.endlessState)");
    expect(runtime).toContain("failEndlessRound(this.endlessState)");
    expect(runtime).toContain("withdrawEndless(this.endlessState)");
    expect(runtime).toContain("totalCoins: this.endlessState.bankedCoins");
  });

  it("keeps Basic Launch ads behind an immutable source gate", () => {
    const bootstrap = read("assets/scripts/platform/CocosPlatformBootstrap.ts");
    expect(bootstrap).toContain("export const BASIC_LAUNCH = true");
    expect(bootstrap).toContain("!BASIC_LAUNCH &&");
  });

  it("puts runtime-created UI nodes on the Canvas camera layer", () => {
    const runtimeUi = read("assets/scripts/ui/RuntimeUi.ts");
    const grayArt = read("assets/scripts/ui/GrayArt.ts");
    expect(runtimeUi.match(/node\.layer = parent\.layer/g)).toHaveLength(3);
    expect(grayArt).toContain("background.layer = parent.layer");
  });

  it("keeps the complete 16:9 UI visible at narrower embed ratios", () => {
    const project = JSON.parse(read("settings/v2/packages/project.json"));
    const template = read("build-templates/web-desktop/index.ejs");
    expect(project.general.designResolution.fitWidth).toBe(true);
    expect(project.general.designResolution.fitHeight).toBe(true);
    expect(template).toContain('cc_exact_fit_screen="true"');
    expect(template).toContain("width: 100vw !important");
    expect(template).toContain("height: 100vh !important");
  });
});
