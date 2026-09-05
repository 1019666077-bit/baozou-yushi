# 技术架构

## 官方运行时

当前唯一官方、已接线的运行时是：

**`Boot.scene` → `RuntimeAutoStart` 把 `RuntimeHome` 挂到 Canvas → 出海时挂 `RuntimePrototype`。**

`GameBootstrap`、`battle/*` 场景组件、`TutorialController` 属于编辑器实验/未接线代码，不要当作已交付主路径。不存在 `Home.scene`。

## 分层

- `RuntimeHome` / `RuntimePrototype`：当前主路径的港口与海面灰盒。
- `world/HarborStage` + `world/DeckStage`：2.5D 程序低模（透视世界 + Screen Space UI）；失败回退 `GrayArt`。详见 `docs/STAGE_3D.md`。
- `battle/`：编辑器战斗组件，只处理场景节点、输入和表现；**未挂到 Boot.scene**。
- `domain/`：无引擎依赖的确定性规则，可在Node环境测试。甲板身体感在 `FlopPhysics` / `PlayLayout`（半屏、逃水、砸窗口）。
- `data/`：JSON配置与强类型定义。
- `platform/`：微信API与浏览器预览差异。
- `save/`：本地优先、版本号冲突合并；删除走 `deleteSave` 云函数。
- `cloudfunctions/`：云存档、删档、排行榜校验和远程配置。

## 数据流

玩家输入由 `RuntimePrototype` 转为领域事件；`CaptureEngine`处理韧性和收杆，`StyleScoreSystem`计算精彩度，`PriceCalculator`结算售价。每局产生不可变`RunSummary`，本地先保存，再异步上传云函数校验。好友榜成绩只走 `submitScore`（共用 `shared/scoreValidator.js`），客户端不直写 `setUserCloudStorage`。

## 约束

- 领域层不能导入`cc`。
- 业务数值只能来自JSON配置。
- 微信API只能从`WechatAdapter`调用。
- 所有云调用失败时，单人战斗必须继续可玩。
- 客户端成绩不可信，排行榜只接受云函数校验后的分数。
- 同屏鱼、弹道与特效都必须走对象池并设置硬上限。
- 开放数据域源码以仓库根目录 `wechat-open-data/` 为准。
