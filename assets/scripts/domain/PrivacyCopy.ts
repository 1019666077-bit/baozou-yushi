export function privacyTitle(): string {
  return "隐私说明";
}

export function privacyLines(): string[] {
  return [
    "本机存档：金币、岛屿、工具、图鉴、设置和教学进度，存在这台设备。",
    "云存档：登录后用微信 OpenID 同步同一份进度；设置里删除会调用 deleteSave 清本机和云档。",
    "埋点：教学、捕获、结算、升级等局内事件经 reportEvents 上报，只做体验分析，不用于投放广告。",
    "好友榜：成绩只走 submitScore 云函数校验后写入；开放数据域只给互为好友的人看精彩分。",
    "低配看设备性能。震动只在真机短震。不读通讯录、位置、相册和麦克风。没有聊天，不上传玩家图片。",
    "未成年人走微信实名和防沉迷。没有付费抽取，也没有玩家交易。当前未接入广告 SDK。",
  ];
}

export function healthAdviceTitle(): string {
  return "健康游戏忠告";
}

export function healthAdviceLines(): string[] {
  return [
    "抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。",
    "适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。",
  ];
}

export function privacyBackCaption(): string {
  return "返回设置";
}

export function wipeCaption(): string {
  return "删除存档";
}

export function wipeTitle(): string {
  return "删除存档";
}

export function wipeBody(): string {
  return "会清掉本机档，并请求云函数 deleteSave 删除云存档和该账号排行榜记录。完成后从练潮码头教学重来。";
}

export function wipeConfirmCaption(): string {
  return "确定删除";
}

export function wipeCancelCaption(): string {
  return "再想想";
}

export function wipeDoneNotice(): string {
  return "存档已清空";
}
