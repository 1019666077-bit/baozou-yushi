# 出海钓鱼预览

第一人称画面在 `play.ts`，规则直接加载 `assets/scripts/fishing/`。打包后是静态页，不是 Cocos 实机。

```bash
node tools/fishing-preview/build-static.mjs
```

用浏览器打开 `docs/fishing-play/index.html`。不需要服务器。说明见 `docs/fishing-play/README.md`。

截图（需要本机 Chrome）：

```bash
node tools/fishing-preview/record.mjs
```

输出在 `docs/fishing/`，并会在 375×667 和 414×896 上检查商店文字有没有压住按钮。
