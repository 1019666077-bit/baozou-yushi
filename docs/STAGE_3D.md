# 2.5D 画面路线（港湾 / 猎场）

## 选定路线

**先 2.5D，不上全 3D UI。**

- 世界：透视相机 + 程序低模（顶点波水面、分层码头/市集/岛、船、鱼 5 件套）。
- 材质：优先 `builtin-standard`（一盏平行光真正塑形），失败回退 `builtin-unlit`。**零贴图**（不用 256 法线，改顶点波）。
- UI：仍是 Canvas Screen Space（主橙 CTA、教学挖洞、结算）。
- 领域层 / 教学 / 经济不改。3D 只是表现层；`DeckStage` 失败则回退 2D `GrayArt`。

不选全 3D UI 的理由：微信小游戏改 Overlay Canvas 成本高，且会碰教学闭环（挖洞、单主橙）。本 tip 只把「看起来像海」的部分抬到 3D。

## 本 tip 已落地

| 模块 | 行为 |
| --- | --- |
| `HarborStage` | 港口/结算 3D 港湾：近/中/远三层水面、码头栏杆台阶、市集棚架、三岛分层剪影、停泊小船。侧光塑形。UI 仍 2D。 |
| `DeckStage` | 猎场：低模鱼（身/脸/鳞片色块/尾/弱点），弱点更大并轻脉冲；砸甲板短挤压。 |
| `CameraFeel` | 抛竿跟线（略低头看海）、命中微震、翻扑抬镜；低配全关。时长 ≤0.15s，不挡点击。 |
| `ProcGeom` | 零件清单、顶点波公式与包体预算，可单测。 |
| 回退 | primitives 关闭或无 scene 时仍画 2D 海景。 |

## 下一步（未做，不假装）

- 真机上看合批与 45FPS；必要时把 sphere 段数再降。
- 本机 Creator 打 `web-desktop` 才能当 3D 手感证据。云端**没有** Creator 预览包。
- `docs/stage3d/creator-shots/` 仍是空占位，**未伪造** 4 张 png。有 Creator 的人截完才能把估分坐实。
- 256 滚动法线仍是备选，本 tip 用顶点波保持 0 贴图。

## 包体 / 性能

预算见 `STAGE_BUDGET`（`assets/scripts/domain/ProcGeom.ts`）：

- 贴图 **0 字节**。
- 水面 ≤220 顶点（17×11=187）；低配不位移顶点、不跟镜。
- 港口（含水+码头+岛摊+船）≤42 mesh；猎场布景+船 ≤36。
- 一盏平行光，**关阴影 / 点光 / 后处理 / 粒子3D**。
- 同色材质缓存，少 draw call。
- 预估增量：程序网格数 KB 级，远小于一张 1024 贴图。主包仍走现有 4MiB 源码红线。

微信构建：`docs/SCENE_SETUP.md` 已要求开启 **3D + primitive**，关地形/后处理。本机未装 Creator 时 **不能** 用 `try-web-desktop-build` 冒充已出包。

## 最短：Creator 预览 → 4 张（3D 证据）

**期望构图 ≠ Creator / 真机。** 示意图在 `docs/stage3d/expect_*.jpg`（标题/水印/README/`gallery.html` 都写了「非实机」）。真机图只认 `docs/stage3d/creator-shots/`。

1. Creator 3.8.8 打开仓库根目录。
2. 打开 `assets/scenes/Boot.scene`。
3. 预览：工具栏播放，或 `Ctrl+P` / `Cmd+P`。
4. 截 4 张，文件名对齐后丢进 `docs/stage3d/creator-shots/`：

| 文件 | 应看到什么 |
| --- | --- |
| `01_harbor_wide.png` | 透视近/中/远海 + 矮波；左侧码头市集；三岛分层；日落侧光；2D 主橙 CTA |
| `02_dock_near.png` | 栏杆 / 台阶 / 青箱 / 棚架立柱金幌 / 停泊小船 |
| `03_bayfin_weak.png` | 鱼 5 件：身 / 脸 / 鳞片色块 / 尾 / **大金弱点**（可轻脉冲） |
| `04_flop_smash.png` | 翻扑抛物、镜头略抬、砸甲板短压扁。低配开关后跟镜/水波/微震应停 |

打印清单：`node tools/stage3d-shot-checklist.mjs`。命令行出包见 `docs/LOCAL_PREVIEW.md`。

**港口预览还应核对：**

- 水面不是一条平色带。
- 远处三座岛分层（泡沫湾矮丘+树、棱镜礁晶体、风眼暗丘+烟）。
- HUD 仍是 2D，主橙 CTA 在下。

**出海教学还应核对：**

- 鱼不是一条方块。
- 抛竿时镜头略送向海并微低头；命中短震；翻扑抛物时镜头略抬。

## 代理预览

`node tools/first-run-preview/serve.mjs` 是 **2D DOM/canvas 辅助代理**，用来验 CTA/教学闭环。

**2D/辅助 ≠ Creator 3D 实机。** 顶栏必须写明这一点。不能当画面 8.5 或真机手感证据。
