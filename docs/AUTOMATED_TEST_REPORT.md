# 自动化验证报告

## 结果

- TypeScript领域层类型检查：通过。
- Vitest：3个测试文件、84个测试通过（含自绘矢量鱼/码头/水面、统一 GameFeel 色板/按钮规格、卖出金币雨与入箱弹跳、教学挖洞更干净、抛竿 cast juice/线闪低配减弱、精彩倍率 HUD 只在上涨时跳动、图鉴新纪录 toast、教学旁白不被潮汐句覆盖、教学底栏单主橙、买不起升级不抢港口主 CTA、命中入箱 juice 决策、港口下一步 CTA、首次角标与金币跳字、教学开关、港口解锁、捡起超时、岛分包失败留港、微信登录桩）。
- 第一局体验代理抽取：`npm run preview:extract` 通过（湾鳍入箱 11金 ×1.34）。**代理非实机证据。**
- `node tools/try-web-desktop-build.mjs`：本环境无 Creator，按设计 exit 2，不假装已出 web-desktop。
- 云函数与开放数据域JavaScript语法检查：通过。
- 预检：4个配置JSON有效；`assets/config` 与 `assets/resources/config` / `bundledConfig` 一致；主包候选源码低于4MiB红线。
- `tools/playtest-live.mjs`：`node --check` 通过；本环境无 web 构建，脚本按设计清晰失败，未实跑浏览器。
- 50个确定性经济模拟角色：
  - P10解锁风眼环礁：16.4分钟
  - 中位数：24.5分钟
  - P90：30.5分钟
  - 设计目标：22–34分钟，中位和P90落在目标范围

详细个体数据见`reports/automated-balance-report.json`（本地 `npm run simulate` 生成，不提交）。

## 限制

这份报告验证数值边界、配置引用和经济节奏，不是人类可用性测试。首次捕获时长、教学完成率、第三局到达率和卖点理解率必须使用体验版招募20–50名真实玩家后填写`playtest/participants.csv`，再运行`npm run playtest:report`。真人有效行不足20条时该命令会主动失败，这是设计。
