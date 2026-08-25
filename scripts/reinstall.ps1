# ============================================================
# scripts/reinstall.ps1 — 사일런트 재설치 + 바탕화면 바로가기 (2026-07-23)
#
# 재빌드(npm run build:win) 후 설치판을 사람 클릭 없이 교체한다. 앱 종료 → /S 사일런트 설치 →
# exe/마이그 검증 → 바탕화면 바로가기 생성/유효화. 사일런트 설치가 바로가기를 누락/무효화하는
# 경우를 스크립트가 확실히 보정한다(사장님 지시 2026-07-23).
#
# 사용:
#   powershell -ExecutionPolicy Bypass -File scripts\reinstall.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\reinstall.ps1 -Setup "경로\Setup.exe" -Launch
# 옵션: -Setup <경로>(미지정 시 dist 최신 Setup 자동) · -Launch(설치 후 앱 실행)
# ============================================================
param(
  [string]$Setup = "",
  [switch]$Launch
)
$ErrorActionPreference = 'Stop'
$AppName = "IATF16949 품질경영시스템"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\iatf16949-manager"
$Exe = Join-Path $InstallDir "$AppName.exe"

# 1) Setup 경로 결정 — 미지정 시 repo\dist 의 최신 *Setup*.exe
if (-not $Setup) {
  $dist = Join-Path (Split-Path $PSScriptRoot) "dist"
  $cand = Get-ChildItem "$dist\*Setup*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $cand) { throw "dist 에서 Setup 을 못 찾음. -Setup 으로 경로를 지정하세요." }
  $Setup = $cand.FullName
}
if (-not (Test-Path $Setup)) { throw "Setup 파일 없음: $Setup" }
Write-Host "[reinstall] Setup = $Setup"

# 2) 실행 중 앱 종료(Program Files exe 잠금 해제)
$running = Get-Process -Name $AppName -ErrorAction SilentlyContinue
if ($running) {
  Write-Host "[reinstall] 실행 중 앱 종료($($running.Count) proc)..."
  $running | Stop-Process -Force
  Start-Sleep -Seconds 2
}

# 3) 사일런트 설치
Write-Host "[reinstall] 사일런트 설치 중(/S)..."
Start-Process -FilePath $Setup -ArgumentList "/S" -Wait
Start-Sleep -Seconds 2
if (-not (Test-Path $Exe)) { throw "설치 실패: $Exe 없음" }
Write-Host "[reinstall] 설치 완료: exe $((Get-Item $Exe).LastWriteTime)"

# 4) 마이그 번들 스모크(설치본 resources/migrations 존재 확인)
$migDir = Join-Path $InstallDir "resources\migrations"
if (Test-Path $migDir) {
  $migCount = (Get-ChildItem "$migDir\*.sql").Count
  Write-Host "[reinstall] 번들 마이그 $migCount 개"
}

# 5) 바탕화면 바로가기 생성/유효화 (OneDrive 리다이렉트 대응 = .NET 경로)
$desktop = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell
$lnkPath = Join-Path $desktop "데일리Q.lnk"
$lnk = $ws.CreateShortcut($lnkPath)
$lnk.TargetPath = $Exe
$lnk.WorkingDirectory = $InstallDir
$lnk.IconLocation = "$Exe,0"
$lnk.Description = "IATF 16949 품질경영시스템"
$lnk.Save()
Write-Host "[reinstall] 바탕화면 바로가기: $lnkPath"

# 6) (선택) 실행 — 봇 셸에서 실행 시 ELECTRON_RUN_AS_NODE 제거 필수
if ($Launch) {
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  Start-Process -FilePath $Exe
  Write-Host "[reinstall] 앱 실행"
}
Write-Host "[reinstall] 완료."
