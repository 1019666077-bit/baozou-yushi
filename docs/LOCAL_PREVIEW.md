# 本地预览与出包（最短）

Cocos Creator **3.8.8**。仓库不提交真实 AppID / 云环境 ID；本地替换即可。

**期望构图 ≠ Creator / 真机。** `docs/stage3d/expect_*.jpg` 是示意图（标题和水印已写清），**不能**冒充实机截图。

## 幕僚长代验：先看这条

**云端 / CI 没有 Cocos Creator，不能打出 `build/web-desktop`，也不能当真机手感证据。**

| 路径 | 命令 | 算不算实机 |
| --- | --- | --- |
| 第一局体验代理（当前唯一无 Creator 可点） | `node tools/first-run-preview/serve.mjs` → http://127.0.0.1:8766/ | **不算。** 2D/辅助 ≠ Creator 3D；无甲板扑腾/透视相机/微信震动 |
| 本机 Creator 预览 | 打开仓库 → `Boot.scene` → 预览 | 编辑器预览，仍非微信真机；**可以**截 4 张当 3D 证据 |
| 本机 web-desktop | 见下节，产物 `build/web-desktop/` | 接近 Runtime，仍非微信真机 |
| 命令行出包 | `node tools/try-web-desktop-build.mjs` | 找不到 Creator 会 **清晰失败（exit 2，文案含「缺 Creator」）**，不假装已出包 |
| 4 张截图清单（给人看） | `node tools/stage3d-shot-checklist.mjs` | 只打印步骤；云端 0/4 是预期 |

代理截图在 `tools/first-run-preview/shots/`，目录说明写了「非 Cocos 实机」。
Creator 4 张应丢 `docs/stage3d/creator-shots/`（现在是空目录 + README，**未伪造 png**）。

## Creator 预览应感到的身体感（Boot.scene，本刀 A+B）

`:8766` 代理**不算过关**。有 Creator 时打开 `Boot.scene` 预览，应能感到：

1. **甲板刚体**：鱼摔上码头后会弹一下、带着质量短滑，不是瞬贴在木板上。
2. **逃水**：不管它会往海里滑、再跳回去，旁白能读出「在滑 / 要跳 / 跳回去了」。
3. **击退**：打中、打弱点、空中砸会把鱼弹出一个方向，重鱼弹得短。
4. **搬运**：捡起后用**下半屏拖**到左边鱼箱；碰到箱子吸入，松在海里会跑，松在甲板会掉。
5. **半屏**：左右垫、抛竿/捡起/丢掉都在下半屏，上半是海。
6. **空中砸**：鱼在空中时身上有可砸圈；接近顶点变成「完美窗口」高光。
7. **倍率**：左上「精彩 ×」上涨时会闪金并写出 `×旧→×新 ↑`，一眼能懂。

这是 Creator 手感目标，不是代理截图任务。不要再刷 `first-run-preview` 九宫格。

## 最短：Creator 预览 → 截 4 张

本机有 Creator 时只做这件事，用来降低代验摩擦：

1. **打开工程**：Creator 3.8.8 → 打开本仓库**根目录**（不要打开 `assets/` 子文件夹）。
2. **开场景**：资源管理器打开 `assets/scenes/Boot.scene`。
3. **预览**：点工具栏播放，或 Windows `Ctrl+P` / macOS `Cmd+P`。应进入港口（RuntimeHome）。装配见 `docs/SCENE_SETUP.md`。
4. **截 4 张**，原样 png 丢进 `docs/stage3d/creator-shots/`（文件名对齐，不要改成 `expect_*.jpg`）：

| # | 文件 | 何时截 | 应看到什么 |
| --- | --- | --- | --- |
| 1 | `01_harbor_wide.png` | 刚进港口，不要点出海 | 透视近/中/远海 + 矮波；左侧码头市集；远处三岛分层；日落侧光；下方 2D 主橙「开始教学」 |
| 2 | `02_dock_near.png` | 仍在港口，拉近左侧码头 | 栏杆、台阶、青箱；棚架立柱和金幌；停泊小船；能看清木头厚度 |
| 3 | `03_bayfin_weak.png` | 点「开始教学」出海，抛竿打中后停在侧脸 | 鱼 5 件：身 / 浅色脸 / 鳞片色块 / 尾 / **背上大金弱点** |
| 4 | `04_flop_smash.png` | 翻扑最高点或砸到甲板的瞬间 | 抛物线飞向码头；镜头略抬；砸甲板短压扁 |

打印同一份清单：

```bash
node tools/stage3d-shot-checklist.mjs
```

对照用的示意图（**期望构图 ≠ Creator/真机**）在 `docs/stage3d/`，可用浏览器打开 `docs/stage3d/gallery.html`。云端没有 Creator，**不能**用代理截图或示意图冒充这 4 张。没有这 4 张就不能把 3D 估分坐实。

## web-desktop 最短出包（必须本机 Creator）

编辑器里点一次即可，**不要指望云端代跑**：

1. 菜单 **项目 → 构建发布**。
2. 平台选 **web-desktop**（可导入 `build-config.web.json`）。
3. 起始场景 `Boot.scene`，输出目录默认 `build/web-desktop/`。
4. 点构建。完成后：

```bash
npx --yes serve build/web-desktop -l 8765
```

浏览器打开 http://127.0.0.1:8765/ 。也可以从这里截上面 4 张，同样丢进 `docs/stage3d/creator-shots/`。

实跑脚本：

```bash
PLAYTEST_URL=http://127.0.0.1:8765/ node tools/playtest-live.mjs
```

没有 `build/web-desktop/index.html` 时，`playtest-live` **按设计失败**，不会跳过。

命令行尝试（本机设了 `COCOS_CREATOR` 才可能成功）：

```bash
# 只探测，不构建（无 Creator 也只打印「缺 Creator」，exit 0）
node tools/try-web-desktop-build.mjs --probe-only

# 有 Creator 就出包；没有则 exit 2，文案含「缺 Creator」
COCOS_CREATOR=/path/to/CocosCreator node tools/try-web-desktop-build.mjs
```

当前云端探测结果：无 Creator 可执行文件，默认模式 exit 2。云端若仍无 Creator，不要假装已出 `build/web-desktop`，自评只报代理分，未真机不出 8.5。

## 第一局体验代理（无 Creator，非实机证据）

```bash
npm install
node tools/first-run-preview/serve.mjs
```

浏览器打开 **http://127.0.0.1:8766/** 。

- 复刻教学→抛竿→弱点→翻扑→捡起→入箱→卖出→回港。
- 文案 / CTA / 色板 / juice 参数从 `assets/scripts/domain` 抽出。
- **不是** Creator 预览，**不是** web-desktop，**不是** 微信真机。**2D/辅助 ≠ Creator 3D 港湾/低模鱼。** 顶栏必须写明这一点。报告里只能写「代理分」。3D 路线见 `docs/STAGE_3D.md`。

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
