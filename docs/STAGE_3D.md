# 2.5D 画面路线（港湾 / 猎场）

## 选定路线

**先 2.5D，不上全 3D UI。**

- 世界：透视相机 + 程序低模（水面平面、码头、船、鱼 5 件套），`builtin-unlit`，**零贴图**。
- UI：仍是 Canvas Screen Space（主橙 CTA、教学挖洞、结算）。
- 领域层 / 教学 / 经济不改。3D 只是表现层；`DeckStage` 失败则回退 2D `GrayArt`。

不选全 3D UI 的理由：微信小游戏改 Overlay Canvas 成本高，且会碰教学闭环（挖洞、单主橙）。本 tip 只把「看起来像海」的部分抬到 3D。

## 本 tip 已落地

| 模块 | 行为 |
| --- | --- |
| `HarborStage` | 港口/结算 3D 港湾：水面、码头市集、三岛剪影、停泊小船。UI 仍 2D。 |
| `DeckStage` | 猎场：低模鱼（身/肚/尾/背鳍/弱点）、船、码头、水面轻晃。 |
| `CameraFeel` | 抛竿跟线、命中微震、翻扑略抬；低配全关。 |
| `ProcGeom` | 零件清单与包体预算，可单测。 |
| 回退 | primitives 关闭或无 scene 时仍画 2D 海景。 |

## 下一步（未做，不假装）

- 真机上看合批与 45FPS；必要时把 sphere 段数再降。
- 水面若要焦散，用一张 **256 滚动法线**（计入贴图预算），不要上后处理。
- 鱼表情/剪影再拆 mesh 必须仍 ≤5 件。
- 本机 Creator 打 `web-desktop` 才能当 3D 手感证据。

## 包体 / 性能

预算见 `STAGE_BUDGET`（`assets/scripts/domain/ProcGeom.ts`）：

- 贴图 **0 字节**（本 tip）。
- 水面 ≤220 顶点；低配整板 + 不跟镜。
- 一盏平行光，**关阴影 / 点光 / 后处理 / 粒子3D**。
- 同色 `unlit` 共享 mesh，少 draw call。
- 预估增量：程序网格数 KB 级，远小于一张 1024 贴图。主包仍走现有 4MiB 源码红线。

微信构建：`docs/SCENE_SETUP.md` 已要求开启 **3D + primitive**，关地形/后处理。本机未装 Creator 时 **不能** 用 `try-web-desktop-build` 冒充已出包。

## 本地 Creator 预览

1. Creator 3.8.8 打开仓库 → `Boot.scene` → 预览。
2. 港口应看到透视海面（不是纯 2D 色带）。出教学关后鱼是低模，不是方块一条。
3. 低配开关：设置里开低配，跟镜/水波应停。
4. 命令行出包仍要本机 Creator，见 `docs/LOCAL_PREVIEW.md`。

## 代理预览

`node tools/first-run-preview/serve.mjs` 是 **2D DOM/canvas 代理**，用来验 CTA/教学闭环。

**2D 代理 ≠ Creator 3D 实机。** 不能当画面 8.5 或真机手感证据。
