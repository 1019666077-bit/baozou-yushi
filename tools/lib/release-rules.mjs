const TRUE = /^(1|true|yes|y)$/i;

export function parseCsv(text) {
  const records = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      records.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    records.push(row);
  }
  const nonEmpty = records.filter((record) => record.some((cell) => cell.trim()));
  if (!nonEmpty.length) return [];
  const headers = nonEmpty[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error("CSV header contains an empty name");
  return nonEmpty.slice(1).map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index]?.trim() ?? ""])),
  );
}

export function parseRows(text, extension = ".csv") {
  if (extension.toLowerCase() === ".json") {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("JSON input must be an array");
    return parsed;
  }
  return parseCsv(text);
}

function finiteNonNegative(value, label, errors, integer = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) {
    errors.push(`${label} must be a non-negative${integer ? " integer" : " number"}`);
    return 0;
  }
  return number;
}

function isoDay(value, label, errors) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    errors.push(`${label} must use YYYY-MM-DD`);
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    errors.push(`${label} is not a valid date`);
    return null;
  }
  return date;
}

const daysBetween = (start, end) => Math.floor((end - start) / 86_400_000);

export function analyzeCrazyGames(rows) {
  const errors = [];
  let plays = 0;
  let oneMinutePlayers = 0;
  let totalPlaySeconds = 0;
  let d1Eligible = 0;
  let d1Returned = 0;
  const days = new Set();
  if (!rows.length) errors.push("no real CrazyGames metric rows supplied");
  rows.forEach((row, index) => {
    const prefix = `row ${index + 2}`;
    if (isoDay(row.date, `${prefix}.date`, errors)) days.add(row.date);
    const rowPlays = finiteNonNegative(row.plays, `${prefix}.plays`, errors, true);
    const rowConverted = finiteNonNegative(
      row.oneMinutePlayers,
      `${prefix}.oneMinutePlayers`,
      errors,
      true,
    );
    const rowD1Eligible = finiteNonNegative(
      row.d1Eligible,
      `${prefix}.d1Eligible`,
      errors,
      true,
    );
    const rowD1Returned = finiteNonNegative(
      row.d1Returned,
      `${prefix}.d1Returned`,
      errors,
      true,
    );
    if (rowConverted > rowPlays) errors.push(`${prefix}.oneMinutePlayers exceeds plays`);
    if (rowD1Returned > rowD1Eligible) errors.push(`${prefix}.d1Returned exceeds d1Eligible`);
    plays += rowPlays;
    oneMinutePlayers += rowConverted;
    totalPlaySeconds += finiteNonNegative(
      row.totalPlaySeconds,
      `${prefix}.totalPlaySeconds`,
      errors,
    );
    d1Eligible += rowD1Eligible;
    d1Returned += rowD1Returned;
  });
  const conversionRate = plays ? oneMinutePlayers / plays : null;
  const averagePlaySeconds = plays ? totalPlaySeconds / plays : null;
  const d1Rate = d1Eligible ? d1Returned / d1Eligible : null;
  const gates = {
    plays: plays >= 500,
    observedDays: days.size >= 7,
    oneMinuteConversion: conversionRate !== null && conversionRate >= 0.8,
    d1Retention: d1Rate !== null && d1Rate >= 0.12,
  };
  return {
    valid: errors.length === 0,
    errors,
    metrics: {
      plays,
      observedDays: days.size,
      oneMinuteConversionRate: conversionRate,
      averagePlaySeconds,
      d1Eligible,
      d1RetentionRate: d1Rate,
    },
    thresholds: { plays: 500, observedDays: 7, oneMinuteConversionRate: 0.8, d1RetentionRate: 0.12 },
    gates,
    passed: errors.length === 0 && Object.values(gates).every(Boolean),
    decisionNote: "These are internal gates; CrazyGames makes the actual Full Launch decision.",
  };
}

export function analyzeGoogleTesters(rows, asOf) {
  const errors = [];
  const end = isoDay(asOf, "asOf", errors);
  const ids = new Set();
  let eligibleTesters = 0;
  let feedbackCount = 0;
  if (!rows.length) errors.push("no real Google closed-test tester rows supplied");
  rows.forEach((row, index) => {
    const prefix = `row ${index + 2}`;
    const id = String(row.testerId ?? "").trim();
    if (!id) errors.push(`${prefix}.testerId is required`);
    else if (ids.has(id)) errors.push(`${prefix}.testerId is duplicated`);
    else ids.add(id);
    const optIn = isoDay(row.optInDate, `${prefix}.optInDate`, errors);
    const optOut = row.optOutDate
      ? isoDay(row.optOutDate, `${prefix}.optOutDate`, errors)
      : end;
    const feedback = String(row.feedback ?? "").trim();
    const build = String(row.build ?? "").trim();
    if (!feedback) errors.push(`${prefix}.feedback must contain actual feedback`);
    else feedbackCount += 1;
    if (!build) errors.push(`${prefix}.build is required`);
    if (optIn && optOut) {
      if (optOut < optIn) errors.push(`${prefix}.optOutDate precedes optInDate`);
      else if (daysBetween(optIn, optOut) + 1 >= 14) eligibleTesters += 1;
    }
  });
  const gates = {
    testerCount: eligibleTesters >= 12,
    actualFeedback: feedbackCount >= 12,
  };
  return {
    valid: errors.length === 0,
    errors,
    asOf,
    totalUniqueTesters: ids.size,
    eligibleContinuous14DayTesters: eligibleTesters,
    feedbackCount,
    thresholds: { continuousTesters: 12, consecutiveDays: 14, feedbackPerEligibleTester: true },
    gates,
    passed: errors.length === 0 && Object.values(gates).every(Boolean),
  };
}

export function analyzePlaytest(rows) {
  const errors = [];
  if (!rows.length) errors.push("no completed human playtest rows supplied");
  const completed = rows.filter((row) => String(row.first_capture_seconds ?? "").trim());
  if (completed.length < 20) errors.push(`need at least 20 completed human rows; found ${completed.length}`);
  const captures = completed.map((row, index) =>
    finiteNonNegative(row.first_capture_seconds, `completed row ${index + 1}.first_capture_seconds`, errors),
  ).sort((a, b) => a - b);
  const rate = (key) => completed.length
    ? completed.filter((row) => TRUE.test(String(row[key] ?? ""))).length / completed.length
    : null;
  let p0Count = 0;
  completed.forEach((row, index) => {
    const raw = String(row.p0_count ?? "").trim();
    if (!raw) errors.push(`completed row ${index + 1}.p0_count is required`);
    else p0Count += finiteNonNegative(raw, `completed row ${index + 1}.p0_count`, errors, true);
  });
  const median = captures.length
    ? (captures[Math.floor((captures.length - 1) / 2)] + captures[Math.floor(captures.length / 2)]) / 2
    : null;
  const metrics = {
    participants: completed.length,
    tutorialCompletionRate: rate("tutorial_finished"),
    firstCaptureMedianSeconds: median,
    understoodValueRuleRate: rate("understood_value_rule"),
    thirdRunReachRate: rate("reached_run_3"),
    p0Count,
  };
  const gates = {
    participants: completed.length >= 20,
    tutorialCompletion: metrics.tutorialCompletionRate !== null && metrics.tutorialCompletionRate >= 0.7,
    firstCaptureMedian: median !== null && median <= 60,
    ruleUnderstanding: metrics.understoodValueRuleRate !== null && metrics.understoodValueRuleRate >= 0.6,
    thirdRunReach: metrics.thirdRunReachRate !== null && metrics.thirdRunReachRate >= 0.4,
    noP0: p0Count === 0 && completed.length > 0,
  };
  return {
    valid: errors.length === 0,
    errors,
    metrics,
    thresholds: {
      participants: 20,
      tutorialCompletionRate: 0.7,
      firstCaptureMedianSeconds: 60,
      understoodValueRuleRate: 0.6,
      thirdRunReachRate: 0.4,
      p0Count: 0,
    },
    gates,
    passed: errors.length === 0 && Object.values(gates).every(Boolean),
  };
}

export function evaluateLaunchReadiness(input) {
  const checks = [
    check("automated-tests", input.automatedTestsPassed, "automated test suite must pass"),
    check("web-build", input.webBuild?.exists && input.webBuild.bytes > 0, "Cocos Web build is missing or empty", input.webBuild),
    check("web-size", input.webBuild?.exists && input.webBuild.bytes < 20 * 1024 * 1024, "Web build must be under 20 MiB", input.webBuild),
    check("android-aab", input.androidAab?.exists && input.androidAab.bytes > 0, "signed Android AAB is missing or empty", input.androidAab),
    check("store-assets", input.storeAssetsReady, "real store assets and manual visual approval are incomplete"),
    check("privacy", input.privacyReady, "published privacy policy/configuration is incomplete"),
    check("sdk-config", input.sdkConfigured, "production SDK configuration/credentials are incomplete"),
    check("playtest", input.playtest?.passed, "human playtest gates are incomplete", input.playtest),
    check("crazygames-basic", input.crazygames?.passed, "CrazyGames Basic metrics gates are incomplete", input.crazygames),
    check("google-closed-test", input.googleTesters?.passed, "Google closed testing gates are incomplete", input.googleTesters),
  ];
  return {
    ready: checks.every((item) => item.passed),
    checks,
    blockers: checks.filter((item) => !item.passed).map((item) => `${item.id}: ${item.reason}`),
    disclaimer: "This report does not claim CrazyGames Basic/Full Launch or Google closed testing is complete.",
  };
}

function check(id, passed, reason, details) {
  return { id, passed: Boolean(passed), reason: passed ? null : reason, details };
}
