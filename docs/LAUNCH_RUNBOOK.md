# 阶段 6 发布运行手册

本手册只描述真实发布流程。仓库当前未宣称 CrazyGames Basic/Full Launch 或 Google Play 封闭测试完成。所有标为 **BLOCKED（人工/后台）** 的步骤必须由有权限的人用真实账号、真实设备或真实资料完成。

## 0. 本地发布门禁

1. 复制 `.release.env.example` 为不提交的 `.release.env`，仅填写真实证据路径和状态；不得写入密钥。
2. 运行 `npm run validate`、`npm run simulate`、`npm run preflight:platforms`。
3. 用真实数据分别运行：
   - `npm run playtest:report -- <playtest.csv-or-json>`
   - `npm run metrics:crazygames -- <metrics.csv-or-json>`
   - `npm run testers:google -- <testers.csv-or-json> <YYYY-MM-DD>`
4. 运行 `npm run release:readiness`。任何非零退出都表示不可发布；查看 `reports/launch-readiness.json`。

## 1. Cocos Creator Web 构建

1. 安装并使用项目固定版本 Cocos Creator 3.8.8，打开项目后确认 Boot 场景。
2. 选 Web Desktop，导入 `build-config.web.json`，关闭调试和 source map 后构建。
3. 检查 `build/web-desktop` 可启动、首包小于 20 MiB，并在真实浏览器完成冷启动、教学、三局、存档恢复和 SDK 缺失降级测试。
4. 将实际目录写入 `RELEASE_WEB_BUILD_DIR`。

**BLOCKED（本机软件/真人）**：当前机器没有 Cocos Creator 3.8.8，无法生成或真人验证 Web 构建。

## 2. CrazyGames Basic Launch

1. **BLOCKED（平台账号）**：登录 CrazyGames 开发者后台，创建游戏并按平台要求集成官方 HTML5 SDK。
2. 上传上一步真实 Web 包；不得上传源码、DRAFT 素材或声称尚未实现的功能。
3. **BLOCKED（后台审核）**：填写资料、隐私 URL、分类和真实截图，提交 Basic Launch 审核。
4. 从平台导出真实日数据到 `launch-data/crazygames-basic-metrics.template.csv` 同结构文件，保留日期、plays、1 分钟玩家、总游玩秒数、D1 分母/回访数。
5. 门禁为 plays ≥500、观测 ≥7 天、1 分钟转化 ≥80%、D1 ≥12%。平均时长仅报告，不设本地硬门槛。
6. 即使本地门禁通过，也只能写“达到内部目标”；**CrazyGames 平台实际决定 Full Launch**。

## 3. Android / Google Play 封闭测试

1. 用 Cocos Creator 3.8.8 选择 Android，导入 `build-config.android.json`，生成 Gradle 工程。
2. **BLOCKED（签名凭据）**：用正式 keystore 生成签名 AAB；密钥和密码只能放安全凭据系统，不能进入仓库。
3. **BLOCKED（Play Console）**：创建应用、完成内容分级/数据安全/商店资料/国家地区设置，上传 AAB 到 closed track。
4. **BLOCKED（真人招募）**：招募 15–18 名真实测试者，为门槛留流失余量；只记录匿名 `testerId`。
5. 使用 `launch-data/google-closed-testers.template.csv` 记录真实 opt-in、opt-out、反馈和 build。门禁要求至少 12 人各自连续 14 天且有实际反馈；不得预填假人。
6. **BLOCKED（Play Console）**：审核测试资格、处理预发布报告和平台政策问题，再决定是否申请生产发布。

## 4. 商店素材、隐私、收款和税务

1. 按 `docs/STORE_ASSET_CHECKLIST.md` 从真实构建拍摄并人工验收至少 5 张图，放入不含 DRAFT 的发布素材目录。
2. **BLOCKED（法务/站点）**：将 `docs/PRIVACY_TEMPLATE.md` 校对为实际数据实践，发布到 HTTPS 公网 URL，并在后台填写。
3. **BLOCKED（主体/银行/税务）**：由真实经营主体完成平台收款资料、银行账户、税务表单、发票及当地合规审核。
4. **BLOCKED（生产配置）**：在平台后台配置 SDK/商品/服务账号；仓库只能记录“已核验”状态，不保存 token、私钥或密码。

## 5. 发布与回滚

1. 发布前保存构建号、AAB/Web 包哈希、数据配置版本、素材版本和门禁报告。
2. 先小范围/封闭轨道观察崩溃、启动、存档、支付和 P0；出现 P0 立即暂停推广。
3. CrazyGames：**BLOCKED（后台）** 下架当前包或重新上传上一已验证 Web 包。
4. Google Play：**BLOCKED（后台）** 停止 rollout；若平台不允许降 versionCode，则基于上一稳定代码构建更高 versionCode 的回滚 AAB。
5. 记录事故时间、影响构建、指标、处置和复测证据。没有真实后台结果时不得写“回滚成功”。
