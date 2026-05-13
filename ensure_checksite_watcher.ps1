param(
  [switch]$Force
)

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

function Get-WatcherShellProcess {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.ProcessName -like "*powershell*" -and
      $_.CommandLine -like "*checksite_bridge_watchdog.py*" -and
      $_.ProcessId -ne $PID
    }
}

function Stop-WatcherProcessTree {
  $watchers = @(Get-WatcherProcess)
  foreach ($process in $watchers) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }

  $shells = @(Get-WatcherShellProcess)
  foreach ($process in $shells) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

$processes = @(Get-WatcherProcess)
$heartbeatFresh = $false

if (Test-Path -LiteralPath $heartbeat) {
  $ageSeconds = ((Get-Date) - (Get-Item -LiteralPath $heartbeat).LastWriteTime).TotalSeconds
  $heartbeatFresh = $ageSeconds -le $maxHeartbeatAgeSeconds
} else {
  $ageSeconds = [double]::PositiveInfinity
}

if ($Force) {
  Write-Output "Force restart requested; closing watcher processes before start. process_count=$($processes.Count)"
  Stop-WatcherProcessTree
} elseif ($processes.Count -gt 0 -and $heartbeatFresh) {
  Write-Output "Watcher healthy: process_count=$($processes.Count), heartbeat_age_seconds=$([math]::Round($ageSeconds, 1))"
  exit 0
} elseif ($processes.Count -gt 0) {
  Write-Output "Watcher process exists but heartbeat is stale/missing; restarting. process_count=$($processes.Count), heartbeat_age_seconds=$ageSeconds"
  Stop-WatcherProcessTree
} else {
  Write-Output "Watcher process missing; starting."
  $staleShells = @(Get-WatcherShellProcess)
  if ($staleShells.Count -gt 0) {
    Write-Output "Closing stale watcher shell windows: count=$($staleShells.Count)"
    Stop-WatcherProcessTree
  }
}

Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "Set-Location -LiteralPath '$root'; python .\checksite_bridge_watchdog.py --kick"
) -WorkingDirectory $root -WindowStyle Hidden
Start-Sleep -Seconds 3

$newProcesses = @(Get-WatcherProcess)
if ($newProcesses.Count -eq 0) {
  Write-Error "Watcher restart failed: no checksite_bridge_watchdog.py process found."
  exit 1
}

Write-Output "Watcher started: process_count=$($newProcesses.Count)"
