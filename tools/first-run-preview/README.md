# 第一局体验代理

**非 Cocos 实机，仅体验代理。**

本目录是给没有 Creator / `build/web-desktop` 时用的临时轻量灰盒：单页 DOM+canvas，复刻 `RuntimeHome` → `RuntimePrototype` 新档第一局（港口 → 教学四步 → 卖鱼 → 回港）。

- 旁白、按钮标签、引导圈、结算行、金币跳字、首次角标都从源码常量/函数生成，不另写一套文案。
- 主 CTA 暖橙、次要深青，颜色取自 `GameFeel.buttonFillRgb`。
- 命中/入箱跳字取自 `StyleCallout`；粒子参数取自 `HitJuice`。
- 不是微信真机，也不是 Cocos 预览。甲板扑腾、瞄准手感、音效震动都不在这里。

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

截图写到 `reports/first-run-proxy/`（`reports/` 本身不提交）。有界面慢点一遍（给录像用）：

```bash
node tools/first-run-preview/playtest-visible.mjs
```
