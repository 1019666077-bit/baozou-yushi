# 出海钓鱼

规则移植自 [tidewater](https://github.com/dgreenheck/tidewater)（MIT）的 `src/game/`。画面是卡通低多边形，不是原版的写实水面。许可、文件对照和 CC0 音效见仓库根目录 `THIRD_PARTY_NOTICES.md`。

港口里的「出海」仍是原来的扑腾教学，主橙按钮不动。旁边的「出海钓鱼」才进这套拉力玩法。教学出海没完成时，这个入口锁着，文案是「先完成教学出海，再来钓鱼」，避免还没教完就把鱼卖掉、把首局金币从 11 顶上去。

## 怎么玩

1. 引导三张卡可以跳过。然后选钓点（沙滩 / 码头 / 船）、时段（清晨 / 白天 / 黄昏 / 夜晚）。船再选海湾 / 礁缘 / 深海，换航点扣 2 升柴油。
2. 按住蓄力，松手抛竿。蓄力约 1.1 秒到满。落点距离是 `castM * (0.35 + 0.65 * power)`。沙滩朝海抛，码头朝侧面的水抛，这样落点还贴着桩。
3. 等浮标下沉。试饵时提竿只提示「还没到，等它拉下去」，鱼不跑。吞饵窗口里不提，鱼才跑。窗口长度是 `2.4 - 力量 × 0.5` 秒。
4. 按住收线，松开给线。拉力停在绿区 `[0.3, 0.85]`。超过 1 大约 0.45 秒断线，低于 0.12 连续约 4 秒脱钩，距离拉出上限也脱钩。鱼冲刺时要松手。
5. 只有距离收到 1.2 米以内才上鱼。体力耗尽不会直接上岸，它只让鱼更快累。弹出全屏渔获卡：名字、稀有度、长度、重量、售价、是否新鱼种 / 新纪录。
6. 鱼进冷藏箱。舱满则放生，图鉴仍记下。回码头卖给乔，金币进原来的钱包。玛塔卖鱼线、卷线器、鱼竿、鱼舱、油箱、引擎、探鱼器、船灯，也能加油。
7. 鱼竿升级只加抛投距离，不加宽绿区。

## 鱼和钓点

18 种鱼，顺序和数值跟 tidewater `FishTable.js` 一致，只多了中文名。栖息地用 `habitatAt(depth, reefDist, pierDist)`，不是五块互斥的水。沙滩、码头按落点算水深；船的三个航点是手写采样（海湾、礁缘、深海）。

时段对应的小时：清晨 6.5、白天 12、黄昏 18.5、夜晚 22。

## 画面

`RodRig` 不创建网格，只算姿态、弯曲弹簧（K=250，C=8）、48 段鱼线和浮标。Cocos 的 `FishingWorld` 和 three.js 预览都读这些数。

预览构图：人站在码头上，眼高约 1.65 米，右下手持纺车竿，栏杆往远处收，抛出去之后鱼线垂到水面的浮标。快进时弹簧按 1/60 秒小步积分，避免大 dt 把竿甩飞。

## 状态机

`dock` 鱼贩和商店 → `ready` 钓点 → `charging` 蓄力 → `waiting` 等咬 → `nibbling` 试饵 → `hook` 提竿窗口 → `fighting` 拉力 → `card` 渔获卡。断线、脱钩、太晚进 `miss`。

拉力每帧最多推进 0.05 秒。随机数从 `FishingTrip` 注入。

## 存档

不升 `schemaVersion`（仍是 3）。可选字段 `save.fishing`：鱼舱、图鉴、升级、引导是否看过、下一条鱼的 id。没有这个字段的旧档补成新钓手。金币仍在 `PlayerSave.coins`。11/90 的标价公式没有改。

## 音效

11 条钓鱼声加一声落水，CC0，转成单声道 mp3，合计约 139 KB。源文件在 `assets/bundles/fishing-audio/`，微信构建时进分包 `fishing-audio`，不进 4 MB 主包。预览页用的是同一批文件的拷贝：`docs/fishing-play/audio/`。

## 在 Creator 里看

用 Cocos Creator 3.8.8 打开本仓库，跑 `assets/scenes/Boot.scene`。先完成教学出海，再点右侧「出海钓鱼」（不是中间那颗橙色出海）。这一步的截图不是 Creator 实机。

## 没有 Creator 时

用手机或电脑浏览器直接打开 `docs/fishing-play/index.html`。`app.js`、`hud.css`、`audio/` 都是相对路径，不需要服务器。若浏览器拦截本地脚本，把这个目录放到任意静态站点。若开启 GitHub Pages 并指向 `docs/`，路径是 `fishing-play/`。本仓库不改 Pages 设置。

重新打包和截图：

```bash
node tools/fishing-preview/build-static.mjs
node tools/fishing-preview/record.mjs
```

`docs/fishing/` 里的 GIF 和截图都标明是 three.js 预览。录制脚本会在 375×667 和 414×896 上确认商店文字没有压住按钮。

## 调参入口

| 想改什么 | 文件 |
|---|---|
| 鱼种、体重、单价、力量、体力、栖息地、时段 | `assets/scripts/fishing/FishTable.ts` |
| 咬钩等待、抽种类 | `assets/scripts/fishing/Bites.ts` |
| 沙滩 / 码头 / 船的落点 | `assets/scripts/fishing/SpotQuery.ts` |
| 蓄力时间和抛投距离 | `assets/scripts/fishing/Cast.ts` |
| 竿弯曲、鱼线、浮标、线轮 | `assets/scripts/fishing/RodRig.ts` |
| 拉力、断线、脱钩、收到 1.2m | `assets/scripts/fishing/CatchMinigame.ts` |
| 绿区（固定 0.30–0.85） | `assets/scripts/fishing/RodBand.ts` |
| 商店价格和属性 | `assets/scripts/fishing/Gear.ts` |
| 试饵、提竿窗口 | `assets/scripts/fishing/BiteController.ts` |
| 中文名、乔和玛塔的对白、引导卡 | `assets/scripts/fishing/present.ts` |
| 教学没完成时锁入口 | `assets/scripts/fishing/HarborGate.ts` |
