# Android / Google Play Basic Launch

## Cocos 与 Android 本机构建

1. 安装 Cocos Creator 3.8.x、Android Studio、项目要求的 Android SDK/NDK 与 JDK，并在 Cocos 偏好设置中配置路径。
2. 在构建面板导入 `build-config.android.json`，确认包名、横屏、仅 `arm64-v8a` 和 Boot 场景。
3. 用 Cocos 执行 Android 构建，再用生成的原生工程完成 Gradle 构建与真机安装。
4. 当前 Basic Launch 使用 `cc.sys.localStorage` 离线存档，不建设后端、不承诺跨设备云存档。
5. 运行 `npm run preflight:android`。

本仓库没有声称已生成 AAB。本机若没有可用的 Cocos Creator、Android SDK/NDK、JDK 和签名材料，AAB 构建是发布前人工门禁，不能用配置文件或 preflight 结果代替。

## JSB bridge 合同

原生宿主可以显式注入 `globalThis.__BAOZOU_ANDROID_BRIDGE__`，其可选方法定义在 `AndroidAdapter.ts`：振动、分析、成绩提交和广告回调。桥不存在或方法抛错时游戏必须继续运行。Basic Launch 的 `adsEnabled` 固定为 `false`，不会调用广告桥。

## Google Play Console 人工操作

1. 创建应用、填写商店资料、内容分级、数据安全、隐私政策和目标受众。
2. 创建并妥善保管上传密钥；在 Cocos/Gradle 本地配置签名，不把密钥提交仓库。
3. 用真实工具链生成签名 AAB，上传 Internal testing；处理目标 API、64 位和 Play Integrity 提示。
4. 至少在一台低端与一台主流 Android 真机验证触摸、横屏、音频、返回/切后台/恢复。
5. 强制停止并重启应用，确认 `cc.sys.localStorage` 离线档保留；关闭网络后完整完成一局并结算。
6. 人工核对没有广告请求、没有后端依赖、没有把本地档描述成云存档。
