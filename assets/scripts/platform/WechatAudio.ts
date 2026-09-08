interface WechatAudioApi {
  createWebAudioContext?: () => unknown;
}

declare const wx: WechatAudioApi | undefined;

export function createWechatAudioContext<T>(): T | undefined {
  if (typeof wx === "undefined") return undefined;
  return wx?.createWebAudioContext?.() as T | undefined;
}
