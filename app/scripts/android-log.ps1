# android-log.ps1
# Streams Android WebView JavaScript console output to both the terminal and a
# shared log file that the devcontainer can tail without any copy-paste.
#
# Requires: adb on PATH, phone connected via USB with USB debugging enabled,
#           and a build that includes the TadaJS WebChromeClient override in
#           MainActivity.java (see docs/dev/android-build-handover.md).
#
# Usage:
#   cd app\scripts
#   .\android-log.ps1          # stream, append to log file
#   .\android-log.ps1 -Clear   # clear log file first, then stream
#
# In devcontainer (parallel terminal):
#   tail -f /workspaces/tada/android-js.log

param(
    [switch]$Clear
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Script lives at app/scripts/ — repo root is two levels up.
$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
$LogFile  = Join-Path $RepoRoot "android-js.log"

if ($Clear) {
    Remove-Item $LogFile -ErrorAction SilentlyContinue
    Write-Host "Log cleared."
}

Write-Host ""
Write-Host "  Log file  :  $LogFile"
Write-Host "  In devcontainer:  tail -f /workspaces/tada/android-js.log"
Write-Host ""

Write-Host "Clearing logcat ring buffer..."
& adb logcat -c

Write-Host "Streaming TadaJS + Capacitor errors. Press Ctrl+C to stop."
Write-Host "────────────────────────────────────────────────────────────"

# Capacitor/Console:V — all JS console.log/warn/error (Capacitor 8 built-in)
# TadaJS:V  — same, via our BridgeWebChromeClient override in MainActivity.java (belt-and-suspenders)
# Capacitor:E — Capacitor bridge hard errors (native-side crashes)
# CapacitorHttp:W — CapacitorHttp fetch warnings (e.g. SSL / redirect issues)
& adb logcat -s "Capacitor/Console:V" "TadaJS:V" "Capacitor:E" "CapacitorHttp:W" -v time |
    Tee-Object -FilePath $LogFile -Append
