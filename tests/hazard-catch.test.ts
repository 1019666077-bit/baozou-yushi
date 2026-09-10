import { describe, expect, it } from "vitest";
import {
  HAZARD_AIR_STYLE,
  harborPlayPrompt,
  hazardDeckPrompt,
  hazardEscapeSeconds,
  hazardGoneToast,
  hazardHuntPrompt,
  hazardQuote,
  hazardStyleMultiplier,
  hazardWinToast,
  isHazardFish,
  todaysHazardId,
} from "../assets/scripts/domain/HazardCatch";
import { PriceCalculator } from "../assets/scripts/domain/PriceCalculator";
import { RunSession } from "../assets/scripts/domain/RunSession";
import { createDefaultSave } from "../assets/scripts/domain/SaveMerge";
import { TUTORIAL_GATE, isTutorialRun } from "../assets/scripts/domain/TutorialFlow";

const bayfin = {
  id: "fish_bayfin",
  name: "湾鳍鱼",
  tier: "normal",
  islandId: "island_foam_bay",
  toughness: 24,
  speed: 70,
  basePrice: 8,
  rarityMultiplier: 1,
  weakPointMultiplier: 1.8,
  behavior: "cruise",
  escapeSeconds: 14,
} as const;

describe("搏货", () => {
  it("picks today's hazard from the island pool and keeps it stable for the day", () => {
    const pool = ["fish_bayfin", "fish_shellback", "elite_prism_sail"];
    const a = todaysHazardId(pool, "island_foam_bay", "2026-09-10");
    const b = todaysHazardId(pool, "island_foam_bay", "2026-09-10");
    const c = todaysHazardId(pool, "island_foam_bay", "2026-09-11");
    expect(pool).toContain(a);
    expect(a).toBe(b);
    expect(isHazardFish(a, a)).toBe(true);
    expect(isHazardFish("fish_bayfin", "elite_prism_sail")).toBe(false);
    expect(c === a || pool.includes(c)).toBe(true);
  });

  it("pays more only when the hazard fish is smashed in the air", () => {
    const safe = PriceCalculator.calculate(bayfin, 1, 1.34).total;
    const win = hazardQuote(bayfin, 1, 1.34, true);
    const miss = hazardQuote(bayfin, 1, 1.34, false);
    expect(win).toBeGreaterThan(safe);
    expect(miss).toBe(safe);
    expect(hazardStyleMultiplier(1.34, true)).toBeCloseTo(1.34 * HAZARD_AIR_STYLE);
    expect(hazardStyleMultiplier(3, true)).toBe(3);
  });

  it("shortens the escape window for hazard fish", () => {
    expect(hazardEscapeSeconds(14, false)).toBe(14);
    expect(hazardEscapeSeconds(14, true)).toBeLessThan(14);
    expect(hazardEscapeSeconds(14, true)).toBeGreaterThanOrEqual(4);
  });

  it("uses skill-stake copy, not wager or gacha words", () => {
    const joined = [
      harborPlayPrompt(),
      hazardHuntPrompt("湾鳍鱼"),
      hazardDeckPrompt(11, true),
      hazardDeckPrompt(11, false),
      hazardGoneToast(),
      hazardWinToast(17),
    ].join(" ");
    expect(joined).toMatch(/出海捕鱼|险货|空中砸|搏赢|跳海/);
    expect(joined).not.toMatch(/押注|赔率|老虎机|轮盘|抽奖|渔力全开|下注|赌场/i);
  });

  it("lets a new save sail immediately and pays hazard wins through the session", () => {
    expect(TUTORIAL_GATE).toBe(false);
    expect(createDefaultSave().tutorialComplete).toBe(true);
    expect(isTutorialRun("island_tutorial", false)).toBe(false);
    const session = new RunSession("run_h1", "island_foam_bay", "tool_rod", 1, 1);
    session.addStyle({ action: "airborne", atMs: 800, quality: 1 });
    const sold = session.capture(bayfin, 1, 1600, 1, {
      airborneCapture: true,
      hazardWin: true,
    });
    const plain = new RunSession("run_h0", "island_foam_bay", "tool_rod", 1, 1);
    plain.addStyle({ action: "airborne", atMs: 800, quality: 1 });
    const boxed = plain.capture(bayfin, 1, 1600, 1, {
      airborneCapture: true,
      hazardWin: false,
    });
    expect(sold.price).toBeGreaterThan(boxed.price);
    expect(sold.airborneCapture).toBe(true);
  });
});
