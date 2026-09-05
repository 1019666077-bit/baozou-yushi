# 暴走鱼市

原创横屏动作钓鱼微信小游戏 MVP。玩家抛竿锁定目标，通过弱点击破、空中命中、连击和极限收杆积累“精彩度”，精彩度直接提高渔获售价。

## 当前唯一官方运行时

**Boot.scene → RuntimeHome → RuntimePrototype**

`RuntimeAutoStart` 会在 Canvas 上挂 `RuntimeHome`；出海后再挂 `RuntimePrototype`。这是当前唯一已接线、可玩的主路径。

`GameBootstrap`、`BattleController`、`TutorialController` 等编辑器战斗栈**没有**挂到 `Boot.scene`，属于未接线的编辑器实验代码，不能当作已交付。仓库里没有、也不需要 `Home.scene`。

## 当前交付（灰盒）

- Cocos Creator 3.8 TypeScript 灰盒：港口、出海扑腾、教学关、三岛与首领
- 可独立测试的精彩度、经济、升级、存档合并与成绩校验
- 微信适配、本地+云存档、`submitScore` 云校验好友榜、埋点上报
- 云函数：`loadSave`、`saveGame`、`submitScore`、`deleteSave`、`getRemoteConfig`、`reportEvents`
- 包体预检、数值模拟、合规文档；**未接入广告 SDK**

尚未由源码完成、必须真人/账号完成的事项见 `docs/IMPLEMENTATION_STATUS.md`（真机、20 人体验表、软著/版号、正式 AppID 等）。

## 开发环境

最短预览 / 出包步骤见 `docs/LOCAL_PREVIEW.md`（Creator 预览、web-desktop + playtest-live、微信构建 + postbuild）。

1. 安装 Cocos Creator 3.8.8，用编辑器打开本目录。
2. 首次打开后由编辑器生成 `library/`、`temp/` 和资源 `.meta` 文件。
3. 初始场景用 `Boot.scene`（Canvas 即可）。`RuntimeAutoStart` 会挂上 `RuntimeHome`。装配说明见 `docs/SCENE_SETUP.md`。
4. 构建平台选择“微信小游戏”。`build-config.wechat.json` 里的 AppID 是 Cocos 默认占位，本地构建请换成自己的小游戏 AppID，**不要把真实 AppID 提交进仓库**。
5. 将 `cloudfunctions/` 目录配置为微信云开发云函数根目录并逐个部署（含 `deleteSave`）。云环境 ID 同样只写本机，见 `docs/CLOUD_SETUP.md`。

## 本地验证

本机未安装 Cocos Creator 时，仍可验证纯逻辑：

```bash
npm install
npm run validate
npm run simulate
```

- `npm run validate`：自绘矢量 + 类型检查 + vitest + 预检 + 第一局体验代理抽取。
- 无 Creator 时代验：`node tools/first-run-preview/serve.mjs` → http://127.0.0.1:8766/ 。**2D/辅助 ≠ Creator 3D，不能当真机手感证据。**
- 本机有 Creator：打开 `Boot.scene` → 预览（Ctrl/Cmd+P）→ 截 4 张进 `docs/stage3d/creator-shots/`（`01_harbor_wide.png` / `02_dock_near.png` / `03_bayfin_weak.png` / `04_flop_smash.png`）。清单：`npm run shots:list`（现 0/4）。代理 / `first-run-preview` / `docs/stage3d/expect_*.jpg` 示意图一律不算证据（期望构图 ≠ Creator/真机）。
- 本机有 Creator 才能打 `build/web-desktop`；`npm run try:web-desktop` 找不到编辑器会 **缺 Creator** 并 exit 2。细节见 `docs/LOCAL_PREVIEW.md`。
- `npm run simulate`：50 个确定性经济角色，检查解锁节奏。
- `npm run playtest:report`：读取 `playtest/participants.csv`。**真人有效行不足 20 条时主动失败**，这是设计，防止把自动模拟冒充人类体验测试。不要把该命令放进必过 CI。

CI 只跑 `validate` 与 `simulate`，见 `.github/workflows/ci.yml`。

## 配置双份

数值与岛/鱼/工具的单一真相源是 `assets/config/*.json`。

`npm run sync:config`（`tools/sync-bundled-config.mjs`）把它同步到：

- `assets/scripts/data/bundledConfig.ts`（RuntimeHome 主路径打包）
- `assets/resources/config/`（Cocos resources 镜像，供未接线的编辑器实验栈）

不要直接改后两份。`npm run validate` 里的 preflight 会在不一致时失败。

## 试玩流程

新玩家默认开启教学：未完成 `tutorialComplete` 时，出航进入练潮码头（`island_tutorial` / TutorialFlow），只开放基础鱼竿。完成首次弱点击破并入箱后，教学完成，才进入泡沫湾等正常岛。教学完成前，港口升级/图鉴/榜按 `TutorialFlow.harborUnlocks` 锁定。教学首售约 11 金、竿 2 级 90，买不起升级时主 CTA 仍是出海捕鱼。

三座岛依次解锁，最终挑战“潮鸣巨鲲”。完整首轮进度约30–45分钟。

## 合规与知识产权

本项目仅借鉴“花式捕获提高价值”这一抽象机制。名称、角色、鱼、岛屿、美术、文案、数值和代码均为原创；不使用写实伤害、血液、赌博或付费随机抽取。当前未接入广告 SDK。详细要求见 `docs/COMPLIANCE.md`。
