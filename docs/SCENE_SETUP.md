# Cocos场景装配

当前环境未安装Cocos Creator，`.scene`序列化文件必须由Creator 3.8编辑器生成，不能用普通JSON稳定伪造。首次打开项目后按下列步骤装配，脚本和配置已经就位。最短预览 / 出包 / 4 张截图见 `docs/LOCAL_PREVIEW.md`。期望构图示意图 ≠ Creator/真机。

## 当前唯一官方运行时

**Boot.scene → RuntimeHome → RuntimePrototype**

`assets/scripts/RuntimeAutoStart.ts` 在场景启动后自动把 `RuntimeHome` 挂到名为 `Canvas` 的节点上。不要再挂 `GameBootstrap`。

## Boot.scene

1. 新建2D场景 `assets/scenes/Boot.scene`，设计分辨率1280×720，横屏适配。
2. 保留默认 `Canvas`。运行后 `RuntimeAutoStart` 会挂 `RuntimeHome`；出海时再挂 `RuntimePrototype`。
3. 不要创建 `Home.scene`，也不要在 Boot 上挂 `GameBootstrap` / `BattleController` / `TutorialController`。
4. 四个 JSON 的单一真相源是 `assets/config/*.json`，已打进 `bundledConfig`；主路径不依赖编辑器拖引用。改配置后跑 `npm run sync:config`，把 `assets/resources/config/` 镜像一起对齐。
5. 灰盒海面/船/鱼由 `HarborStage` / `DeckStage` 程序低模绘制（2.5D），失败则 2D `GrayArt` 回退。不需要先做鱼 Prefab。3D 路线见 `docs/STAGE_3D.md`。

## 编辑器实验栈（未接线，不要当已交付）

下列脚本仍在仓库里，供编辑器对照或日后接线，**当前场景未挂、主路径不走**：

- `GameBootstrap`
- `BattleController`、`HookSystem`、`WeaponSystem`、`FishSpawner`、`BossController`
- `IslandRunController`、`TutorialController`
- `HomeController`、`BattleHud`、`BattleInput`

不要按旧文档去找 `Home.scene`：港口 UI 由 `RuntimeHome` 在 Boot 的 Canvas 上即时创建。

## 分包

- `assets/bundles/island_foam_bay`
- `assets/bundles/island_prism_reef`
- `assets/bundles/island_storm_eye`

在各文件夹Bundle设置中勾选“小游戏分包”。主包只保留 Boot、教学最低资源和系统字。教学关 `island_tutorial` 不走分包。

## 构建设置

- 平台：微信小游戏
- 初始场景：Boot
- 屏幕方向：Landscape
- 启动画面：开启（`build-config.wechat.json` 的 `useSplashScreen`），用于健康游戏忠告；Cocos 默认 Logo 仍由 postbuild 去掉
- 物理：关闭；不启用Bullet/Ammo
- 引擎模块：开启3D与primitive（透视方块甲板），关闭粒子3D、地形、后处理
- HUD 仍是 Canvas 2D（Screen Space）。港湾/海面/船/鱼由运行时 HarborStage + DeckStage 生成；关阴影与后处理
- iOS高性能模式：真机测试通过后再开
- AppID、云环境ID只写本机构建设置，不提交真实值。配置里的 `wx6ac3f5090a6b99c5` 是 Cocos 默认占位，本地必须替换
- **未接入广告 SDK**，不要填写或提交广告位 ID

开放数据域源码目录是仓库根下的 `wechat-open-data/`（不是 `assets/open-data`）。构建模板见 `templates/game.json`，postbuild 会把该目录拷进微信构建产物。

完成装配后必须在微信开发者工具生成体验版，编辑器预览不算验收。
