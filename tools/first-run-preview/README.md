# 第一局体验代理

**非 Cocos 实机，仅 2D 辅助体验代理。2D/辅助 ≠ Creator 3D 港湾/低模鱼，不能当真机手感 / 3D 画面证据。**

本页是当前可浏览器代验的主路径。3D / Creator 文档仍在 `docs/STAGE_3D.md`，**不阻塞**这套代理。`docs/stage3d/expect_*.jpg` 是示意图：期望构图 ≠ Creator/真机。真机 4 张仍只认 `docs/stage3d/creator-shots/`（现为空是预期）。

本目录是给没有 Creator / `build/web-desktop` 时用的临时轻量灰盒：单页 DOM+canvas，复刻 `RuntimeHome` → `RuntimePrototype` 新档第一局（港口 → 教学四步 → 卖鱼 → 回港）。

- 旁白、按钮标签、引导圈、结算行、金币跳字、首次角标都从源码常量/函数生成，不另写一套文案。
- 主 CTA 暖橙、次要深青，色板/圆角/描边取自 `GameFeel`（与 RuntimeHome/Prototype 共用）。底板、字重、主橙渐变仍自绘。
- 海景/船/鱼/码头/鱼箱跟 Runtime 自绘同一套休闲钓鱼皮肤，代理再叠插画层（猎场浪脊/焦散/深度色带/泡沫、近景市集、远舟、天光）。港口选岛条上提、渔具靠左码头，中屏让出海景。
- 湾鳍有轮廓线、鳞列/鳍骨/鳃、眼部表演（虹膜/高光/眨眼）和水下折射。
- 教学抛竿仍可自动落到甜区；**教完后的自由局必须再点「甩出」**，早/晚是普通命中，准时才精彩倍率。蓄力条有甜区描边、刻度和针。
- 翻扑落地冻结加长，砸痕星爆/裂纹/扬尘加「砸！」字，静帧能读出砸拍。命中/入箱/卖出跳字取自 `StyleCallout`。
- WebAudio **按事件分层的占位音效**，顶栏标明 ≠ 真机。
- 教学旁白用 `battleWaveNarration`，不被潮汐句盖住；底栏主橙只给当前步。
- 买不起升级不抢港口主 CTA（与 `harborNextCta` 一致）；卖完主目标写攒够进度（11/90）。
- 卖完回港只留主目标一句；云档/忠告/发现 toast 降权或延迟，失败反馈不盖主目标。
- 去鱼箱步底栏只露「丢掉入箱」，不露抛竿/捡起。
- 入箱后圈「回港」，教学选岛写「教学后」；超时先提示再兜底。
- 不是微信真机，也不是 Cocos 预览。**2D 代理 ≠ Creator 3D。** 甲板扑腾、透视跟镜、音效震动都不在这里。

## 怎么开

在仓库根目录：

```bash
node tools/first-run-preview/serve.mjs
```

浏览器打开 http://127.0.0.1:8766/

`serve.mjs` 会先跑 `extract-copy.mjs`，把 `assets/scripts/domain/` 里的教学/结算/手感函数编成 `generated/`（不提交），再给预览用。

## 自动点完第一局

```bash
node tools/first-run-preview/playtest.mjs
```

截图写到 `reports/first-run-proxy/`（`reports/` 本身不提交）。仓库里留了 6 张关键步：`shots/`（**非 Cocos 实机**，仅代理预览）。有界面慢点一遍（给录像用）：

```bash
node tools/first-run-preview/playtest-visible.mjs
```
