"use strict";

const crypto = require("node:crypto");
const { FirestoreReceiptStore } = require("./receipt-store");

const PRODUCTS = new Map([
  ["starter_pack", "permanent"],
  ["remove_ads", "permanent"],
  ["cosmetic_boat_ember", "cosmetic"],
  ["cosmetic_trail_prism", "cosmetic"],
  ["cosmetic_boat_mist", "cosmetic"],
  ["coins_300", "coins"],
  ["coins_900", "coins"],
  ["coins_2400", "coins"],
]);
const AUTHORITY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function json(res, status, body) {
  res.status(status).set("content-type", "application/json").send(JSON.stringify(body));
}

function bearerToken(req) {
  const header = req.headers?.authorization || req.get?.("authorization");
  return typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice(7)
    : null;
}

function createVerifier({ playApi, receiptStore, packageName, identityVerifier, signer }) {
  if (!playApi || !receiptStore || !packageName || !identityVerifier || !signer) {
    return async (_req, res) =>
      json(res, 503, { status: "unavailable", message: "Verifier is not configured" });
  }
  return async (req, res) => {
    if (req.method !== "POST") {
      json(res, 405, { status: "rejected", message: "POST required" });
      return;
    }
    let identity;
    try {
      const token = bearerToken(req);
      if (!token) throw new Error("missing identity");
      identity = await identityVerifier.verify(token);
      if (!identity?.userId) throw new Error("invalid identity");
    } catch {
      json(res, 401, { status: "rejected", message: "Authentication required" });
      return;
    }
    if (req.body?.action === "sync_entitlements") {
      const records = await receiptStore.listEntitlements(identity.userId);
      const now = Date.now();
      json(res, 200, {
        revokedProductIds: [],
        entitlements: records.map((record) => {
          const authorityExpiresAt = now + AUTHORITY_TTL_MS;
          return {
            productId: record.productId,
            verifiedAt: record.processedAt,
            authorityExpiresAt,
            authorityToken: signer.sign(
              identity.userId,
              record.productId,
              authorityExpiresAt,
            ),
          };
        }),
      });
      return;
    }
    const { productId, purchaseToken } = req.body || {};
    if (
      !PRODUCTS.has(productId) ||
      typeof purchaseToken !== "string" ||
      purchaseToken.length < 10
    ) {
      json(res, 400, { status: "rejected", message: "Invalid receipt request" });
      return;
    }
    try {
      const response = await playApi.purchases.products.get({
        packageName,
        productId,
        token: purchaseToken,
      });
      const receipt = response.data || {};
      if (receipt.purchaseState !== 0) {
        json(res, 403, { status: "rejected", message: "Purchase is not active" });
        return;
      }
      const claim = await receiptStore.claim(purchaseToken, {
        userId: identity.userId,
        productId,
        kind: PRODUCTS.get(productId),
        orderId: receipt.orderId || null,
        purchaseTimeMillis: receipt.purchaseTimeMillis || null,
      });
      const acquired = typeof claim === "boolean" ? claim : claim.acquired;
      const ownerId = typeof claim === "boolean"
        ? identity.userId
        : claim.record?.userId;
      if (!acquired && ownerId !== identity.userId) {
        json(res, 403, { status: "rejected", message: "Receipt belongs to another user" });
        return;
      }
      const verifiedAt = Date.now();
      const authorityExpiresAt = verifiedAt + AUTHORITY_TTL_MS;
      json(res, 200, {
        status: "verified",
        productId,
        purchaseToken,
        authenticatedUserId: identity.userId,
        alreadyProcessed: !acquired,
        entitlementActive: PRODUCTS.get(productId) !== "coins",
        verifiedAt,
        authorityExpiresAt,
        authorityToken: signer.sign(identity.userId, productId, authorityExpiresAt),
      });
    } catch (error) {
      const status = Number(error?.code) === 404 ? 403 : 503;
      json(res, status, {
        status: status === 403 ? "rejected" : "unavailable",
        message: status === 403 ? "Receipt not found" : "Google Play unavailable",
      });
    }
  };
}

function productionVerifier() {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const collection = process.env.RECEIPT_COLLECTION;
  const signingSecret = process.env.ENTITLEMENT_SIGNING_SECRET;
  if (!packageName || !credentialsJson || !collection || !signingSecret) {
    return createVerifier({});
  }
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    return createVerifier({});
  }
  // Kept lazy so unit tests and misconfigured deployments stay deny-by-default.
  const { google } = require("googleapis");
  const { Firestore } = require("@google-cloud/firestore");
  const { getApps, initializeApp } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  if (getApps().length === 0) initializeApp();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const playApi = google.androidpublisher({ version: "v3", auth });
  const receiptStore = new FirestoreReceiptStore(new Firestore(), collection);
  const identityVerifier = {
    verify: async (idToken) => {
      const decoded = await getAuth().verifyIdToken(idToken, true);
      return { userId: decoded.uid };
    },
  };
  const signer = {
    sign: (userId, productId, expiresAt) =>
      crypto
        .createHmac("sha256", signingSecret)
        .update(`${userId}:${productId}:${expiresAt}`)
        .digest("base64url"),
  };
  return createVerifier({
    playApi,
    receiptStore,
    packageName,
    identityVerifier,
    signer,
  });
}

exports.createVerifier = createVerifier;
exports.verifyGooglePlay = productionVerifier();
