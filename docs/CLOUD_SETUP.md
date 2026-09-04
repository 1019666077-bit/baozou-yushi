# 微信云开发部署

## 云函数

在微信开发者工具中把 `cloudfunctions/` 设为云函数根目录，逐个右键“上传并部署：云端安装依赖”：

- `loadSave`
- `saveGame`
- `submitScore`
- `getRemoteConfig`
- `reportEvents`

不要把云环境ID写进仓库；在Cocos场景的`GameBootstrap.wechatCloudEnv`或本机构建配置中填写。

## 数据集合

创建以下集合：

- `player_saves`：仅云函数读写；为`openid`建立唯一业务索引。
- `leaderboard`：仅云函数写；为`openid + createdAt`和`score`建立索引。
- `remote_config`：管理员写、云函数读；插入`{ key: "production", value: {...} }`。
- `analytics_batches`：仅云函数写；建议设置30天清理任务。

客户端不能直写金币、工具等级、排行榜和远程配置。数据库权限默认设为所有用户不可直接读写，由云函数使用服务端身份访问。

## 好友榜

1. 在小游戏管理后台配置排行榜键`best_style`，类型为整数、降序，单位为“分”。
2. 构建后在`game.json`配置`openDataContext`指向开放数据域。
3. 将`assets/open-data/index.js`复制或配置到Cocos开放数据域构建目录。
4. 排行榜值按精彩倍率×100上报，例如2.35倍对应235分。

## 弱网策略

读云档失败时使用本地档；本地每次写入提升revision。恢复联网后，高revision覆盖低revision。排行榜和埋点失败不会影响本局奖励。
