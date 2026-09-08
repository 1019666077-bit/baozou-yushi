import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { createVerifier } = require("../cloudfunctions/verifyGooglePlay/index.js");
const identityVerifier = {
  verify: async (token) => token === "valid-token" ? { userId: "user-1" } : null,
};
const signer = { sign: () => "signed-authority-token" };
const authenticated = { authorization: "Bearer valid-token" };

function response() {
  return {
    statusCode: 0,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set() {
      return this;
    },
    send(raw) {
      this.body = JSON.parse(raw);
      return this;
    },
  };
}

describe("Google Play receipt verifier", () => {
  it("denies by default when credentials or persistence are absent", async () => {
    const res = response();
    await createVerifier({})({ method: "POST", body: {} }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe("unavailable");
  });

  it("verifies an active receipt and atomically marks duplicate tokens", async () => {
    const get = vi.fn(async () => ({
      data: { purchaseState: 0, orderId: "order-1" },
    }));
    const claim = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const handler = createVerifier({
      playApi: { purchases: { products: { get } } },
      receiptStore: { claim },
      packageName: "com.baozouyushi.game",
      identityVerifier,
      signer,
    });
    const req = {
      method: "POST",
      headers: authenticated,
      body: { productId: "coins_300", purchaseToken: "purchase-token-123" },
    };
    const first = response();
    await handler(req, first);
    expect(first.body).toMatchObject({
      status: "verified",
      alreadyProcessed: false,
    });
    const duplicate = response();
    await handler(req, duplicate);
    expect(duplicate.body.alreadyProcessed).toBe(true);
  });

  it("rejects cancelled or unknown purchases without claiming a token", async () => {
    const claim = vi.fn();
    const handler = createVerifier({
      playApi: {
        purchases: { products: { get: async () => ({ data: { purchaseState: 1 } }) } },
      },
      receiptStore: { claim },
      packageName: "com.baozouyushi.game",
      identityVerifier,
      signer,
    });
    const res = response();
    await handler({
      method: "POST",
      headers: authenticated,
      body: { productId: "remove_ads", purchaseToken: "purchase-token-123" },
    }, res);
    expect(res.statusCode).toBe(403);
    expect(claim).not.toHaveBeenCalled();
  });

  it("denies unauthenticated requests and cross-user receipt replay", async () => {
    const handler = createVerifier({
      playApi: {
        purchases: {
          products: {
            get: async () => ({ data: { purchaseState: 0 } }),
          },
        },
      },
      receiptStore: {
        claim: async () => ({
          acquired: false,
          record: { userId: "other-user" },
        }),
      },
      packageName: "com.baozouyushi.game",
      identityVerifier,
      signer,
    });
    const unauthenticated = response();
    await handler({
      method: "POST",
      body: { productId: "remove_ads", purchaseToken: "purchase-token-123" },
    }, unauthenticated);
    expect(unauthenticated.statusCode).toBe(401);

    const replay = response();
    await handler({
      method: "POST",
      headers: authenticated,
      body: { productId: "remove_ads", purchaseToken: "purchase-token-123" },
    }, replay);
    expect(replay.statusCode).toBe(403);
    expect(replay.body.message).toContain("another user");
  });
});
