# 第三方与生成式资产登记

鱼、岛屿、船、鱼箱、UI 和粒子由项目 TypeScript 与 Cocos 基础图元实时生成。仓库里的第三方媒体只有钓鱼音效：tidewater `public/audio/CREDITS.md` 列出的 CC0 录音，转成 mp3。没有第三方图片、模型、字体、音乐或 AI 生成媒体。

署名不是 CC0 的义务。作者和 Freesound 编号与 `THIRD_PARTY_NOTICES.md` 一致，保留是为了对照上游。

两份相同的文件：`assets/bundles/fishing-audio/`（微信分包 `fishing-audio`，不进主包）和 `docs/fishing-play/audio/`（静态预览）。合计 142086 字节。

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

代码依赖及许可证以 `package-lock.json` 为准。tidewater 规则移植的 MIT 正文在 `THIRD_PARTY_NOTICES.md`。

## 未来 AI 资产登记模板

| 文件 | 用途 | 工具 | 模型/版本 | 完整提示词 | 生成日期 | 许可证/商用条款 | 人工修改 | 审核人 |
|---|---|---|---|---|---|---|---|---|
| DRAFT-示例（不得发布） | — | — | — | — | YYYY-MM-DD | 待核 | — | — |

## 发布门禁

- 每个非代码媒体文件必须有独立行、来源文件和可追溯许可证。
- AI 资产必须保留工具、模型、完整提示词、日期及人工修改记录。
- 不得用“AI生成”代替许可证结论；平台条款与训练来源风险仍需人工复核。
- DRAFT、示例、模板、无授权或字段不全的资产不得进入 release 包。
