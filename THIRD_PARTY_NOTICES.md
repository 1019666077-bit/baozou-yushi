# Third-party notices

钓鱼核心规则移植自 [tidewater](https://github.com/dgreenheck/tidewater)（`src/game/`，MIT）。
本仓库没有拷贝它的 WebGPU 渲染、着色器、模型、贴图、音效或字体。

`CREDITS.md` 里列出的 Freesound 录音、Poly Haven 模型与贴图、Microsoft Rocketbox 角色、字体和 SMAA 查找表都没有引入。

## 移植对照

| 本仓库 | tidewater | 说明 |
|---|---|---|
| `assets/scripts/fishing/FishTable.ts` | `src/game/FishTable.js` | 鱼种、长重公式、售价。18 种裁成 8 种；只多了中文名 `nameZh` |
| `assets/scripts/fishing/Bites.ts` | `src/game/Bites.js` | 栖息地权重、时段活跃度、抽种类、体重、等待 |
| `assets/scripts/fishing/CatchMinigame.ts` | `src/game/CatchMinigame.js` | 拉力对抗 |
| `assets/scripts/fishing/Gear.ts` | `src/game/Gear.js` | 升级表与 `gearStats` |
| `assets/scripts/fishing/GameState.ts` | `src/game/GameState.js` | 鱼舱、图鉴、买卖。钱包改接 `PlayerSave.coins`，不写 localStorage |
| `assets/scripts/fishing/BiteController.ts` | `src/game/Game.js` 的 `updateBite` / `strike` | 等咬、试饵、提竿窗口 |
| `assets/scripts/fishing/Cast.ts` | `src/game/FishingRod.js` | 只取蓄力 1.1 秒和抛投距离公式 |

下列文件是本仓库为灰盒写的，不是逐行移植：`Waters.ts`（五块水映射到 `habitatAt`）、`RodBand.ts`（0 级绿区等于源码，升级后加宽）、`FishingTrip.ts`、`FishingSave.ts`、`present.ts`、`FishingSession.ts`、`tools/fishing-preview/`。

和源逻辑不同的三处，写在 `docs/FISHING_CORE.md`：试饵时提竿会跑鱼；体力耗尽也算上岸；鱼竿升级加宽绿区。

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
