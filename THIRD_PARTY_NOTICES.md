# Third-party notices

钓鱼核心规则移植自 [tidewater](https://github.com/dgreenheck/tidewater)（`src/game/`，MIT）。
本仓库没有拷贝它的 WebGPU 渲染、着色器、模型、贴图、字体、Poly Haven 模型或 Rocketbox 角色。

钓鱼音效是 tidewater `public/audio/CREDITS.md` 里列出的 CC0 录音，转成 mp3 后放进分包。署名不是 CC0 的义务，下面仍记下作者和 Freesound 编号。

## 移植对照

| 本仓库 | tidewater | 说明 |
|---|---|---|
| `assets/scripts/fishing/FishTable.ts` | `src/game/FishTable.js` | 18 种鱼、长重公式、售价。只多了中文名 `nameZh` |
| `assets/scripts/fishing/Bites.ts` | `src/game/Bites.js` | 栖息地权重、时段活跃度、抽种类、体重、等待 |
| `assets/scripts/fishing/CatchMinigame.ts` | `src/game/CatchMinigame.js` | 拉力对抗。绿区固定 `[0.3, 0.85]`，收到 1.2 m 内才上鱼 |
| `assets/scripts/fishing/Gear.ts` | `src/game/Gear.js` | 升级表与 `gearStats` |
| `assets/scripts/fishing/GameState.ts` | `src/game/GameState.js` | 鱼舱、图鉴、买卖、引导进度。钱包改接 `PlayerSave.coins`，不写 localStorage |
| `assets/scripts/fishing/BiteController.ts` | `src/game/Game.js` 的 `updateBite` / `strike` | 等咬、试饵、提竿窗口。试饵提竿只提示 |
| `assets/scripts/fishing/Cast.ts` | `src/game/FishingRod.js` | 蓄力 1.1 秒和抛投距离 |
| `assets/scripts/fishing/RodRig.ts` | `src/game/FishingRod.js` | 姿态、弯曲弹簧、48 段线、浮标、线杆/转子/摇把。不创建网格 |
| `assets/scripts/fishing/SpotQuery.ts` | `src/world/WorldLayout.js`、`src/game/Game.js` 的 `habitatAtPoint` | 沙滩 / 码头 / 船的落点。船的航点是手写采样 |
| `assets/scripts/fishing/audio/bank.ts` | `src/audio/soundBank.js` | 切片时间。文件改成 mp3 |
| `assets/scripts/fishing/present.ts` | `GameHUD.js`、`FishStand.js`、`Chandlery.js`、`Guide.js` | 中文 HUD、乔和玛塔的对白、引导卡。不是逐行移植 |
| `assets/scripts/fishing/RodBand.ts` | `CatchMinigame.js` | 绿区固定，不随鱼竿变宽 |

下列文件是本仓库自己接引擎和存档的，不是逐行移植：`Waters.ts`、`FishingTrip.ts`、`FishingSave.ts`、`HarborGate.ts`、`FishingWorld.ts`、`FishingSession.ts`、`tools/fishing-preview/`、`docs/fishing-play/`。

## 音效（CC0）

从上游 Ogg 转成单声道 mp3（22050 Hz，约 40 kb/s）。循环声做了截断。两份相同的文件：`assets/bundles/fishing-audio/`（微信分包，不进主包）和 `docs/fishing-play/audio/`（静态预览）。合计 142086 字节。

| 文件 | 字节 | Freesound | 作者 | 许可 |
|---|---|---|---|---|
| `rod_swish.mp3` | 15509 | 371313、725426 | Mrthenoronha、mwchristian95 | CC0 |
| `bail_click.mp3` | 5974 | 523282 | MrFossy | CC0 |
| `line_out.mp3` | 4668 | 464697 | BranndyBottle | CC0 |
| `plop.mp3` | 6235 | 849752、464697 | JoelMcDaniel、BranndyBottle | CC0 |
| `reel_wind.mp3` | 20602 | 509902 | tosha73 | CC0 |
| `reel_drag.mp3` | 16553 | 507070 | paulprit | CC0 |
| `line_strain.mp3` | 5321 | 450849 | kyles | CC0 |
| `line_snap.mp3` | 13027 | 537084 | khenshom | CC0 |
| `fish_splash.mp3` | 22039 | 507094、507093 | paulprit | CC0 |
| `fish_flop.mp3` | 14072 | 649003、570208 | ramattahatta、RatBird | CC0 |
| `coins.mp3` | 9500 | 336585 | Anthousai | CC0 |
| `splash.mp3` | 8586 | qubodup 整理的 blaukreuz 录音，以及 Nox_Sound | qubodup、Nox_Sound | CC0 |

编号对应 `https://freesound.org/s/<编号>`。CC0 1.0 放弃署名要求；保留上表是为了对照上游 `CREDITS.md`。

## tidewater license

以下为上游 `LICENSE` 原文，版权行保留。

```
MIT License

Copyright (c) 2026 DRG Software Solutions LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
