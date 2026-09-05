# 本地预览与出包（最短）

Cocos Creator **3.8.8**。仓库不提交真实 AppID / 云环境 ID；本地替换即可。

## 编辑器预览

1. 用 Creator 打开本仓库根目录。
2. 打开 `assets/scenes/Boot.scene`，点预览。
3. 应进入港口灰盒（RuntimeHome）。装配细节见 `docs/SCENE_SETUP.md`。

## web-desktop（playtest-live）

1. 构建面板选 **web-desktop**（可用 `build-config.web.json`）。
2. 产物在 `build/web-desktop/`。
3. 起静态服务，默认端口 **8765**：

```bash
npx --yes serve build/web-desktop -l 8765
```

4. 实跑脚本（不设时也默认该地址；没有构建会清晰失败）：

```bash
PLAYTEST_URL=http://127.0.0.1:8765/ node tools/playtest-live.mjs
```

## 第一局体验代理（无 Creator）

没有编辑器时，可用 DOM+canvas 代理看第一局闭环（教学→抛竿→弱点→捡起→入箱→卖出→回港）：

```bash
node tools/first-run-preview/serve.mjs
```

浏览器打开 http://127.0.0.1:8766/ 。**非 Cocos 实机**，文案/CTA/色板从 `assets/scripts/domain` 抽出。说明见 `tools/first-run-preview/README.md`。

## 微信小游戏

1. 构建面板选 **微信小游戏**（`build-config.wechat.json`）。把 AppID 换成自己的，**不要提交**。
2. `npm run postbuild:wechat`（开放数据域、横屏、占位 AppID → `touristappid`）。
3. 用微信开发者工具打开 `build/wechatgame/`。
4. 云函数与集合见 `docs/CLOUD_SETUP.md`；提审见 `docs/RELEASE_CHECKLIST.md`。
