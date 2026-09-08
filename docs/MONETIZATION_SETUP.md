# 商业化接线手册（阶段 4）

本仓库包含可测试的 TypeScript 状态机和 Google Play 核票参考函数，但**当前没有
Cocos 生成的 Android 工程，也没有真实广告位、Play Console 商品或生产凭据**。
未完成下列人工步骤时，代码会安全返回 `unavailable`，不会假装购买、广告或核票成功。

## 商品目录与 Play Console

在 Play Console 使用与代码完全一致的 Product ID：

- 永久型：`starter_pack`、`remove_ads`
- 非消耗外观：`cosmetic_boat_ember`、`cosmetic_trail_prism`、`cosmetic_boat_mist`
- 消耗型：`coins_300`、`coins_900`、`coins_2400`

金币包只在客户端确认曾击败 Boss（当前以 `endlessTide.unlocked` 为进度标记）后展示。
`ProductCatalog.ts` 中的人民币文本仅是加载失败时的 UI fallback；真实结账价格必须来自
Google Billing `ProductDetails.formattedPrice`，不得按 fallback 自行收费。

## Android / Google Billing 人工接线

1. 用 Cocos Creator 3.8.8 生成 Android 工程后，添加 Google Play Billing Library。
2. 在原生层注册 `globalThis.__BAOZOU_ANDROID_BRIDGE__` 对应 JSB 对象。
3. 实现 `billingRequest(requestJson, callback)`。请求包含：
   - `requestId`
   - `operation`: `queryProducts | purchase | acknowledge | consume | restore`
   - 操作参数：`ids`、`productId` 或 `purchaseToken`
4. 回调必须回传 JSON：
   - 成功：`{requestId,status:"success",products?|purchase?|purchases?}`
   - 用户取消：`{requestId,status:"cancelled"}`
   - 失败：`{requestId,status:"error",message}`
5. `purchase` / `restore` 的 purchase 必须含 `productId` 与真实 `purchaseToken`。
6. 永久品核票成功后调用 acknowledge；金币包核票且服务端确认 token 首次处理后调用
   consume。原生 Billing 返回成功并不等于权益发放成功。

`AndroidBilling` 会处理超时、异常 JSON、错 requestId 和重复回调。桥不存在时 Billing
能力为 false。原生工程尚未生成，因此本仓库只验证 TS 契约，**未宣称 Android 编译通过**。

## AdMob 人工接线

在 AdMob 创建并替换以下占位符（不要把生产 ID 写进仓库）：

- Android rewarded: `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`
- Android interstitial: `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`

原生层实现现有 `showAd(placement, callback)`，回调只允许
`completed | cancelled | error`。只有 rewarded 的 `completed` 会发奖励；取消、掉线、
超时和错误不阻塞正常结算或游戏。发布前通过运行时配置显式设置
`androidAdsEnabled: true`；未接原生插件时即使设置也仍为 unavailable。

## CrazyGames Full Launch

Basic Launch 的 `build-config.web.json` 必须保持：

```json
{"basicLaunch":true,"crazyGames":{"adsEnabled":false}}
```

完成 CrazyGames 审核并进入 Full Launch 后，在 HTML 启动游戏前注入：

```js
globalThis.__BAOZOU_MONETIZATION_CONFIG__ = { launchMode: "full" };
```

适配器使用官方 HTML5 SDK `ad.requestAd("rewarded"|"midgame")` 的真实回调。Basic Launch
或 SDK 缺失时强制禁用。初版**不展示、不调用 CrazyGames IAP**。

## 部署 Google Play 核票函数

参考实现位于 `cloudfunctions/verifyGooglePlay`，适用于 Node 20 Cloud Functions 风格：

1. 在 Google Cloud 创建仅具 Android Publisher 所需权限的服务账号，并在 Play Console
   “API access”中授权。
2. 创建 Firestore 数据库；部署账号需要目标 collection 的读写权限。
3. 在部署平台以 secret / 环境变量配置：
   - `GOOGLE_PLAY_PACKAGE_NAME=com.baozouyushi.game`
   - `GOOGLE_SERVICE_ACCOUNT_JSON=<完整服务账号 JSON>`
   - `RECEIPT_COLLECTION=googlePlayReceipts`
4. 在该目录执行 `npm install`，将导出函数 `verifyGooglePlay` 部署为 HTTPS POST。
5. 客户端页面启动前注入
   `receiptVerificationUrl: "https://<region>-<project>.cloudfunctions.net/verifyGooglePlay"`。
6. 限制函数调用来源并在生产网关增加玩家身份认证、速率限制和审计日志。参考函数只展示
   Play 核票与 token 原子幂等边界，不替代账号认证。

缺少任一环境变量、凭据 JSON 无效或 ReceiptStore 未配置时，函数返回 503
`unavailable`。密钥不得提交到仓库。测试使用 mock Play API 和 mock store。

## 退款、撤销与权威状态

- Firestore receipt 记录是 token 幂等账本；永久权益还应写入玩家服务端账号记录。
- 接入 Google Play Real-time Developer Notifications，收到退款/撤销后调用
  `ReceiptStore.revoke(token, reason)`，并从玩家服务端权益记录移除对应商品。
- 玩家登录、恢复购买和回到前台时，账号服务应返回 active entitlements 与
  revoked product IDs，再调用 `PurchaseService.syncRevocations()`。
- `PlayerSave.entitlements` 只是最近一次**服务端 verified** 结果的离线缓存，不是购买权威。
  清档、改本地 JSON 或仅收到 Billing success 都不能生成永久权益。
- 消耗型金币仅在 verified 且 `alreadyProcessed:false` 时发放；重复 token 明确不发币。

## 发布前核对

1. Play 内部测试轨逐项测试成功、取消、断网、重复回调、恢复、退款与 pending purchase。
2. 使用 AdMob test unit 验证 rewarded/interstitial，再替换生产 unit。
3. 验证教程和前两局无插屏、第 3 局后仍满足 180 秒间隔、每日结算奖励最多 3 次、
   Boss 每局最多一次、周挑战完全没有付费/广告增益、`remove_ads` 只移除插屏。
4. 运行 `npm run validate`、`npm run simulate`、`npm run preflight:platforms`。
