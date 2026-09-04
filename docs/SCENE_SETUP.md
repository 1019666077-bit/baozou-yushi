# Cocos场景装配

当前环境未安装Cocos Creator，`.scene`序列化文件必须由Creator 3.8编辑器生成，不能用普通JSON稳定伪造。首次打开项目后按下列步骤装配，脚本和配置已经就位。

## Boot.scene

1. 新建2D场景 `assets/scenes/Boot.scene`，设计分辨率1280×720，横屏适配。
2. 根节点新建 `App`，挂载 `GameBootstrap`。
3. 新建 `BattleRoot`，挂载 `BattleController`、`HookSystem`、`WeaponSystem`、`FishSpawner`、`IslandRunController`和`BossController`。
4. 新建 `Player` 与 `FishRoot`；将它们分别拖到 `BattleController.player` 和 `HookSystem.fishRoot`。
5. 将四个JSON拖到 `GameBootstrap`：
   - `assets/config/fish.json`
   - `assets/config/tools.json`
   - `assets/config/islands.json`
   - `assets/config/remote-default.json`
6. 将 `BattleController`与`IslandRunController`分别拖到`GameBootstrap.battle`和`GameBootstrap.islandRun`。
7. 创建一个只含`UITransform`的鱼Prefab，拖到`FishSpawner.fishPrefab`；运行时`FishView`会绘制灰盒鱼。
8. 按字段连接`FishSpawner.fishRoot`、`IslandRunController.spawner/boss`和`BattleController.hook/weapon`。

## Home.scene

港口主页包含金币、工具升级、图鉴、岛屿入口和好友榜五个区域。主页不加载任何岛屿贴图；点击岛屿后先显示轻量加载页，再加载对应Asset Bundle。

## 分包

- `assets/bundles/island_foam_bay`
- `assets/bundles/island_prism_reef`
- `assets/bundles/island_storm_eye`

在各文件夹Bundle设置中勾选“小游戏分包”。主包只保留Boot、Home、教学最低资源和系统字。

## 构建设置

- 平台：微信小游戏
- 初始场景：Boot
- 屏幕方向：Landscape
- 物理：关闭；不启用Bullet/Ammo
- 引擎模块：开启3D与primitive（透视方块甲板），关闭粒子3D、地形、后处理
- 战斗里HUD仍是Canvas 2D，海面/船/鱼由运行时DeckStage生成
- iOS高性能模式：真机测试通过后再开
- AppID、云环境ID与广告位ID只写本机构建设置，不提交源码

完成装配后必须在微信开发者工具生成体验版，编辑器预览不算验收。
