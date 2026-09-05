# 场景目录

当前唯一官方运行时是 **Boot.scene → RuntimeHome → RuntimePrototype**。

用 Cocos Creator 3.8 按 `docs/SCENE_SETUP.md` 生成 `Boot.scene`（保留 Canvas 即可）。`RuntimeAutoStart` 会挂上 `RuntimeHome`。不要创建 `Home.scene`，也不要挂 `GameBootstrap`。场景序列化由编辑器维护，不手写或跨版本复制。
