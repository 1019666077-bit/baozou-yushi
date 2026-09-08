import { describe, expect, it } from "vitest";
import {
  analyzeCrazyGames,
  analyzeGoogleTesters,
  analyzePlaytest,
  evaluateLaunchReadiness,
  parseCsv,
} from "../tools/lib/release-rules.mjs";

describe("release CSV parser", () => {
  it("supports quoted commas and escaped quotes", () => {
    expect(parseCsv('id,feedback\nT01,"clear, but ""hard"""\n')).toEqual([
      { id: "T01", feedback: 'clear, but "hard"' },
    ]);
  });

  it("keeps a header-only template empty", () => {
    expect(parseCsv("id,date\n")).toEqual([]);
  });
});

describe("CrazyGames Basic metrics", () => {
  it("passes exactly at every internal boundary", () => {
    const rows = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      plays: index === 0 ? 74 : 71,
      oneMinutePlayers: index === 0 ? 64 : 56,
      totalPlaySeconds: 7_200,
      d1Eligible: index === 0 ? 50 : 0,
      d1Returned: index === 0 ? 6 : 0,
    }));
    const result = analyzeCrazyGames(rows);
    expect(result.metrics.plays).toBe(500);
    expect(result.metrics.oneMinuteConversionRate).toBe(0.8);
    expect(result.metrics.d1RetentionRate).toBe(0.12);
    expect(result.passed).toBe(true);
    expect(result.decisionNote).toContain("actual Full Launch decision");
  });

  it("rejects empty, invalid, and internally impossible data", () => {
    expect(analyzeCrazyGames([]).passed).toBe(false);
    const result = analyzeCrazyGames([{
      date: "2026-02-30",
      plays: 1,
      oneMinutePlayers: 2,
      totalPlaySeconds: -1,
      d1Eligible: 0,
      d1Returned: 1,
    }]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Google closed testing", () => {
  const tester = (index, overrides = {}) => ({
    testerId: `anon-${index}`,
    optInDate: "2026-08-01",
    optOutDate: "2026-08-14",
    feedback: "Actual feedback recorded",
    build: "100",
    ...overrides,
  });

  it("counts exactly 14 inclusive calendar days", () => {
    const result = analyzeGoogleTesters(
      Array.from({ length: 12 }, (_, index) => tester(index)),
      "2026-08-14",
    );
    expect(result.eligibleContinuous14DayTesters).toBe(12);
    expect(result.passed).toBe(true);
  });

  it("rejects 13 days, missing feedback, and duplicate IDs", () => {
    const rows = Array.from({ length: 12 }, (_, index) => tester(index));
    rows[0].optOutDate = "2026-08-13";
    rows[1].feedback = "";
    rows[2].testerId = rows[3].testerId;
    const result = analyzeGoogleTesters(rows, "2026-08-14");
    expect(result.passed).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.eligibleContinuous14DayTesters).toBe(11);
  });

  it("fails a header-only/empty template", () => {
    expect(analyzeGoogleTesters([], "2026-08-14").passed).toBe(false);
  });
});

describe("human playtest analysis", () => {
  const row = (index, overrides = {}) => ({
    tester_id: `T${index}`,
    first_capture_seconds: index < 10 ? "59" : "60",
    tutorial_finished: index < 14 ? "yes" : "no",
    understood_value_rule: index < 12 ? "true" : "false",
    reached_run_3: index < 8 ? "1" : "0",
    p0_count: "0",
    ...overrides,
  });

  it("passes exact rate thresholds and reports the even median", () => {
    const result = analyzePlaytest(Array.from({ length: 20 }, (_, index) => row(index)));
    expect(result.metrics.firstCaptureMedianSeconds).toBe(59.5);
    expect(result.metrics.tutorialCompletionRate).toBe(0.7);
    expect(result.metrics.understoodValueRuleRate).toBe(0.6);
    expect(result.metrics.thirdRunReachRate).toBe(0.4);
    expect(result.passed).toBe(true);
  });

  it("fails empty data and any P0", () => {
    expect(analyzePlaytest([]).passed).toBe(false);
    const rows = Array.from({ length: 20 }, (_, index) => row(index));
    rows[19].p0_count = "1";
    expect(analyzePlaytest(rows).gates.noP0).toBe(false);
  });
});

describe("launch readiness aggregation", () => {
  it("fails closed and lists every missing category", () => {
    const result = evaluateLaunchReadiness({
      automatedTestsPassed: false,
      webBuild: { exists: false, bytes: 0 },
      androidAab: { exists: false, bytes: 0 },
      storeAssetsReady: false,
      privacyReady: false,
      sdkConfigured: false,
      playtest: { passed: false },
      crazygames: { passed: false },
      googleTesters: { passed: false },
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toHaveLength(10);
    expect(result.disclaimer).toContain("does not claim");
  });
});
