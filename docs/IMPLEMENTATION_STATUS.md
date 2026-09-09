# 实施状态

## 官方运行时（已接线）

当前唯一官方运行时是 **Boot.scene → RuntimeHome → RuntimePrototype**。Canvas 只挂 RuntimeHome；出海再挂 RuntimePrototype。

`GameBootstrap`、`Battle*`、`TutorialController` 是编辑器实验/未接线代码，不要写成已交付。不存在 `Home.scene`。

## 灰盒已完成

- 产品规格、原创边界与微信审核表达。
- 港口、出海扑腾、独立教学关、五岛、22种鱼、3个首领及长期进度曲线。
- 甲板短滑、逃水、弱点击退、下半屏拖运、空中砸窗口、精彩倍率和新鲜度反馈。
- 教学完成前用 `TutorialFlow.harborUnlocks` 锁定升级、图鉴和榜；首售11金、鱼竿2级90金。
- 每日订单、周挑战、无尽潮、鱼类熟练度、工具分支和浮台升级。
- 微信、本地Web、CrazyGames和Android平台适配，以及广告/IAP接入骨架。
- 本地/云存档、删档、远程配置、埋点、服务端成绩校验与Google Play票据验证。
- 潮退浮站世界壳（Ocean / Horizon / RaftRoot / 订单板 / 渔夫灰盒）、程序化低多边形美术、分层合成音效和四张Creator实拍清单。
- CI、包体预检、自动数值模拟、平台发布门禁与20–50人体验测试材料。
- Cocos Creator 3.8.8已确认安装，Boot场景可导入并完成正式Web构建。
- `build/web-desktop` 实测为约2.40 MiB，浏览器冷启动、3D场景、中文HUD和键鼠输入冒烟通过。
- 修复运行时UI节点未进入UI相机图层的问题，并加入全屏响应式Web模板与回归门禁。

## 需要发行主体或真人完成

- 在微信公众平台注册小游戏AppID、云环境和数据库集合，部署全部云函数（含 `deleteSave`）。
- 用至少4台真机生成体验版测试结果。
- 招募20–50名真人填写体验表；未达到20条时 `npm run playtest:report` 会主动失败。
- 准备软著、版号/备案、隐私政策主体信息与最终素材授权。
- 配置Android SDK/NDK、正式签名、Google Play商品与AdMob参数，生成签名AAB。
- 提供CrazyGames和Google Play真实账号、SDK参数及隐私政策公开地址。
- 用真实构建完成完整教学、结算、商店、图鉴和多轮存档的人工验收，并制作最终商店素材。
- 后台填写正式隐私指引；健康游戏忠告需在真机启动画面再确认一遍。

这些是账号、设备、资质或真人参与事项，不能由源码自动生成，也不能用模拟数据冒充。
