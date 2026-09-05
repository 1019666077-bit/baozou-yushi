# 实施状态

## 官方运行时（已接线）

当前唯一官方运行时是 **Boot.scene → RuntimeHome → RuntimePrototype**。Canvas 只挂 RuntimeHome；出海再挂 RuntimePrototype。

`GameBootstrap`、`Battle*`、`TutorialController` 是编辑器实验/未接线代码，不要写成已交付。不存在 `Home.scene`。

## 灰盒已完成

- 产品规格、原创边界与微信审核表达。
- 港口、出海扑腾、教学关（新玩家默认开）、三岛、6普通鱼、3精英鱼、1首领及30–45分钟数值曲线。
- 教学完成前用 `TutorialFlow.harborUnlocks` 锁升级/图鉴/榜。
- 本地/云存档、删档云函数、远程配置、埋点；成绩只走 `submitScore` + 共用校验。
- 低配保护、对象池、包体预检、自动数值模拟。
- 隐私文案与真实采集项对齐；启动路径先隐私授权，再 `wx.login` + 云初始化（非微信/登录失败降级为本机档，不阻断灰盒）。
- 岛分包加载失败时留在港口并可重试；教学关无真实 bundle，直接成功。
- 开放数据域以 `wechat-open-data/` 为准。
- CI：`npm run validate` 与 `npm run simulate`。

## 需要发行主体或真人完成

- 在Cocos Dashboard登录并安装Creator 3.8.8，然后按 `docs/LOCAL_PREVIEW.md` 预览 `Boot.scene`。
- 在微信公众平台注册小游戏AppID、云环境和数据库集合，部署全部云函数（含 `deleteSave`）。
- 用至少4台真机生成体验版测试结果。
- 招募20–50名真人填写体验表；未达到20条时 `npm run playtest:report` 会主动失败。
- 准备软著、版号/备案、隐私政策主体信息与最终素材授权。
- 后台填写正式隐私指引；健康游戏忠告需在真机启动画面再确认一遍。

这些是账号、设备、资质或真人参与事项，不能由源码自动生成，也不能用模拟数据冒充。
