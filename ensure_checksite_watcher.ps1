$ErrorActionPreference = "Stop"

$root = "C:\Users\Mreoc\checksite"
$watcher = Join-Path $root "checksite_bridge_watchdog.py"
$starter = Join-Path $root "start_checksite_watcher.cmd"
$heartbeat = Join-Path $root ".checksite_watcher_heartbeat"
$maxHeartbeatAgeSeconds = 120

function Get-WatcherProcess {
  Get-CimInstance Win32_Process |
    Where-Object { $_.ProcessName -like "python*" -and $_.CommandLine -like "*checksite_bridge_watchdog.py*" }
}

$processes = @(Get-WatcherProcess)
$heartbeatFresh = $false

if (Test-Path -LiteralPath $heartbeat) {
  $ageSeconds = ((Get-Date) - (Get-Item -LiteralPath $heartbeat).LastWriteTime).TotalSeconds
  $heartbeatFresh = $ageSeconds -le $maxHeartbeatAgeSeconds
} else {
  $ageSeconds = [double]::PositiveInfinity
}

if ($processes.Count -gt 0 -and $heartbeatFresh) {
  Write-Output "Watcher healthy: process_count=$($processes.Count), heartbeat_age_seconds=$([math]::Round($ageSeconds, 1))"
  exit 0
}

if ($processes.Count -gt 0) {
  Write-Output "Watcher process exists but heartbeat is stale/missing; restarting. process_count=$($processes.Count), heartbeat_age_seconds=$ageSeconds"
  foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force
  }
} else {
  Write-Output "Watcher process missing; starting."
}

Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "Set-Location -LiteralPath '$root'; python .\checksite_bridge_watchdog.py --kick"
) -WorkingDirectory $root
Start-Sleep -Seconds 3

$newProcesses = @(Get-WatcherProcess)
if ($newProcesses.Count -eq 0) {
  Write-Error "Watcher restart failed: no checksite_bridge_watchdog.py process found."
  exit 1
}

Write-Output "Watcher started: process_count=$($newProcesses.Count)"
