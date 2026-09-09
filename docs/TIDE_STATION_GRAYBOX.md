# 潮退浮站 · 地图灰盒

港口世界底座：一眼读出 **海 + 浮台 + 人 + 远景**。
表现层旁路，不改甩拽扑手感、不改 11/90、不碰广告/IAP。玩家可见文案只用原创：潮退浮站、浮岛小站、订单板、潮间漂木。

云端 **没有** Cocos Creator，本页是节点/构图说明，**不是**实机截图。不要把示意图拷进 `docs/stage3d/creator-shots/`。

## 节点层级

运行时由 `HarborStage` 挂到场景根，名 `HarborWorld`：

```
HarborWorld
├─ HarborLight          一盏平行光（关阴影）
├─ HarborCamera         斜俯视家门口，见 TIDE_STATION.cam
├─ Ocean
│  ├─ Water             主海面 + 顶点波 + 运行时自绘水纹
│  ├─ Mid / Deep / FarBand
│  └─ FoamN/E/S/W       浮台四周泡沫环（不是整块白板）
├─ Horizon              半淹楼影一圈
│  ├─ Horizon_i_Base / Wall / Roof   每座三件套
│  ├─ HorizonHaze / HorizonSun
│  └─ DriftA / DriftB
├─ RaftRoot
│  ├─ Foundation
│  │  └─ Foundation_ix_iz_P0…P4     每格 5 条木板，缝是空隙
│  ├─ Pontoon* / Crate / Stall…
│  ├─ OrderBoard        Post + Frame + 深色 Face + Header + Bar
│  └─ Fisherman         帽/头/躯干/双臂/双腿/靴 + 钓竿
├─ HarborBoat
└─ Tidewood
```

零件：`assets/scripts/domain/TideStation.ts`  
自绘木纹/水纹：`assets/scripts/domain/StageSkin.ts`（64px，运行时上传，**不进包体**）  
实例化：`assets/scripts/world/HarborStage.ts` + `StageBuild.ts`  
猎场 `DeckStage` 仍用 `waterParts` / `dockParts`，本刀不改出海手感。

## 构图（斜俯视家门口，示意）

相机在浮台南侧（家门口）抬高，俯角约 −34°：看见海环、木板条甲板、站姿渔夫侧面、半淹楼的墙和屋顶。

```
            Horizon（基座+墙+屋顶一圈）
                    ~~~ 分层海 + 浪 ~~~
              ┌─┬─┬─┬─┬─┐
              │木板条甲板 │     ← RaftRoot 3×3 × 5 plank
         海   │人  摊  箱│   海
              │竿     牌│
              └─┴─┴─┴─┴─┘
              渔夫     订单板
                    ~~~
              HarborCamera ↗ 家门口
```

成功标准（代码侧）：海有浪/分层/泡沫环；楼是多件套剪影；人能认出站姿；牌是框+深色面；甲板是木板条不是纯色格。

顶视布局（**由零件坐标生成，不是 Creator 实拍**，禁止拷进 `creator-shots/`）：

![潮退浮站顶视布局示意图](./tide_station_layout_schematic.svg)

## 扩建地基

默认 `TIDE_STATION.foundationGrid = 3`，每格 `planksPerTile = 5`。

- `foundationCellCenter(ix, iz)` / `foundationPlankName(ix, iz, p)`
- `expandFoundationGrid(n)` / `foundationParts(tier, n)`
- 浮台 1→2 仍只换皮（格子略放大 + 棚/灯）

包体：主包 **0 贴图文件**；运行时自绘 2 张 ≤64px。一盏光，关阴影后处理。港口 mesh 上限见 `STAGE_BUDGET.maxHarborMeshes`（现 128）。

## 本机 Creator 预览（实拍路径）

**堵点：云端缺 Creator。** 探测命令：

```bash
node tools/try-web-desktop-build.mjs --probe-only
```

有 Creator 的人按下面截，才算画面证据：

1. Cocos Creator **3.8.8** 打开本仓库**根目录**（不要只开 `assets/`）。
2. 资源管理器打开 `assets/scenes/Boot.scene`。
3. 预览：工具栏播放，或 Windows `Ctrl+P` / macOS `Cmd+P`。
4. 路径：`Boot.scene` → `RuntimeAutoStart` → `RuntimeHome` → `HarborStage.ensure`。
5. **不要点出海**。核 `Ocean` / `Horizon` / `RaftRoot` / `OrderBoard` / `Fisherman`。
6. 远景实拍丢 `docs/stage3d/creator-shots/01_harbor_wide.png`（现 0/4，未伪造）。清单：`npm run shots:list`。

无 Creator 时只能跑 `npm run validate` 与本页示意图。`tools/first-run-preview` 是 2D 代理，**不算** 3D 实机。
