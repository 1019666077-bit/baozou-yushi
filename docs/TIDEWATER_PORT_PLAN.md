# Tidewater 高保真移植方案

本文件只定方案。第二步仍追加进 PR #12，一次交付。这一轮不改玩法代码。

对照源是 [dgreenheck/tidewater](https://github.com/dgreenheck/tidewater)（MIT，Copyright (c) 2026 DRG Software Solutions LLC）。读的是 `src/game/` 全部 17 个文件、`src/App.js` 里相机与输入、`src/audio/soundBank.js`、`public/audio/CREDITS.md`，以及栖息地要用的 `src/world/WorldLayout.js`。线上页 [https://dgreenheck.github.io/tidewater/](https://dgreenheck.github.io/tidewater/) 要 WebGPU 才能画出竿和水面；本环境以源码里的镜头、状态机和数值为准。

上一版只搬了咬钩、鱼表（裁成 8 种）、拉力、渔获、出售和商店的规则，画面是 2D 侧视色块。原版是第一人称：镜头在眼睛高度，纺车竿握在画面右下，竿尖按负载弯曲，线杆/转子/摇把跟着收线转，鱼线垂到水面浮标。这一步要把这套构图补回来。写实水面、大气、云和 WebGPU 鱼皮不搬，换成卡通低多边形和纯色材质。

约束照旧：不动广告、内购、分享；金币仍走 `PlayerSave.coins`，存档 schema 保持 3，不碰 11 金 / 90 金那条首局经济。`HarborStage.ts`、`ProcGeom.ts`、`StageSkin.ts`、`TideStation.ts`、`CameraFeel.ts`、`StageBuild.ts` 尽量不改（后两个本仓库里不存在）。钓鱼用独立根节点，不改装港口舞台。

## 1. 文件对照

判定分三档：

- **直接移植**：公式、常量和状态机照搬，改成 TypeScript。表现层不在这些文件里。
- **移植逻辑，重做表现**：交互和数值留下，网格、着色器、DOM 换成 Cocos 节点。
- **不搬**：写实渲染、整岛行走驾驶、或和钓鱼构图无关的资源。

「本仓库」一列是第二步要落的文件。带 `已有` 的是 PR #12 里已经在的文件，第二步在上面改，不另起一套规则。

| Tidewater | 判定 | 本仓库 | Cocos 接入 |
|---|---|---|---|
| `src/game/FishTable.js` | 直接移植，恢复全部 18 种。`nameZh` 仍是我们的中文名 | 已有 `assets/scripts/fishing/FishTable.ts` | 无节点。卡片和鱼像只读这张表 |
| `src/game/Bites.js` | 已直接移植。`habitatAt` / `activity` / `pickSpecies` / `rollWeight` / `biteDelay` 保持不动 | 已有 `Bites.ts` | 无 |
| `src/game/CatchMinigame.js` | 已直接移植。绿区固定 `[0.3, 0.85]`。上鱼只看 `distance < 1.2`，体力耗尽本身不上鱼 | 已有 `CatchMinigame.ts`。`FishingTrip.ts` 里「体力 ≤ 0 也上鱼」和 `RodBand.ts` 加宽绿区要改回源逻辑 | 拉力条只读 `tension` / `band` / `stamina` / `distance` / `surge` |
| `src/game/Gear.js` | 已直接移植，含油箱、引擎、探鱼器、灯。商店 UI 第二步把 8 条轨道都列出来 | 已有 `Gear.ts`、`present.ts` | 玛塔面板 |
| `src/game/GameState.js` | 已直接移植（冷藏、图鉴、出售、购买、加油）。金币继续镜像 `PlayerSave.coins`，`toPersist` 不存钱 | 已有 `GameState.ts`、`FishingSave.ts`、`persist.ts` | 无 |
| `src/game/Game.js` | 移植编排：持竿、蓄力、提竿、搏斗、渔获卡 9 秒、乔/玛塔距离、`habitatAtPoint`。不搬整岛玩家、船体油耗模拟、探照灯 | 已有 `FishingTrip.ts`、`BiteController.ts` 作会话。新增 `assets/scripts/fishing/SpotQuery.ts` 做落点水深。`FishingSession.ts` 改成只挂 3D 根，不再用 Graphics 画侧视 | 见下方根节点 |
| `src/game/FishingRod.js` | 移植状态机和手感数字（姿态、蓄力 1.1 秒、抛投初速、弹道、弯曲弹簧、线垂度、浮标下沉、线轮转速）。网格改低多边形，顶点着色器里的转子动画改成节点旋转 | 新增 `assets/scripts/fishing/view/RodRig.ts`（无 `cc`，方便单测手感）和 `FishingRodView.ts`（Cocos 网格） | 竿挂在钓鱼相机下，用相机空间姿态 |
| `src/game/GameHUD.js` | 移植布局和文案结构。DOM/CSS 改成 Cocos Widget | 新增 `view/FishingHud.ts` | 屏幕 UI 层，不跟 3D 相机 |
| `src/game/CatchDisplay.js` | 不搬挂在线上的写实鱼模。有渔获卡时源码自己也不把鱼挂在线上（`Game.js`：有 HUD 就只出工作室鱼像）。长度公式 `fishLengthCm/100` 已经在鱼表里 | 鱼像走下面的 Portrait，不单开挂鱼网格 | 无 |
| `src/game/FishPortrait.js` | 不搬 WebGPU 工作室、FishProps、ACES。留下侧视、体长缩放、滑入、甩尾、慢转这套演出 | 新增 `view/FishPortrait.ts` | 渔获卡打开时，一张正交相机照低多边形鱼，画进 RenderTexture |
| `src/game/FishStand.js` | 移植乔的位置关系、半径 3.2、对白、出售面板。不搬 StallKit 照片扫描摊位；用 `buildStall()` 那个程序化回退的体块比例自己重做 | 新增 `view/FishStandView.ts` | `FishingRoot/Stalls/Joe` |
| `src/game/Chandlery.js` | 同上，玛塔，半径 3.0 | 新增 `view/ChandleryView.ts` | `FishingRoot/Stalls/Marta` |
| `src/game/Vendor.js` | 移植 `inRange`、问候、闲置、面向玩家。不搬 Rocketbox 蒙皮。程序化人体（约 1.72 m，帽、围裙、靴）用我们自己的低多边形重做，配色分开乔和玛塔 | 新增 `view/VendorFigure.ts` | 摊位本地坐标，和源码一样站在柜台后 |
| `src/game/StallKit.js` | 不搬。照片扫描贴图、图集、WGSL 层，和卡通低多边形不是一条路，也重 | — | — |
| `src/game/GameMaterials.js` | 不搬。碳布、清漆、车削金属都是写实 WGSL | 竿和摊位用 Cocos 无光照纯色材质，少量色块区分握把、轮、线 | 材质挂在对应 MeshRenderer |
| `src/game/Guide.js` | 移植三张开场卡、一次性提示、看过则不再出现。`localStorage` 改存进已有 `save.fishing`，不新开 schema 字段以外的顶层键 | 新增 `view/GuideView.ts`，已读标记放 `FishingPersist` | 全屏卡 + 小地图上方提示条 |
| `src/game/Minimap.js` | 移植右下角圆地图、玩家箭头、乔/玛塔/船标记、引导时脉冲。不搬 640² 地形烘焙和 1280 m 海岛 | 新增 `view/MinimapView.ts` | UI 层右下，直径约 128–160 px |
| `src/App.js`（相机、输入、时刻） | 只取钓鱼需要的部分：透视相机 `near = 0.1`，可钓鱼姿势是步行或甲板，默认时刻 16.2。不搬大气、海洋 FFT、船物理、自由相机、指针锁定 | `view/FishingStage.ts` 自带相机 | 见第 2 节 |
| `src/audio/soundBank.js` + `public/audio/CREDITS.md` | 只拿钓鱼相关的 CC0 录音，转码后进分包。循环切片表照 `soundBank.js` | 新增 `assets/scripts/fishing/audio/bank.ts`（切片时间）和分包音频 | `AudioSource`，战斗时按曲柄速率调 `reel_wind` |
| `src/world/WorldLayout.js` | 不搬地形。只抄码头、礁、船位三个常数，给落点查询用 | `SpotQuery.ts` 内联这些常数，文件头注明出处 | 三个钓点节点按同一米制摆放 |
| `src/world/fish/*`、天空、船、海洋 | 不搬 | — | — |

### Cocos 节点

港口流程不动。`RuntimeHome` 上已有的「出海钓鱼」仍是入口（次要按钮，不换掉橙色出海）。点下去时卸掉港口舞台，在**同一个节点**下挂独立根，不新开一条和 Boot 并行的场景，也不去改 `CameraFeel`。

```
RuntimeHome
  FishingRoot          FishingStage（自己的透视相机，clearFlags 盖住港口）
    Cam                眼高约 1.65 m，near 0.1，fov 60
      Rod              FishingRodView，相机空间，右下
    Beach              沙滩钓点
    Pier               码头钓点（甲板 y = 2.3）
    Boat               船甲板钓点
    Water              一块低多边形水面
    Stalls/Joe
    Stalls/Marta
  FishingUI            Widget 层：HUD、渔获卡、引导、小地图、触屏键
```

`FishingStage` 可以 `import cc`。`FishTable`、`Bites`、`CatchMinigame`、`Gear`、`GameState`、`FishingTrip`、`RodRig`、`SpotQuery` 继续禁止 `import cc`，单测照旧打它们。

## 2. 画面

### 镜头和构图

原版竿是相机的子物体。竿架：+Y 沿竿，握把在绕线轮座（`SEAT_Y = 0.405`），轮子朝 -Z，竿长 `ROD_L = 2.13`（7 尺）。姿态用三个数插值：仰角 `elev`、侧摆 `side`、手的位置。持竿待机是画面右下那一帧：

| 状态 | elev（弧度） | side | 手（相机空间，米） |
|---|---|---|---|
| 收起 | -0.9 | 0.35 | (0.30, -0.62, -0.25) |
| 待机 | 0.46 | 0.22 | (0.15, -0.05, -0.45) |
| 蓄力 | 2.0 | 0.12 | (0.22, -0.08, -0.20) |
| 抖竿 | 0.16 | 0.14 | (0.18, -0.12, -0.55) |
| 随势 | 0.24 | 0.02 | (0.17, -0.10, -0.56) |
| 漂着 | 0.40 | 0.18 | (0.15, -0.06, -0.46) |
| 搏斗 | 0.90 | 0.12 | (0.14, -0.03, -0.43) |
| 起鱼 | 0.85 | 0.30 | (0.16, -0.08, -0.46) |

插值 `k = 1 - exp(-speed * dt)`，抖竿 speed 28，蓄力 7，其余 5。待机时手有呼吸：仰角 `sin(t*1.3)*0.012`，侧摆 `sin(t*0.9+1.7)*0.01`。搏斗时仰角再减 `0.35 * surge`，并加 `0.12 * sin(t*2.3)`。

相机锁在钓点上，不走原版的指针锁定环顾。每个钓点一个固定眼位，朝海。左右滑只允许偏航大约 ±25°，避免人把竿滑出画面。近裁剪 0.1，和原版一样，竿不会被切掉。

### 竿、线、浮标

低多边形，大约这些零件，合并成少数几次绘制：

- 竿身：约 16 段圆台，前粗后细。弯曲不走着色器。`RodRig` 用和源码相同的曲线改顶点：负载 `load` 把指数从 3.4 收到 1.7（轻负载只弯尖，重负载弯到握手），横向偏移 `bend * 2.13 * s^p`，再减去一点沿竿下落，避免竿变长。弹簧 `K = 250`、`C = 8`。
- 纺车轮：轮体、转子+线杆、摇把三块，绕本地轴转。`GEAR = 5.2`（转子比摇把快），`LINE_PER_CRANK = 0.8` 米。线出去时线杯倒转（泄力）。线杆在蓄力/飞行时打开，收线时合上。
- 鱼线：48 段带子，二次曲线。控制点在竿尖和浮标中点，下垂 `lineOut * sagK * (1 - taut) + 0.02`。飞行 `sagK = 0.03`，否则 0.07。搏斗时 `taut = min(1, tension * 1.5)`。
- 浮标：红白两半球加一根短杆，半径约 2.8 cm。离相机远时按 `max(1, 距离/7)` 放大，保证还看得见。落水后 `sin(t*2.1)*0.008` 起伏。试饵下沉幅度 0.45，吞饵收到 1.4。搏斗时被拽到鱼的水平距离，并按 `surge` 没入水线。

抛投数字照搬，方便和单测对上：蓄力 `power += dt/1.1`，上限 1。抖竿 0.09 秒后脱手，初速 `v0 = 7 + 13 * power * sqrt(castM/22)`，落点距离 `castM * (0.35 + 0.65 * power)`，方向从竿尖指向准星前方该距离的水面点。飞行受 `g = 9.81`，阻尼 `exp(-dt*0.25)`。打到沙上就收回，并提示「落在沙滩上」。

### 三个钓点

米制和 `WorldLayout.js` 一致。海平面 y = 0，南边 +z 是海。不生成 2048 的高度图。

| 钓点 | 眼位（米） | 朝向 | 玩家站在哪 |
|---|---|---|---|
| 沙滩 | 水线附近，大约 (20, 1.65, -40) | 朝 +z | 湿沙。岸线注释在 z ≈ -42 |
| 码头 | 码头头 (55, 2.3+1.65, 33) | 朝海 | 甲板高 2.3。码头 x=55，z 从 -64 到 40，宽 2.6，T 字头宽 14、深 7 |
| 船 | 系泊点 (64.5, 甲板眼高, 36.5) 为默认 | 朝外海 | 只站在甲板上钓鱼。换航点时整艘低多边形船平移，不模拟驾驶 |

沙滩和码头之间是一小段栈桥，乔的摊在码头根（源坐标 x=49.9，z=-74.6，朝向 1.45，面对栈桥）。玛塔在船屋（x=85.5，z=-60.5，朝向 -1.9）。两个摊都在走路能到的范围内；点小地图标记也可以把人转到摊前，避免做整岛寻路。

船不在海里开。甲板上有三个航点按钮，把船放到第 4 节的采样点：海湾、礁缘、深海。油耗做成每次换航点扣一小格油，玛塔那里能加油。引擎转速、船体拍浪、探照灯不进这一步。

### 卡通替代

水面是一张细分网格（约 48×24），顶点按正弦起伏，两种蓝按深度着浅色，靠岸一条白边当浪。没有 FFT、焦散、反射、水下雾。天空是清屏色加一颗暖色方向光，傍晚默认时刻 16.2，灯偏黄。沙滩、码头木板、船壳都是扁盒子和几段圆柱，每种一个纯色。水花是 8 到 12 个复用的圆片，落水和鱼冲刺时播放，不每帧 new。

### 微信小游戏预算

钓鱼根节点单独算，港口网格这时已经卸掉。

| 项 | 预算 |
|---|---|
| Draw call | 一个钓点同时可见 ≤ 24。上限 40。竿 1、线 1、浮标 1、水 1、沙滩或码头或船 1、天空/远岸 1、摊位各 1、人物各 1 |
| 顶点 | 整场 ≤ 2 万。竿（含弯曲用的 16 段）≤ 1500，线 49×2，水面 ≤ 1200，码头+船+摊 ≤ 4000 |
| 每帧分配 | 钓鱼 `update` 里 0 次 `new`。弯竿、线、浮标写进预分配的 `Float32Array`，用完不丢 |
| 阴影 / 后处理 | 关。渔获卡用一张暗色全屏，不用模糊 |
| 粒子 | 水花对象池，卡上的水滴也池化，不按每次渔获分配 26 个节点 |
| 鱼像 | 只有渔获卡打开时多一台正交相机，关掉就停 |

## 3. UI

布局照 `GameHUD.js` 的 CSS，文案改成中文。颜色沿用原版的感觉：钱用暖黄，拉力安全区用青色，过热用珊瑚红，玻璃底用半透明深色。字用项目里已有的中文字体，不引入 Caveat / Kalam / Inter。

### 常驻

- 右上胶囊：金币、冷藏箱（升级后文案改「鱼舱」）`当前 / 上限 kg`，快满变红。船上再显示油量；装了探鱼器再显示水深和四格鱼讯。
- 画面正中一点白点：持竿且没有面板时当准星。
- 正中略下：蓄力条，按住时长满（1.1 秒）。
- 正中偏上：吞饵时一颗大「！」。
- 底部居中、略高于手指：搏斗条。宽约 360。左边口令，右边「xx.x 米」。中间拉力槽，青色区是 `band`，右侧约 8% 是红区，一根针跟着 `tension/1.05`。下面一条细的鱼体力。
- 右下圆地图。渔获卡打开时藏起来。
- 触屏键见下表，不挡右下地图和右上金币。

搏斗口令：

| 条件 | 中文 |
|---|---|
| tension > 0.88 | 松手！ |
| surge > 0.55 | 它在冲！ |
| tension < 0.15 | 线松了！ |
| 针在青区 | 力度正好 |
| 其余 | 收线 |

底部提示（原版 `Game.prompt`）：

| 状态 | 中文 |
|---|---|
| 在水边没收竿 | 拿出鱼竿 |
| 待机 | 按住蓄力，松手抛投 |
| 蓄力 | 松手抛投，按越久越远 |
| 试饵 | 有东西在碰饵，等浮标被拉下去 |
| 吞饵 | 提竿！ |
| 漂着 | 等咬钩，点「收回」把空线收上来 |
| 收回中 | 正在收线 |
| 搏斗过热 | 拉力太大，松手 |
| 搏斗 | 按住收线，变红就松手 |
| 靠近乔或玛塔 | 交谈 / 离开 |

### 触屏

原版是鼠标键盘。小游戏映射如下，规则层仍是同一套按下/松开沿：

| 原版 | 触屏 |
|---|---|
| R 拿出/收起竿 | 左下「鱼竿」 |
| 按住左键蓄力、提竿、收线 | 下半屏大热区按住。面板打开时热区失效 |
| 松开左键 | 松手。蓄力中松手即抛投 |
| 右键收空线 | 「收回」 |
| E 交谈、上船 | 靠近摊位时底部「交谈」。船是钓点切换，不是驾驶 |
| I / Tab 冷藏箱 | 右上箱子图标 |
| Esc 关面板 | 面板上的「离开」，或点外面 |
| 渔获卡点击 / E / Esc，或 9 秒 | 点屏幕任意处。底下一条 9 秒计时 |
| 鼠标环顾、WASD | 不做。钓点按钮切换沙滩 / 码头 / 船。左右滑只微微偏航 |
| F1 重看引导 | 鱼舱面板底部「再看一遍」 |

### 全屏渔获卡

9 秒，可提前点掉。顺序和原版一样：

1. 角标盖章：普通「渔获」，新种「新鱼种」，纪录「新纪录」（金底）。
2. 中文鱼名大字，下面斜体学名。
3. 横幅鱼像（宽高比 2.4），左右淡出。入场 0.7 秒从左侧滑入，尾鳍 `sin(t*13)` 甩一下再衰减，之后 `sin(t*0.55)*0.2` 慢慢侧转。脚下一块椭圆阴影。周围一圈池化水滴。
4. 三格：体长 cm、体重 kg、价值。副行保留英寸和磅，和源卡一致，方便对数字。已入库写「在冷藏箱里」，装不下写「放生了」。
5. 备注：新种「第一次写进鱼录。」纪录写上一杆的 kg/cm 和超出多少。否则写「你的最好成绩：…」。装不下：「冷藏箱没有空了，这条放了。」鱼舱升级后「冷藏箱」改「鱼舱」。
6. 脚注：「点一下继续」，加 9 秒进度条。

### 乔的鱼摊

标题「乔 · 鱼贩」。有货：「看看你钓到什么。明码标价，给现金。」没货：「没有可卖的？码头边上石鲈在咬。」

每行：中文名、厘米、千克、金币、单独「卖掉」。底部「离开」「全部卖掉 · N」。卖掉播硬币声。空列表：「冷藏箱是空的。」

### 玛塔的渔具店

标题「玛塔 · 渔具」。问候：「鱼线、卷线器、大一点的鱼舱，还有柴油。你要什么？」旁边写当前金币。

每一行是下一级的名字和价格，买不起就灰掉。满级写「已经是最好的」。柴油 `$1.5/L`，显示「油箱：当前 / 容量 L」，按钮「加满 · N」。脚注：「买完立刻生效。」

轨道中文（已有 `present.ts` 的四条保留，其余补上）：

| 键 | 名称 | 等级 |
|---|---|---|
| line | 鱼线 | 8磅尼龙线 / 15磅尼龙线 / 30磅编织线 / 60磅编织线 |
| reel | 卷线器 | 旧纺车轮 / 顺滑纺车轮 / 鼓式卷线器 |
| rod | 鱼竿 | 旧鱼竿 / 7尺碳素竿 / 9尺远投竿 |
| hold | 鱼舱 | 冷藏箱 30 kg / 冰柜 70 kg / 保温鱼舱 160 kg |
| fuel | 油箱 | 40 升 / 80 升 / 150 升 |
| engine | 引擎 | 旧柴油机 / 翻新柴油机 / 涡轮柴油机 |
| fishFinder | 探鱼器 | 没有 / 探鱼器（水深和鱼讯） |
| lights | 船灯 | 只有航行灯 / 甲板灯，方便夜钓 |

引擎和船灯这一步只改数值和商店行，不驱动一艘能开的船。探鱼器在船钓点打开 HUD 上的水深和鱼讯。

鱼舱面板（原库存）：标题随升级变「冷藏箱 / 鱼舱」，下面「N 条 · x / 上限 kg · 值 N」。每行多一个「放生」。底部鱼录：「渔获 M 条，最好 a kg · b cm」。空的时候：「还没有。从沙滩、码头或船上抛。」

### 引导

三张卡，第一次进钓鱼根之后出现。点「下一步」，最后一张「开始钓鱼」。可跳过。看过记在 `save.fishing`。

1. 眉题「潮间带」，标题「在岛边钓鱼，再把渔获卖掉。」正文：沙滩、码头、船都能钓。浅滩、码头、礁石、海湾和深水的鱼不一样，也会跟着时段变。渔获卖给码头边的乔，钱拿去船屋玛塔那里买线、轮、鱼舱、探鱼器和夜钓的灯。
2. 眉题「钓鱼」，标题「抛、提、收。」五行：拿出鱼竿；按住蓄力，松手抛，越久越远；浮标被拉下去再提竿，点头只是试饵；按住收线，变红就松手，不然断线；「收回」收空线；箱子图标看冷藏和鱼录。
3. 眉题「附近的人」，标题「乔和玛塔。」乔在码头鱼摊，玛塔在船屋渔具店，两人都标在右下地图上。

一次性提示（每种一次），出现在地图上方：

| 键 | 中文 |
|---|---|
| rodOut | 按住蓄力，松手抛投。试试更深的水，码头周围或者礁上。 |
| nibble | 浮标在点头，有东西在试饵。等它被拉下去再提竿。 |
| fishOn | 按住收线。针靠近红区就松手，等它回来再收。 |
| caught | 进了冷藏箱。卖给码头边的乔，他在地图上。 |
| full | 冷藏箱满了。卖给乔，或者找玛塔买大一点的鱼舱。 |
| boat | 这是你的船。站在甲板上就能钓。换航点会用一点油，柴油在玛塔那里。 |
| joe | 乔收鱼。点「交谈」看他出多少。 |
| marta | 玛塔卖装备和柴油。点「交谈」看货。 |

试饵时提竿的 toast 用源码那句，不吓跑：「还没到，等它拉下去。」这和现在灰盒的默认「吓跑」不同，第二步改回 hint。

## 4. 十八种鱼和水域

### 鱼表

`FishTable.ts` 把被裁掉的 10 种加回去。`lw`、`habitat`、`kg`、`price`、`fight`、`stamina`、`time`、`rarity`、学名与源表逐字段相同。`model` 字段留下当鱼像样式键，不加载原版鱼模。已有 8 个中文名不动。

| id | 中文 | 学名 | 主要水域 | 时段 |
|---|---|---|---|---|
| silverside | 银汉鱼 | Atherinomorus stipes | 浅滩、码头 | 全天 |
| mullet | 鲻鱼 | Mugil cephalus | 浅滩 | 白天 |
| needlefish | 鳄针鱼 | Tylosurus crocodilus | 浅滩、海湾 | 白天 |
| sergeant | 军曹雀鲷 | Abudefduf saxatilis | 码头、礁 | 白天 |
| grunt | 蓝纹石鲈 | Haemulon sciurus | 码头、礁 | 全天 |
| yellowtail | 黄尾笛鲷 | Ocyurus chrysurus | 礁，兼码头和海湾 | 晨昏 |
| chromis | 蓝光鳃雀鲷 | Chromis cyanea | 礁 | 白天 |
| tang | 蓝刺尾鱼 | Acanthurus coeruleus | 礁 | 白天 |
| wrasse | 猪齿鱼 | Lachnolaimus maximus | 礁、海湾 | 白天 |
| parrot | 绿鹦嘴鱼 | Sparisoma viride | 礁 | 白天 |
| angel | 女王神仙鱼 | Holacanthus ciliaris | 礁 | 白天 |
| jack | 马鲹 | Caranx hippos | 码头、海湾、浅滩 | 晨昏 |
| barracuda | 大梭鱼 | Sphyraena barracuda | 海湾、礁、深海 | 全天 |
| grouper | 纳氏石斑 | Epinephelus striatus | 礁、深海 | 全天 |
| redSnapper | 红鲷 | Lutjanus campechanus | 深海 | 全天 |
| tuna | 黑鳍金枪鱼 | Thunnus atlanticus | 深海 | 晨昏 |
| mahi | 鬼头刀 | Coryphaena hippurus | 深海 | 白天 |
| tarpon | 大海鲢 | Megalops atlanticus | 码头、海湾、浅滩 | 夜里 |

体长仍是 `fishLengthCm`：`L = (kg * 1000 / a) ^ (1/b)`，厘米。鱼像用这个长度（米）做缩放。

### 鱼像怎么生成

不端口径 16° 的 WebGPU 工作室，也不使用 `world/fish` 的蒙皮。每种鱼一块共享的侧视低多边形：纺锤身体、尾鳍、背鳍、腹鳍、眼点。差异只来自一张样式表（体高比、吻长、尾叉、`FISH_RGB` 三色），按 `model` 键取。侧视，头朝左，和原版图鉴方向一致。

渔获卡打开时把这条鱼放进正交相机前，缩放成体长，动画用第 3 节那组正弦（滑入、甩尾、慢转）。卡关掉，相机停。图鉴缩略图可以以后从同一网格拍一张，这一步卡片用实时网格就够。

### 水域判定

源码不是五选一。`Bites.habitatAt({ depth, reefDist, pierDist })` 五路权重叠在一起：

- 水深 < 0.25 m：全 0（落在沙上）
- 浅滩：`smooth(3.5 → 1.0, depth)`，1 m 附近最高，3.5 m 没了
- 礁：`smooth(12 → -6, reefDist) * smooth(0.8 → 2.5, depth)`，礁内（距离为负）且水深过 2 m
- 码头：`smooth(9 → 2, pierDist) * smooth(0.6 → 2, depth)`
- 海湾：`smooth(1.5 → 4, depth) * (1 - smooth(18 → 30, depth))`
- 深海：`smooth(16 → 28, depth)`

`Game.habitatAtPoint` 用礁心 `(-78, 58)`、半径 58，以及码头矩形（走道宽 2.6、T 字头宽 14 深 7）算两个距离。`smooth` 是平滑阶梯。

现在的 `Waters.ts` 是五块互斥水，每块写死一个深度带和一对距离。数字能喂进同一个 `habitatAt`，但玩家不能靠「站在码头上往外抛」改变 `pierDist`，礁和深海也没有地图位置。第二步删掉这五块互斥选择，改成落点查询：

1. 沙滩、码头的浮标 xz 来自抛投弹道，水深用一条只依赖 z 的坡：岸线 z ≈ -42 处约 0.4 m，码头头 z ≈ 40 处约 4 m（源码注释），再往南加到 30 m 以上。礁心周围把水深抬到约 6–8 m，好让礁权重起来。
2. `reefDist`、`pierDist` 用和 `habitatAtPoint` 相同的圆心和矩形。
3. 船不靠这条坡。三个航点手写采样，单测锁住权重最高的那一档：
   - 海湾：水深 10，reefDist 50，pierDist 50 → `bay`
   - 礁缘：水深 6，reefDist -4，pierDist 80 → `reef`
   - 深海：水深 26，reefDist 90，pierDist 90 → `deep`
4. 沙滩满蓄力落点应让 `shallows` 最高；码头头外约 4 m、贴桩，应让 `pier` 最高。这两条也写成单测。

时段仍是 `activity()` 里的 6.5 / 18.5。默认开局 16.2（午后）。第二步在 HUD 上加一个时段切换（清晨 6.5、白天 12、黄昏 18.5、夜晚 22），因为没有整岛的太阳动画。切换只改传给 `activity` 的小时。

要改回源逻辑的三处灰盒偏差：试饵提竿只提示不吓跑；绿区永远 `[0.3, 0.85]`，竿升级只加 `castM`，删掉 `RodBand` 的加宽；体力耗尽不上鱼，只有收到 1.2 m 以内才上鱼（和 `CatchMinigame.js` 一致）。断线仍是拉力 > 1 持续约 0.45 秒，脱钩仍是拉力 < 0.12 超过 4 秒或距离超过上限。

## 5. 音效和模型

`public/audio/` 共 42 个 Ogg Opus，64 kb/s，合计约 **5.39 MB**。全部 CC0 1.0，署名不是义务，但 `CREDITS.md` 写了作者和 Freesound 链接。微信 `InnerAudioContext` 实际吃 mp3 / aac / m4a，不吃 Ogg。第二步转成单声道 mp3（约 64 kb/s），体积按 Ogg 的 1.1–1.4 倍估。

钓鱼手感直接对应这些文件，可以拿：

| 文件 | 用途 | 来源 | 作者 | 许可 | Ogg 字节 |
|---|---|---|---|---|---|
| `rod_swish.ogg` | 抛竿，5 段 | Freesound 371313、725426 | Mrthenoronha、mwchristian95 | CC0 | 24086 |
| `bail_click.ogg` | 线杆开合，4 段 | 523282 | MrFossy | CC0 | 13369 |
| `line_out.ogg` | 抛投出线 | 464697 | BranndyBottle | CC0 | 5795 |
| `plop.ogg` | 浮标落水，2 段 | 849752、464697 | JoelMcDaniel、BranndyBottle | CC0 | 11220 |
| `reel_wind.ogg` | 摇轮循环，速率跟曲柄 | 509902 | tosha73 | CC0 | 70632 |
| `reel_drag.ogg` | 泄力循环，鱼外冲时 | 507070 | paulprit | CC0 | 38165 |
| `line_strain.ogg` | 拉力高时的线响 | 450849 | kyles | CC0 | 9264 |
| `line_snap.ogg` | 断线，4 段 | 537084 | khenshom | CC0 | 20929 |
| `fish_splash.ogg` | 吞饵、冲刺、上鱼，5 段 | 507094、507093 | paulprit | CC0 | 38203 |
| `fish_flop.ogg` | 上鱼后的扑腾 | 649003、570208 | ramattahatta、RatBird | CC0 | 25121 |
| `coins.ogg` | 卖鱼 | 336585 | Anthousai | CC0 | 15872 |

这 11 个合计 **272656 字节（约 266 KB）**。转 mp3 后按 **约 300–380 KB** 估。

水声可选，仍是 CC0，但循环很大，只在预算有余时进**分包**，不进主包：

| 文件 | 用途 | 作者 | Ogg 字节 |
|---|---|---|---|
| `splash.ogg` | 落水水花 4 段。切片 1 是 qubodup 整理的 blaukreuz 录音，同为 CC0 | qubodup、Nox_Sound | 63034 |
| `pier_lap.ogg` | 码头拍水循环 | richardemoore | 287231 |
| `surf_wash.ogg` | 沙滩上涌，6 段 | Alex_hears_things | 75291 |
| `surf_crash.ogg` | 破浪 7 段 | YevgVerh、straget | 132426 |
| `surf_backwash.ogg` | 退浪 6 段 | Alex_hears_things | 108825 |
| `surf_far.ogg` | 远处浪循环 | chris_dagorne | 365150 |

建议这一步只带 11 个钓鱼声，再加 `splash.ogg`。码头和沙滩环境声用短循环：从 `pier_lap`、`surf_wash` 各截不超过 8 秒再编码，两段合计控制在 150 KB 以内。`surf_far`（365 KB）、风、虫、引擎、鲸歌、水下礁（单个就有 300–400 KB）不进包。

体积：主包预检上限 4 MiB，当前源码大约 0.8 MB。钓鱼 mp3 **不进主包**。`tools/postbuild-wechat.mjs` 已有分包写法，第二步加一个 `subpackages/fishing-audio/`，压缩后目标 **≤ 600 KB**（11 个钓鱼声 + splash + 两段短环境）。即使按未截断的水声上限去加，也不要超过 1.5 MB，并且仍然不进主包。

模型、贴图、角色：

- Poly Haven 的摊位和海滩杂物是 CC0，许可上能用。贴图是扫描写实，1K 图集会吃掉主包，风格也对不上。默认不用。
- 乔、玛塔的 `joe.glb` / `marta.glb` 来自 Microsoft Rocketbox（MIT）。许可上能用，但要附上 Rocketbox 的 LICENSE，网格是写实蒙皮，小游戏上不划算。默认不用，人物用我们自己的低多边形。
- 字体不在 tidewater 仓库里，渔获卡的手写体来自运行时的 Google Fonts。我们用已有中文字体。
- 鲸鱼、SMAA 查找表、大气和海洋论文实现都不搬。

`THIRD_PARTY_NOTICES.md` 在第二步补上：新移植的 `RodRig` / `SpotQuery` / HUD 文案结构所对应的源文件、转码后的音频文件名、Freesound 作者与链接、CC0 全文或指向已有 CC0 声明。现在的 NOTICE 只覆盖了规则文件，没有音频。

## 6. 怎么证明画面是 3D 的

这台环境没有 Cocos Creator 图形界面，也没有 `CocosCreator` 可执行文件。仓库里的 `tools/try-web-desktop-build.mjs` 在找不到 Creator 时直接退出，不能假装打出了 `web-mobile`。无头 Chrome 也打不开一个不存在的 Creator 预览。

所以第二步的画面证据走 three.js 预览，不走 Creator 出包：

- `tools/fishing-preview/` 从现在的 Canvas2D 换成 three.js 场景。相机、`POSES`、弯曲弹簧、48 段线、浮标、三个钓点、乔和玛塔，用**同一套** `RodRig` 和 `FishingTrip`。低多边形和纯色材质，不引入 tidewater 的水面着色器。
- 触屏热区在桌面预览里仍可用鼠标按住，和现在的灰盒一样。
- 沿用现有 `record.mjs`：无头 Chrome、固定种子、实跑 ≤ 15 秒。至少四张图：待机右下有竿、蓄力竿抬起、浮标在水上、搏斗竿弯且拉力条出现，外加渔获卡鱼像和乔或玛塔的面板。GIF 或截图放进 `docs/fishing/`，PR 正文引用。
- 图注写明这是 three.js 预览，不是 Creator 实机。和现有 `docs/fishing/README.md` 的口径一致。
- 若以后本机有 Creator 3.8.8，再用同一节点树打 `web-mobile` 补截图。那不是这一步的门禁。`npm run validate` 仍是门禁：鱼表 18 种、落点权重、竿姿态和弯曲的单测要绿。

Cocos 侧第二步会把同一 `RodRig` 接到 `FishingRodView`。预览绿了，只能证明镜头、弯曲和规则；Creator 里的 Widget 对齐要等有编辑器再看。这一点写进 PR 的已知问题。

## 7. 第二步范围

仍是 PR #12 上的一次提交串，不新开 PR，不合入。

做这些：

1. `FishTable` 恢复 18 种，补中文名和鱼像配色。单测覆盖「海湾航点白天能抽到海湾鱼、深海航点能抽到金枪鱼」这类权重，而不是只断言鲻鱼。
2. `SpotQuery` 替换互斥水域。沙滩/码头按抛投落点算 `habitatAt`，船用三个航点。删掉体力耗尽上鱼、吓跑、绿区随竿变宽。
3. `RodRig` 无引擎，单测锁住：蓄力 1.1 秒满、满力落点系数 1、弯曲弹簧在重负载时指数变小、线的控制点下垂。
4. `FishingRoot` + 低多边形三钓点 + 竿/线/浮标 + 乔/玛塔体块和人。`FishingSession` 不再画 2D 侧视。`RuntimeHome` 的入口按钮保持次要按钮。
5. 中文 HUD、渔获卡、鱼摊、渔具店、引导、小地图、触屏键。
6. CC0 钓鱼声转 mp3，走分包。更新 `THIRD_PARTY_NOTICES.md`。
7. three.js 预览重录 `docs/fishing/`，`npm run validate` 保持绿色。首局 11 金 / 90 金用例不改断言。

不做这些：

- 整岛行走、游泳、指针锁定、船的物理和油门、FFT 海、大气、WebGPU 鱼皮、Rocketbox、Poly Haven 扫描件。
- 改 `HarborStage` / `ProcGeom` / `CameraFeel` / `StageBuild`，以及广告、内购、分享。
- 把 schema 从 3 抬上去。引导「看过没有」塞进已有 `save.fishing`。

风险：

- 无 Creator，Cocos Widget 的最终像素对不齐只能等编辑器。three.js 预览是构图证据，PR 里不能写成实机。
- 弯竿若每帧 `createMesh` 会破掉分配预算。必须改已有顶点缓冲。
- Ogg 不能直接丢进微信。转码要在 NOTICE 里说明源文件和产物的对应关系。
- 18 种加上连续栖息地之后，旧的「浅滩白天必中鲻鱼」测试会变。测试改成锁权重和公式，不锁某一次随机的 UI 文案。
- 绿区不再随竿变宽、体力耗尽不再上鱼，灰盒里「磨满体力就能上」的手感会消失。这是故意对齐源码。
- 和未合并的港口 PR 仍可能在 `RuntimeHome.ts` 上冲突。钓鱼逻辑继续放在 `assets/scripts/fishing/`，入口只留现有那几行。

工作量集中在表现层：一个独立根、一套竿的运行时网格、三块低多边形场地、一套中文 UI、一条预览录制。规则层是在已有移植上补 10 种鱼、换落点查询、撤回三处灰盒偏差，不再重写经济。
