# 2.5D 画面路线（港湾 / 猎场）

## 选定路线

**先 2.5D，不上全 3D UI。**

- 世界：透视相机 + 程序低模（顶点波水面、分层码头/市集/岛、船、鱼 5 件套）。
- 材质：优先 `builtin-unlit` + 运行时自绘 ≤64 木纹/水纹（一盏平行光仍在）；失败回退纯色。主包 **零贴图文件**（不用 256 法线，浪靠顶点波）。
- UI：仍是 Canvas Screen Space（主橙 CTA、教学挖洞、结算）。
- 领域层 / 教学 / 经济不改。3D 只是表现层；`DeckStage` 失败则回退 2D `GrayArt`。

不选全 3D UI 的理由：微信小游戏改 Overlay Canvas 成本高，且会碰教学闭环（挖洞、单主橙）。本 tip 只把「看起来像海」的部分抬到 3D。

## 本 tip 已落地

| 模块 | 行为 |
| --- | --- |
| `HarborStage` | 潮退浮站灰盒：`Ocean`、`Horizon`（Base/Wall/Roof）、`RaftRoot` 木板条、框式 `OrderBoard`、主角 **阿笠**（斗笠宽檐 + 蓑衣三层 + 青绿衣 + 竿）。斜俯视家门口相机。见 `docs/TIDE_STATION_GRAYBOX.md`。 |
| `DeckStage` | 猎场：低模鱼（身/脸/鳞片色块/尾/弱点），弱点更大并轻脉冲；砸甲板短挤压。 |
| `CameraFeel` | 抛竿跟线（略低头看海）、命中微震、翻扑抬镜；低配全关。时长 ≤0.15s，不挡点击。 |
| `ProcGeom` | 零件清单、顶点波公式与包体预算，可单测。 |
| 回退 | primitives 关闭或无 scene 时仍画 2D 海景。 |

## 下一步（未做，不假装）

- 真机上看合批与 45FPS；必要时把 sphere 段数再降。
- 本机 Creator 打 `web-desktop` 才能当 3D 手感证据。云端**没有** Creator 预览包。
- `docs/stage3d/creator-shots/` 仍是空占位（**E 准备**：清单 0/4），**未伪造** 4 张 png。必须本机 Creator 3.8.8 打开 Boot.scene 实拍；代理 / `first-run-preview` / expect 示意图一律不算。有 Creator 的人截完才能把估分坐实，现在不要约验。
- 256 滚动法线仍是备选；港口木纹/水纹用运行时 ≤64px 自绘，主包仍 0 贴图文件。

## 包体 / 性能

预算见 `STAGE_BUDGET`（`assets/scripts/domain/ProcGeom.ts`）：

- 贴图 **主包 0 字节**（运行时自绘 2 张 ≤64px 木纹/水纹，不进包）。
- 水面 ≤220 顶点（17×11=187）；低配不位移顶点、不跟镜。
- 港口（含水+木板条+天际楼套件+订单板+渔夫+船）≤128 mesh；猎场布景+船 ≤36。
- 一盏平行光，**关阴影 / 点光 / 后处理 / 粒子3D**。
- 同色材质缓存，少 draw call。
- 预估增量：程序网格数 KB 级，远小于一张 1024 贴图。主包仍走现有 4MiB 源码红线。

微信构建：`docs/SCENE_SETUP.md` 已要求开启 **3D + primitive**，关地形/后处理。本机未装 Creator 时 **不能** 用 `try-web-desktop-build` 冒充已出包。

## 最短：Creator 预览 → 4 张（3D 证据）

**必须本机 Cocos Creator 3.8.8 打开 `Boot.scene` 实拍。**
**期望构图 ≠ Creator / 真机。** 示意图在 `docs/stage3d/expect_*.jpg`（标题/水印/README/`gallery.html` 都写了「非实机」）。代理 / `first-run-preview` / expect 示意图**一律不算**证据。真机图只认 `docs/stage3d/creator-shots/`（现 **0/4**，未伪造 png）。

1. Creator 3.8.8 打开仓库根目录。
2. 打开 `assets/scenes/Boot.scene`。
3. 预览：工具栏播放，或 `Ctrl+P` / `Cmd+P`。
4. 截 4 张，文件名对齐后丢进 `docs/stage3d/creator-shots/`：

| 文件 | 何时截 | 应看到什么（含能看见的 A+B） |
| --- | --- | --- |
| `01_harbor_wide.png` 港湾远景 | 刚进港口，不要点出海 | 斜俯视一眼 **海+浮台+人+远景**：近/中/远海 + 矮波；中央浮台木板格 / 市集棚；站姿渔夫与订单板；远处半沉楼影一圈；日落侧光；2D 主橙 CTA。**下半屏**主操作，上半是海。 |
| `02_dock_near.png` 码头近景 | 仍在港口，拉近左侧浮站（能感到甲板分量更好） | 栏杆 / 台阶 / 浮筒 / 青箱 / 棚架立柱金幌 / 停泊小船。甲板有分量（**短滑**落点）；青箱是**下半屏**拖运目标。 |
| `03_bayfin_weak.png` 湾鳍弱点 | 点「开始教学」出海，打中后停在侧脸 | 鱼 5 件：身 / 脸 / 鳞片色块 / 尾 / **大金弱点**（可轻脉冲）。**下半屏**瞄准带；打中会弹出。 |
| `04_flop_smash.png` 扑腾/空中砸或砸甲板 | 翻扑最高点（能体现砸窗口更好）或砸甲板瞬间 | 翻扑抛物、镜头略抬、可砸圈 /「**完美窗口**」、砸甲板短压扁后再**短滑**。低配开关后跟镜/水波/微震应停 |

打印清单：`npm run shots:list`。命令行出包见 `docs/LOCAL_PREVIEW.md`。

**港口预览还应核对：**

- 水面不是一条平色带。
- 远处是淹没天际：半沉楼影围成一圈、水线、浮木，读得出洪水浮岛，不是灰码头。
- 浮台是可辨认的木板格；台上有站姿渔夫灰盒和订单板 3D 占位。
- HUD 仍是 2D，主橙 CTA 在下。

灰盒节点与扩建常量见 `docs/TIDE_STATION_GRAYBOX.md`。**本机 Creator 实拍路径**仍是打开 `Boot.scene` 预览；云端没有 Creator，不要伪造 `creator-shots` png。

**出海教学还应核对：**

- 鱼不是一条方块。
- 抛竿时镜头略送向海并微低头；命中短震；翻扑抛物时镜头略抬。
- 鱼砸上甲板有短滑移，不是瞬贴；空中可砸圈 / 完美窗口高光能看见。
- 主操作在下半屏；扛鱼后下半屏拖去鱼箱。

## 代理预览

`node tools/first-run-preview/serve.mjs` 是 **2D DOM/canvas 辅助代理**，用来验 CTA/教学闭环。

**2D/辅助 ≠ Creator 3D 实机。** 顶栏必须写明这一点。不能当画面 8.5 或真机手感证据。
