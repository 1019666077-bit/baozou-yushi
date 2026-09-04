# 技术架构

## 分层

- `battle/`：Cocos组件，只处理场景节点、输入和表现。
- `domain/`：无引擎依赖的确定性规则，可在Node环境测试。
- `data/`：JSON配置与强类型定义。
- `platform/`：微信API与浏览器预览差异。
- `save/`：本地优先、版本号冲突合并。
- `cloudfunctions/`：云存档、排行榜校验和远程配置。

## 数据流

玩家输入由场景组件转换为领域事件；`CaptureEngine`处理韧性和收杆，`StyleScoreSystem`计算精彩度，`PriceCalculator`结算售价。每局产生不可变`RunSummary`，本地先保存，再异步上传云函数校验。

## 约束

- 领域层不能导入`cc`。
- 业务数值只能来自JSON配置。
- 微信API只能从`WechatAdapter`调用。
- 所有云调用失败时，单人战斗必须继续可玩。
- 客户端成绩不可信，排行榜只接受云函数校验后的分数。
- 同屏鱼、弹道与特效都必须走对象池并设置硬上限。
