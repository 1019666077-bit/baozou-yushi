"use strict";

const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function dayKey(now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function definitionFor(orderId, expectedDay) {
  const [date, metric, qualifier] = String(orderId || "").split(":");
  if (date !== expectedDay) return null;
  if (metric === "airborne") {
    return { metric, target: 2, reward: { kind: "cosmeticShards", amount: 1 } };
  }
  if (metric === "gradeA") {
    return { metric, target: 2, reward: { kind: "coins", amount: 45 } };
  }
  if (metric === "tool" && ["rod", "cannon", "harpoon"].includes(qualifier)) {
    return {
      metric,
      qualifier,
      target: 3,
      reward: { kind: "coins", amount: 40 },
    };
  }
  if (metric === "island" && qualifier) {
    return {
      metric,
      qualifier,
      target: 3,
      reward: { kind: "cosmeticShards", amount: 1 },
    };
  }
  return null;
}

function keyId(value) {
  return Buffer.from(value).toString("base64url");
}

function qualifyingCount(definition, run) {
  const fish = Array.isArray(run.fish) ? run.fish : [];
  if (definition.metric === "airborne") {
    return fish.filter((item) => item.airborneCapture === true).length;
  }
  if (definition.metric === "gradeA") {
    return fish.filter((item) => item.styleGrade === "A" || item.styleGrade === "S").length;
  }
  if (definition.metric === "tool") {
    const kind =
      run.toolId === "tool_cannon"
        ? "cannon"
        : run.toolId === "tool_harpoon"
          ? "harpoon"
          : "rod";
    return kind === definition.qualifier ? fish.length : 0;
  }
  if (definition.metric === "island") {
    return run.islandId === definition.qualifier ? fish.length : 0;
  }
  return 0;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: "missing_openid" };
  const serverNow = Date.now();
  if (event.action === "server_time") return { ok: true, serverNow };
  const currentDay = dayKey(serverNow);
  if (event.action === "record_run") {
    const run = event.run;
    const duration = Number(run?.finishedAt) - Number(run?.startedAt);
    if (
      !run ||
      typeof run.runId !== "string" ||
      !Array.isArray(run.fish) ||
      run.fish.length > 100 ||
      !Number.isFinite(duration) ||
      duration < 0 ||
      duration > 900_000 ||
      !Array.isArray(event.orderIds) ||
      event.orderIds.length > 3
    ) return { ok: false, error: "invalid_run" };
    const definitions = event.orderIds.map((orderId) => ({
      orderId,
      definition: definitionFor(orderId, currentDay),
    }));
    if (definitions.some((item) => !item.definition)) {
      return { ok: false, error: "invalid_order_set" };
    }
    const runRef = db.collection("daily_recorded_runs").doc(
      keyId(`${OPENID}:${run.runId}`),
    );
    const progressRefs = definitions.map((item) =>
      db.collection("daily_order_progress").doc(
        keyId(`${OPENID}:${item.orderId}`),
      ),
    );
    const recorded = await db.runTransaction(async (transaction) => {
      const existingRun = await transaction.get(runRef);
      if (existingRun.exists) return false;
      const snapshots = await Promise.all(
        progressRefs.map((ref) => transaction.get(ref)),
      );
      definitions.forEach((item, index) => {
        const previous = Number(snapshots[index].data()?.current || 0);
        const amount = qualifyingCount(item.definition, run);
        transaction.set(progressRefs[index], {
          openid: OPENID,
          orderId: item.orderId,
          current: Math.min(item.definition.target, previous + amount),
          target: item.definition.target,
          updatedAt: db.serverDate(),
        });
      });
      transaction.create(runRef, {
        openid: OPENID,
        runId: run.runId,
        recordedAt: db.serverDate(),
      });
      return true;
    });
    return { ok: true, recorded, serverNow };
  }
  if (event.action !== "claim") return { ok: false, error: "invalid_action" };

  const definition = definitionFor(event.orderId, currentDay);
  if (!definition) return { ok: false, error: "invalid_or_expired_order" };
  const reward = definition.reward;
  const claimKey = `${OPENID}:${event.orderId}`;
  const ref = db.collection("daily_order_claims").doc(
    keyId(claimKey),
  );
  const progressRef = db.collection("daily_order_progress").doc(keyId(claimKey));
  const outcome = await db.runTransaction(async (transaction) => {
    const progress = await transaction.get(progressRef);
    if (Number(progress.data()?.current || 0) < definition.target) {
      return "incomplete";
    }
    const existing = await transaction.get(ref);
    if (existing.exists) return "already_claimed";
    transaction.create(ref, {
      openid: OPENID,
      orderId: event.orderId,
      reward,
      claimedAt: db.serverDate(),
    });
    return "granted";
  });
  if (outcome === "incomplete") {
    return { ok: false, error: "server_progress_incomplete" };
  }
  if (outcome === "granted") {
    return { ok: true, status: "granted", serverNow, reward };
  }
  return {
    ok: true,
    status: "already_claimed",
    serverNow,
    reward: { kind: reward.kind, amount: 0 },
  };
};
