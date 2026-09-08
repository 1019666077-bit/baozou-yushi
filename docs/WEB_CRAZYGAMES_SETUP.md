# Web / CrazyGames Basic Launch

## Cocos 构建

1. 使用 Cocos Creator 3.8.x 打开项目，在构建面板导入 `build-config.web.json`。
2. 选择 Web Desktop、横屏、Boot 场景，构建到 `build/web-desktop`。
3. 普通 Web 构建会使用 `WebLocalAdapter`，存档写入浏览器 `localStorage`。
4. CrazyGames 包必须按平台当前文档在 HTML 模板中加载官方 HTML5 SDK v3，并保证 SDK 脚本先于游戏入口执行。项目不会注入、伪造或假定 `CrazyGames.SDK` 存在；未加载时工厂会回退到 Web 本地模式。
5. 运行 `npm run preflight:web` 和 `npm run preflight:crazygames`。

## 首载与低配预算

- Web 首次下载硬预算为 `< 20 MiB`。`platform-preflight.mjs` 仅在
  `build/web-desktop` 或 `build/web-mobile` 存在时统计完整构建目录；
  未构建时输出 `buildMeasured: false`，不得据此宣称达标。
- 当前视觉与短音效均为程序化图元/合成波形，不新增媒体下载。
- 标准档同时存活粒子上限48、低配档16；鱼群上限分别4/3，飞行物上限12。
- 发布前还应在浏览器网络面板以禁用缓存的冷启动复测传输体积；压缩前目录统计只是保守门禁，不是线上测速。

## Basic Launch 门禁

- `build-config.web.json` 中 `platformOptions.crazyGames.adsEnabled` 必须保持 `false`。
- 当前只启用本地/SDK data 存档、`SDK.init()` 和 `gameplayStart/gameplayStop`。不建设游戏后端。
- 广告接口只有安全占位；在 CrazyGames 后台审核通过并取得明确产品批准前，不得把配置改为启用。
- SDK data 是异步能力，本地缓存始终作为首启与离线降级。清站点数据会清除纯 Web 本地档。

## CrazyGames 后台人工操作

1. 创建游戏条目并上传 Cocos Web 构建 ZIP。
2. 在预览环境确认官方 SDK 已实际加载，控制台无 `SDK is unavailable`。
3. 人工验证横屏、键鼠（WASD/方向键、空格、E、鼠标瞄准）及触摸双区操作。
4. 切换标签页、窗口失焦和恢复，确认玩法暂停、SDK gameplay 状态配对。
5. 在平台检查器验证 data 能力；离线后确认本地档仍可读取。
6. Basic Launch 不申请广告、不展示广告，也不宣称云存档或服务端排行榜。
