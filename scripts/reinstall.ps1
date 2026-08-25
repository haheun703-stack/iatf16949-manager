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
# 제품명(2026-08-25 데일리Q 로 개명). exe 이름은 productName 을 따라가므로 **하드코딩하지 않고**
# 설치 폴더에서 찾는다 — 이름이 또 바뀌어도 이 스크립트가 "설치 실패"로 오판하지 않게 한다.
$AppName = "데일리Q"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\iatf16949-manager"
function Find-AppExe {
  if (-not (Test-Path $InstallDir)) { return $null }
  $prefer = Join-Path $InstallDir "$AppName.exe"
  if (Test-Path $prefer) { return $prefer }
  # 언인스톨러를 빼고 가장 큰 exe = 본체
  $c = Get-ChildItem $InstallDir -Filter *.exe -ErrorAction SilentlyContinue |
       Where-Object { $_.Name -notmatch '^Uninstall' } |
       Sort-Object Length -Descending | Select-Object -First 1
  if ($c) { return $c.FullName }
  return $null
}
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
# 프로세스 이름 = exe 파일명. 개명 전 이름으로 돌고 있을 수도 있으니 설치 폴더에서 실행 중인 것을 함께 본다.
$existing = Find-AppExe
$procNames = @($AppName)
if ($existing) { $procNames += [IO.Path]::GetFileNameWithoutExtension($existing) }
$running = Get-Process -Name ($procNames | Select-Object -Unique) -ErrorAction SilentlyContinue
if ($running) {
  Write-Host "[reinstall] 실행 중 앱 종료($($running.Count) proc)..."
  $running | Stop-Process -Force
  Start-Sleep -Seconds 2
}

# 3) 사일런트 설치
Write-Host "[reinstall] 사일런트 설치 중(/S)..."
Start-Process -FilePath $Setup -ArgumentList "/S" -Wait
Start-Sleep -Seconds 2
# 설치가 만든 실제 exe 를 찾아 확정한다(제품명이 바뀌어도 오판하지 않게).
$Exe = Find-AppExe
if (-not $Exe) { throw "설치 실패: $InstallDir 에 실행 파일이 없음" }
Write-Host "[reinstall] 설치 완료: $([IO.Path]::GetFileName($Exe)) $((Get-Item $Exe).LastWriteTime)"

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
