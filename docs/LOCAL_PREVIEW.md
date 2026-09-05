# 本地预览与出包（最短）

Cocos Creator **3.8.8**。仓库不提交真实 AppID / 云环境 ID；本地替换即可。

## 幕僚长代验：先看这条

**云端 / CI 没有 Cocos Creator，不能打出 `build/web-desktop`，也不能当真机手感证据。**

| 路径 | 命令 | 算不算实机 |
| --- | --- | --- |
| 第一局体验代理（当前唯一无 Creator 可点） | `node tools/first-run-preview/serve.mjs` → http://127.0.0.1:8766/ | **不算。** 2D 代理 ≠ Creator 3D 实机；无甲板扑腾/透视相机/微信震动 |
| 本机 Creator 预览 | 打开仓库 → `Boot.scene` → 预览 | 编辑器预览，仍非微信真机 |
| 本机 web-desktop | 见下节，产物 `build/web-desktop/`，`npx serve … -l 8765` | 接近 Runtime，仍非微信真机 |
| 命令行出包 | `node tools/try-web-desktop-build.mjs` | 找不到 Creator 会 **清晰失败（exit 2）**，不假装已出包 |

代理截图在 `tools/first-run-preview/shots/`，目录说明写了「非 Cocos 实机」。

## 编辑器预览（本机有 Creator）

1. 用 Creator 3.8.8 打开本仓库根目录。
2. 打开 `assets/scenes/Boot.scene`，点预览。
3. 应进入港口（RuntimeHome）。装配见 `docs/SCENE_SETUP.md`。

## web-desktop 最短出包（必须本机 Creator）

编辑器里点一次即可，**不要指望云端代跑**：

1. 菜单 **项目 → 构建发布**。
2. 平台选 **web-desktop**（可导入 `build-config.web.json`）。
3. 起始场景 `Boot.scene`，输出目录默认 `build/web-desktop/`。
4. 点构建。完成后：

```bash
npx --yes serve build/web-desktop -l 8765
```

浏览器打开 http://127.0.0.1:8765/ 。实跑脚本：

```bash
PLAYTEST_URL=http://127.0.0.1:8765/ node tools/playtest-live.mjs
```

没有 `build/web-desktop/index.html` 时，`playtest-live` **按设计失败**，不会跳过。

命令行尝试（本机设了 `COCOS_CREATOR` 才可能成功）：

```bash
COCOS_CREATOR=/path/to/CocosCreator node tools/try-web-desktop-build.mjs
```

当前云端探测结果：无 Creator 可执行文件，该脚本 exit 2。云端若仍无 Creator，不要假装已出 `build/web-desktop`，自评只报代理分，未真机不出 8.5。

## 第一局体验代理（无 Creator，非实机证据）

```bash
npm install
node tools/first-run-preview/serve.mjs
```

浏览器打开 **http://127.0.0.1:8766/** 。

- 复刻教学→抛竿→弱点→翻扑→捡起→入箱→卖出→回港。
- 文案 / CTA / 色板 / juice 参数从 `assets/scripts/domain` 抽出。
- **不是** Creator 预览，**不是** web-desktop，**不是** 微信真机。**2D 代理 ≠ Creator 3D 港湾/低模鱼。** 报告里只能写「代理分」。3D 路线见 `docs/STAGE_3D.md`。

自动点完并截图（需 Chrome + `puppeteer-core`）：

```bash
npm install --no-save puppeteer-core
node tools/first-run-preview/playtest.mjs
```

## 微信小游戏

1. 构建面板选「微信小游戏」（`build-config.wechat.json`）。把 AppID 换成自己的，**不要提交**。
2. `npm run postbuild:wechat`。
3. 用微信开发者工具打开 `build/wechatgame/`。
4. 云函数见 `docs/CLOUD_SETUP.md`；提审见 `docs/RELEASE_CHECKLIST.md`。
