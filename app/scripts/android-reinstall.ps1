# android-reinstall.ps1 — rebuild + reinstall Ta-Da! debug APK in one command
# Run from anywhere inside the tada repo:
#   powershell -File app\scripts\android-reinstall.ps1
# Or from tada\app:
#   .\scripts\android-reinstall.ps1

$ErrorActionPreference = "Stop"
$appDir = Split-Path -Parent $PSScriptRoot   # .../tada/app

Write-Host ""
Write-Host "==> Building static bundle + syncing Capacitor..." -ForegroundColor Cyan
Set-Location $appDir
bun run android:sync
if ($LASTEXITCODE -ne 0) { Write-Host "android:sync failed" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==> Compiling + installing APK on connected device..." -ForegroundColor Cyan
Set-Location "$appDir\android"
./gradlew installDebug
if ($LASTEXITCODE -ne 0) { Write-Host "Gradle build failed" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==> Launching Ta-Da!..." -ForegroundColor Cyan
adb shell am start -n living.tada.app/.MainActivity

Write-Host ""
Write-Host "Done. Check the phone." -ForegroundColor Green
