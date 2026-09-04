param(
  [string]$Project = "C:\Users\MOON\Documents\yushi-play",
  [switch]$PureSimulator
)

$ErrorActionPreference = "Stop"

$cli = "D:\微信web开发者工具\cli.bat"
if (-not (Test-Path -LiteralPath $cli)) {
  throw "WeChat DevTools CLI not found: $cli"
}
if (-not (Test-Path -LiteralPath $Project)) {
  throw "Project not found: $Project"
}

$configPath = Join-Path $Project "project.config.json"
$config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$config.compileType = "game"
$config.appid = "touristappid"
$config.isGameTourist = $true
($config | ConvertTo-Json -Depth 8) + "`n" | Set-Content -LiteralPath $configPath -Encoding UTF8

$localData = Join-Path $env:LOCALAPPDATA "微信开发者工具\User Data\97c2c3ed9e9b4a343745d4ac3603eef1\WeappLocalData"
$projectCache = Join-Path $localData "localstorage_4d9b72cc9860a16e90a91b1a570e99af.json"
if (Test-Path -LiteralPath $projectCache) {
  $cache = Get-Content -LiteralPath $projectCache -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($cache.attr) {
    $cache.attr.appid = "touristappid"
    $cache.attr.gameApp = $true
    $cache.attr.appName = "tourist"
    ($cache | ConvertTo-Json -Depth 20 -Compress) | Set-Content -LiteralPath $projectCache -Encoding UTF8
  }
}

& $cli close --project $Project --lang zh 2>$null | Out-Null
Start-Sleep -Seconds 2

$openArgs = @("open", "--project", $Project, "--lang", "zh")
if ($PureSimulator) {
  $openArgs += "--pure-simulator"
}
& $cli @openArgs

Write-Host "Opened $Project with touristappid (local simulator only)."
