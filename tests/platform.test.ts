import { afterEach, describe, expect, it } from "vitest";
import { WechatAdapter } from "../assets/scripts/platform/WechatAdapter";

type WxStub = {
  login?: (options: {
    success: (result: { code: string }) => void;
    fail: (error: unknown) => void;
  }) => void;
  cloud?: {
    init: (options?: { traceUser?: boolean; env?: string }) => void;
    callFunction: (options: {
      name: string;
      data?: unknown;
      success: (result: { result: unknown }) => void;
      fail: (error: unknown) => void;
    }) => void;
  };
  getOpenDataContext?: () => { canvas?: { width: number; height: number } };
};

function setWx(stub?: WxStub): void {
  const global = globalThis as { wx?: WxStub };
  if (stub) global.wx = stub;
  else delete global.wx;
}

describe("WechatAdapter login", () => {
  afterEach(() => {
    WechatAdapter.forgetSession();
    setWx();
  });

  it("returns null in the editor without throwing", async () => {
    setWx();
    await expect(WechatAdapter.login()).resolves.toBeNull();
    expect(WechatAdapter.signedIn).toBe(false);
    expect(WechatAdapter.sessionKind()).toBe("editor");
    expect(WechatAdapter.canShowFriendBoard()).toBe(false);
    WechatAdapter.initializeCloud();
    await expect(WechatAdapter.callCloud("loadSave")).rejects.toThrow(
      /unavailable/,
    );
  });

  it("resolves null when wx.login fails and skips the friend board", async () => {
    setWx({
      login: ({ fail }) => fail(new Error("denied")),
      getOpenDataContext: () => ({}),
      cloud: {
        init: () => undefined,
        callFunction: ({ fail }) => fail(new Error("no")),
      },
    });
    await expect(WechatAdapter.login()).resolves.toBeNull();
    expect(WechatAdapter.signedIn).toBe(false);
    expect(WechatAdapter.sessionKind()).toBe("guest");
    expect(WechatAdapter.canShowFriendBoard()).toBe(false);
    WechatAdapter.initializeCloud();
    await expect(WechatAdapter.callCloud("loadSave")).rejects.toThrow(
      /unavailable/,
    );
  });

  it("stores the code when wx.login succeeds", async () => {
    let inited = false;
    setWx({
      login: ({ success }) => success({ code: "mock-code" }),
      getOpenDataContext: () => ({ canvas: { width: 1, height: 1 } }),
      cloud: {
        init: () => {
          inited = true;
        },
        callFunction: ({ success }) => success({ result: { ok: true } }),
      },
    });
    await expect(WechatAdapter.login()).resolves.toBe("mock-code");
    expect(WechatAdapter.signedIn).toBe(true);
    expect(WechatAdapter.sessionKind()).toBe("signed");
    expect(WechatAdapter.canShowFriendBoard()).toBe(true);
    WechatAdapter.initializeCloud();
    expect(inited).toBe(true);
    await expect(WechatAdapter.callCloud<{ ok: boolean }>("loadSave")).resolves.toEqual(
      { ok: true },
    );
  });
});
