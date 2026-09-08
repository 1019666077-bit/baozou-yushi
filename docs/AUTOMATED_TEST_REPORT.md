# 自动化验证报告

## 结果

- TypeScript领域层类型检查：通过。
- Vitest：6个测试文件、112个测试通过（含 **C 首局经济**：教学入箱预算≤60s、兜底 40+10+10、11/90 不抢出海 CTA、还差 79/再出海能补、保守泡沫湾最多 2 趟补缺口、买不起升级钮写还差79、进度条只在缺口时露；以及甲板刚体短滑移/逃水/击退/下半屏拖运入箱/空中砸窗口与完美高光/精彩倍率 `×旧→×新`、Creator 预览/4 张截图路径、示意图禁止冒充实机、缺 Creator exit 2、顶点波水面、剪影鱼 5 件套与更大弱点、港口分层网格预算、2.5D 相机跟线俯视/微震/翻扑抬镜且低配关闭、程序几何包体预算、ArtRecipe 分层海/笔触木纹/砸痕星爆/湾鳍鳞列鳃与弱点、教学入箱后圈回港、自由局单主橙、卖完主目标写还差进度 11/90 与卖出衔接、回港 HUD 分层不叠忠告、升级失败短 toast 不盖主目标、去鱼箱步隐藏抛竿/捡起、日落港口色板、选岛「教学后」文案、超时先提示再兜底且刚点击不抢、首局卖价低于首升级、自绘矢量鱼/码头/水面、统一 GameFeel 色板/按钮规格、卖出金币雨与入箱弹跳、砸甲板 smash juice、教学挖洞更干净、抛竿 cast juice/线闪低配减弱、精彩倍率 HUD 只在上涨时跳动、图鉴新纪录 toast、教学旁白不被潮汐句覆盖、教学底栏单主橙、买不起升级不抢港口主 CTA、命中入箱 juice 决策、港口下一步 CTA、首次角标与金币跳字、WebAudio 占位音效标明非真机、教学开关、港口解锁、捡起超时、岛分包失败留港、微信登录桩）。**代理非实机证据；2D/辅助 ≠ Creator 3D。不合 main。**
- 第一局体验代理抽取：`npm run preview:extract` 通过（湾鳍入箱 11金 ×1.34）。**代理非实机证据。**
- `node tools/try-web-desktop-build.mjs`：本环境无 Creator，按设计 exit 2，文案含「缺 Creator」，不假装已出 web-desktop。
- `npm run shots:list`：打印 4 张清单（`01_harbor_wide.png` / `02_dock_near.png` / `03_bayfin_weak.png` / `04_flop_smash.png`）；`docs/stage3d/creator-shots/` **0/4**（空是预期，未伪造 png）。代理 / first-run-preview / expect 示意图一律不算证据。
- 云函数与开放数据域JavaScript语法检查：通过。
- 预检：4个配置JSON有效；`assets/config` 与 `assets/resources/config` / `bundledConfig` 一致；主包候选源码低于4MiB红线。
- `tools/playtest-live.mjs`：`node --check` 通过；本环境无 web 构建，脚本按设计清晰失败，未实跑浏览器。
- 50个确定性经济模拟角色：
  - **C 改动**：开局先入账教学 11 金（改前从 0 起算）。标价 11/90 未改。
  - 首次买竿 2 级：P10 3 分钟 / 中位 3 / P90 6（1–2 趟泡沫湾，对「再出海能补」）。
  - 解锁风眼环礁：P10 16.4 / 中位 24.5 / P90 30.5（**与改前相同**，+11 金未推动后期曲线）。
  - 设计目标：22–34分钟，中位和P90落在目标范围

详细个体数据见`reports/automated-balance-report.json`（本地 `npm run simulate` 生成，不提交）。

## 限制

这份报告验证数值边界、配置引用和经济节奏，不是人类可用性测试。首次捕获时长、教学完成率、第三局到达率和卖点理解率必须使用体验版招募20–50名真实玩家后填写`playtest/participants.csv`，再运行`npm run playtest:report`。真人有效行不足20条时该命令会主动失败，这是设计。
