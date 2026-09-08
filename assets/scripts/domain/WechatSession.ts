import type { CloudKind } from "./CloudCopy";

export type WechatSessionKind = "editor" | "guest" | "signed";

/** 把 wx.login 的成败收成可测结果：非微信/失败都当未登录，不抛错。 */
export function resolveLoginCode(input: {
  wechatAvailable: boolean;
  code?: string | null;
  failed?: boolean;
}): string | null {
  if (!input.wechatAvailable || input.failed) return null;
  const code = input.code?.trim();
  return code ? code : null;
}

export function wechatSessionKind(input: {
  wechatAvailable: boolean;
  loginCode: string | null;
}): WechatSessionKind {
  if (!input.wechatAvailable) return "editor";
  if (!input.loginCode) return "guest";
  return "signed";
}

export function shouldCallCloud(kind: WechatSessionKind): boolean {
  return kind === "signed";
}

export function canShowFriendBoardForSession(
  kind: WechatSessionKind,
  hasOpenData: boolean,
): boolean {
  return kind === "signed" && hasOpenData;
}

export function persistCloudKind(
  kind: WechatSessionKind,
  synced: boolean,
): Exclude<CloudKind, "syncing"> {
  if (kind === "editor") return "local";
  if (kind === "guest") return "unsigned";
  return synced ? "cloud" : "offline";
}
