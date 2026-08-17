# ============================================================
# sweep-orphan-consoles.ps1 - orphan launcher-window sweep, PID based (2026-08-17)
#
# Why this exists (C' review reply, co-work):
#   restart-qms-server.bat used to sweep by WINDOW TITLE with /t (tree kill). The review-copy
#   server (:8081) is launched by the same script family and carries the SAME title, so one
#   restart could take it down mid-review (rule 36-4 forbids restarting :8081 during review).
#   Dropping /t helped, but the ROOT fix the reviewer asked for is: never decide by title alone -
#   decide by "does this process (or its child) currently own a listening port".
#
# Contract:
#   - PROTECT  = every process currently LISTENING on any TCP port, plus its parent chain.
#                (the launcher cmd is the parent of the electron server, so both are protected)
#   - SWEEP    = cmd.exe hosts whose window title matches, MINUS the protect set.
#   - Never /t. Never kill by title alone. Always report what was kept and why.
#
# Exit: 0 always (sweeping is best-effort housekeeping; the caller decides what is fatal).
# ASCII only - this file is invoked from .bat (see note in start-qms-server.bat).
# ============================================================
[CmdletBinding()]
param(
  [string]$TitleLike = 'IATF QMS Server*',
  [switch]$WhatIfOnly
)

$ErrorActionPreference = 'SilentlyContinue'

function Get-ParentId([int]$ProcessId) {
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId"
  if ($p) { return [int]$p.ParentProcessId }
  return 0
}

# ---- 1) build the protect set: listeners + their parent chain -------------------------------
$protect = New-Object System.Collections.Generic.HashSet[int]
$listeners = @()
try {
  $listeners = Get-NetTCPConnection -State Listen | Select-Object -ExpandProperty OwningProcess -Unique
} catch {
  # very old hosts: fall back to netstat parsing
  $listeners = (netstat -ano | Select-String 'LISTENING') -replace '.*\s(\d+)\s*$', '$1' | Sort-Object -Unique
}
foreach ($listenerPid in $listeners) {
  $id = [int]$listenerPid
  if ($id -le 4) { continue }              # 0/4 = System
  $null = $protect.Add($id)
  # walk up the parent chain (max 4 hops) - the launcher cmd hosting the server must survive
  $cur = $id
  for ($i = 0; $i -lt 4; $i++) {
    $par = Get-ParentId $cur
    if ($par -le 4) { break }
    $null = $protect.Add($par)
    $cur = $par
  }
}

# ---- 2) candidates: cmd.exe hosts carrying the launcher window title ------------------------
$candidates = Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" | ForEach-Object {
  $proc = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
  if ($proc -and $proc.MainWindowTitle -like $TitleLike) { $_ }
}

if (-not $candidates) {
  Write-Host '       no matching launcher windows.'
  exit 0
}

# ---- 3) sweep the ones that own nothing ----------------------------------------------------
$killed = 0
$kept = 0
foreach ($c in $candidates) {
  $id = [int]$c.ProcessId
  if ($protect.Contains($id)) {
    $kept++
    Write-Host "       KEEP pid $id - it (or its child) is serving a live port"
    continue
  }
  if ($WhatIfOnly) {
    Write-Host "       WOULD SWEEP pid $id - orphan window, owns no listening port"
    continue
  }
  Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
  # Termination is asynchronous: checking immediately reports a false FAILED (observed on the
  # 8/17 13:59 live restart - pid 35828 was in fact gone, the script just looked too early).
  # A false "FAILED" is not harmless here: it tells a human the orphan window survived, which
  # is exactly the M-12 symptom they would then go hunting for. Wait briefly, then re-check.
  $gone = $false
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 200
    if (-not (Get-Process -Id $id -ErrorAction SilentlyContinue)) { $gone = $true; break }
  }
  if ($gone) {
    $killed++
    Write-Host "       swept   pid $id - orphan window, owned no listening port"
  } else {
    Write-Host "       FAILED  pid $id - still running after 2s (permissions?)"
  }
}
Write-Host "       result: swept $killed, kept $kept (protected listeners: $($protect.Count) pids)"
exit 0
