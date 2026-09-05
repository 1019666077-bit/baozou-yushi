# 微信云开发部署

## 云函数

在微信开发者工具中把 `cloudfunctions/` 设为云函数根目录，逐个右键“上传并部署：云端安装依赖”：

- `loadSave`
- `saveGame`（校验金币非负、revision 单调、岛屿/工具/鱼 id）
- `submitScore`（共用 `cloudfunctions/shared/scoreValidator.js`，再写好友榜）
- `deleteSave`（按 OpenID 删除云存档，并尽量清排行榜与未聚合埋点）
- `getRemoteConfig`
- `reportEvents`

不要把云环境ID或真实 AppID 写进仓库；在本机构建配置中填写。`GameBootstrap.wechatCloudEnv` 属于未接线的编辑器实验栈。官方路径由 `RuntimeHome` 在隐私授权之后调用 `WechatAdapter.login()` 与 `initializeCloud()`（不传环境 ID，沿用开发者工具当前环境）。登录失败或非微信/编辑器环境不抛错，灰盒继续用本机档；未登录时不打云函数、不挂好友榜。预览与出包见 `docs/LOCAL_PREVIEW.md`。

## 数据集合

创建以下集合：

- `player_saves`：仅云函数读写；为`openid`建立唯一业务索引。
- `leaderboard`：仅云函数写；为`openid + createdAt`和`score`建立索引。
- `remote_config`：管理员写、云函数读；插入`{ key: "production", value: {...} }`。
- `analytics_batches`：仅云函数写；建议设置30天清理任务。

客户端不能直写金币、工具等级、排行榜和远程配置。数据库权限默认设为所有用户不可直接读写，由云函数使用服务端身份访问。好友榜 KV 只由 `submitScore` 服务端写入，客户端已禁用 `setUserCloudStorage`。

## 好友榜与开放数据域

1. 在小游戏管理后台配置排行榜键`best_style`，类型为整数、降序，单位为“分”。
2. 开放数据域**以仓库根目录 `wechat-open-data/` 为准**（不要再用 `assets/open-data`）。
3. `templates/game.json` 的 `openDataContext` 为 `wechat-open-data`；`tools/postbuild-wechat.mjs` 把该目录拷进微信构建产物。
4. 排行榜值按精彩倍率×100上报，例如2.35倍对应235分。

## 弱网策略

读云档失败时使用本地档；本地每次写入提升revision。恢复联网后，高revision覆盖低revision。排行榜和埋点失败不会影响本局奖励。云调用超时为 6 秒。
