# 潮退浮站 · 地图灰盒

港口世界底座：一眼读出 **海 + 浮台 + 人 + 远景**。
表现层旁路，不改甩拽扑手感、不改 11/90、不碰广告/IAP。玩家可见文案只用原创：潮退浮站、浮岛小站、订单板、潮间漂木。

云端 **没有** Cocos Creator，本页是节点/构图说明，**不是**实机截图。不要把示意图拷进 `docs/stage3d/creator-shots/`。

## 节点层级

运行时由 `HarborStage` 挂到场景根，名 `HarborWorld`：

```
HarborWorld
├─ HarborLight          一盏平行光（关阴影）
├─ HarborCamera         斜俯视，见 TIDE_STATION.cam
├─ Ocean
│  ├─ Water             主海面 + 顶点波
│  ├─ Mid / Deep / FarBand
│  └─ Foam              浮台水线
├─ Horizon              半淹楼影一圈
│  ├─ Horizon_0 … Horizon_7
│  ├─ HorizonHaze / HorizonSun
│  └─ DriftA / DriftB   水线漂木
├─ RaftRoot             可扩地基
│  ├─ Foundation
│  │  └─ Foundation_0_0 … Foundation_2_2   默认 3×3
│  ├─ PontoonNW/NE/SW/SE、Crate、Stall…
│  ├─ OrderBoard        BoardPost / Board / BoardHeader
│  └─ Fisherman         FisherHead / FisherTorso / FisherLegL / FisherLegR
├─ HarborBoat
└─ Tidewood             订单用潮间漂木（可关）
```

零件清单在 `assets/scripts/domain/TideStation.ts`，实例化在 `assets/scripts/world/HarborStage.ts`。
猎场 `DeckStage` 仍用原来的 `waterParts` / `dockParts`，本刀不改出海甲板。

## 构图（斜俯视，示意）

相机在浮台南侧抬高，俯角约 −46°，海面铺满一圈，中间是木板格，人站在台上，远景半沉楼影围成环。

```
            Horizon_n（半淹楼影）
                    ~~~
         ~~~     Foam 水线      ~~~
              ┌───┬───┬───┐
              │   │板 │货 │     ← RaftRoot 3×3
         海   │人 │   │箱 │   海
              │   │摊 │   │
              └───┴───┴───┘
                渔夫   订单板
                    ~~~
              HarborCamera ↗
```

成功标准：Creator 预览里 **不要点出海**，应同时看见海面、浮台木格、站姿渔夫、远处一圈楼影。标题仍是「潮退浮站 · 浮岛小站」。

## 扩建地基

默认 `TIDE_STATION.foundationGrid = 3`（9 格）。预留 API：

- `foundationCellCenter(ix, iz)` — 格子世界坐标
- `foundationTileName(ix, iz)` — `Foundation_ix_iz`
- `expandFoundationGrid(n)` / `foundationParts(tier, n)` — 改 N 即可加圈
- 浮台 1→2 仍只换皮（格子略放大 + 棚/灯），无箱容/售价加成

包体：0 贴图、一盏光、关阴影后处理。港口 mesh 上限见 `STAGE_BUDGET.maxHarborMeshes`（现 56）。

## 本机 Creator 预览（实拍路径）

云端做不到这一步。有 Creator 的人按下面截，才算画面证据：

1. Cocos Creator **3.8.8** 打开本仓库**根目录**（不要只开 `assets/`）。
2. 资源管理器打开 `assets/scenes/Boot.scene`。
3. 预览：工具栏播放，或 Windows `Ctrl+P` / macOS `Cmd+P`。
4. 官方路径：`Boot.scene` → `RuntimeAutoStart` 挂 `RuntimeHome` → `HarborStage.ensure` 生成 `HarborWorld`。
5. **不要点出海**。在层级面板核对 `Ocean` / `Horizon` / `RaftRoot` / `OrderBoard` / `Fisherman`。
6. 港湾远景实拍仍丢 `docs/stage3d/creator-shots/01_harbor_wide.png`（现 0/4，未伪造）。清单：`npm run shots:list`。

无 Creator 时只能跑 `npm run validate` 与本页 ASCII。`tools/first-run-preview` 是 2D 代理，**不算** 3D 实机。
