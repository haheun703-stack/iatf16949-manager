# Convert Excel files to PDF using LibreOffice headless, with ASCII staging.
#
# Why ASCII staging:
#   LibreOffice's command-line parser cannot reliably load files whose path
#   contains Korean characters mixed with "&" or similar shell-special chars.
#   Workaround: copy each input to C:\temp\iatf-conv\src\<slug>.xlsx first,
#   then convert, then map back via mapping.json.
#
# Output layout:
#   <StagingRoot>\
#     src\<slug>.xlsx     ← staged copies
#     pdf\<slug>.pdf      ← LibreOffice output
#     mapping.json        ← slug → original path / category / clean name
#
# Usage:
#   .\xlsx-to-pdf-libreoffice.ps1 -InputDir "d:\..." -StagingRoot "C:\temp\iatf-conv"
#   .\xlsx-to-pdf-libreoffice.ps1 -InputPath "d:\..\file.xlsx" -StagingRoot "C:\temp\iatf-conv"

param(
    [string]$InputPath,
    [string]$InputDir,
    [Parameter(Mandatory = $true)]
    [string]$StagingRoot,
    [string]$SofficePath
)

# ─── locate soffice ─────────────────────────────────────────
if (-not $SofficePath) {
    $candidates = @(
        "$env:ProgramFiles\LibreOffice\program\soffice.exe",
        "${env:ProgramFiles(x86)}\LibreOffice\program\soffice.exe",
        "$env:LOCALAPPDATA\Programs\LibreOffice\program\soffice.exe"
    )
    foreach ($p in $candidates) {
        if (Test-Path -LiteralPath $p) { $SofficePath = $p; break }
    }
}
if (-not $SofficePath -or -not (Test-Path -LiteralPath $SofficePath)) {
    Write-Error "LibreOffice not found. Install: winget install --id TheDocumentFoundation.LibreOffice"
    exit 1
}
Write-Host "Using: $SofficePath" -ForegroundColor Gray

# ─── prepare staging dirs ───────────────────────────────────
$srcDir = Join-Path $StagingRoot 'src'
$pdfDir = Join-Path $StagingRoot 'pdf'
$mappingPath = Join-Path $StagingRoot 'mapping.json'

foreach ($d in @($StagingRoot, $srcDir, $pdfDir)) {
    if (-not (Test-Path -LiteralPath $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

# ─── collect inputs ─────────────────────────────────────────
$inputs = @()
if ($InputPath) {
    if (-not (Test-Path -LiteralPath $InputPath)) { Write-Error "InputPath not found"; exit 1 }
    $inputs += (Get-Item -LiteralPath $InputPath).FullName
}
elseif ($InputDir) {
    if (-not (Test-Path -LiteralPath $InputDir)) { Write-Error "InputDir not found"; exit 1 }
    $inputs = Get-ChildItem -LiteralPath $InputDir -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object {
            -not $_.PSIsContainer -and
            $_.Extension -match '\.xlsx?$' -and
            -not $_.Name.StartsWith('~$')
        } |
        ForEach-Object { $_.FullName }
}
else { Write-Error "Need -InputPath or -InputDir"; exit 1 }

$baseInputDir = if ($InputDir) { (Get-Item -LiteralPath $InputDir).FullName.TrimEnd('\') } else { '' }
Write-Host "Files: $($inputs.Count)" -ForegroundColor White
Write-Host "Staging: $StagingRoot" -ForegroundColor White
Write-Host ""

# ─── stage to ASCII names ──────────────────────────────────
# Each file gets a deterministic slug: <subFolderPrefix>_<index>
$mapping = @()
$idx = 0
foreach ($f in $inputs) {
    $idx++
    $rel = if ($baseInputDir) { (Split-Path -Parent $f).Substring($baseInputDir.Length).TrimStart('\') } else { '' }
    # Detect category from subdir number prefix (ASCII-safe)
    # Folder naming: 1.= manual, 2.= process, 3.= regulation
    $category = 'misc'
    if ($rel -match '^\s*1\.')       { $category = 'manual' }
    elseif ($rel -match '^\s*2\.')   { $category = 'process' }
    elseif ($rel -match '^\s*3\.')   { $category = 'regulation' }

    $slug = ('item_{0:D3}' -f $idx)
    $stagedXlsx = Join-Path $srcDir "$slug.xlsx"

    Copy-Item -LiteralPath $f -Destination $stagedXlsx -Force
    try { Unblock-File -LiteralPath $stagedXlsx -ErrorAction SilentlyContinue } catch {}

    $mapping += [PSCustomObject]@{
        slug         = $slug
        originalPath = $f
        originalName = [IO.Path]::GetFileName($f)
        subDir       = $rel
        category     = $category
        stagedXlsx   = $stagedXlsx
        pdfPath      = Join-Path $pdfDir "$slug.pdf"
    }
}

# ─── batch convert with one soffice invocation per file (more robust) ─
$ok = 0
$failed = 0
$mappingResults = @()
foreach ($m in $mapping) {
    Write-Host "CONV [$($m.slug)] $($m.category) :: $($m.originalName)" -ForegroundColor Cyan
    try {
        $p = Start-Process -FilePath $SofficePath -ArgumentList @(
            '--headless', '--norestore', '--nologo', '--nolockcheck', '--invisible',
            '--convert-to', 'pdf',
            '--outdir', $pdfDir,
            $m.stagedXlsx
        ) -NoNewWindow -Wait -PassThru
        if ($p.ExitCode -eq 0 -and (Test-Path -LiteralPath $m.pdfPath)) {
            Write-Host "  OK" -ForegroundColor Green
            $ok++
            $m | Add-Member -NotePropertyName status -NotePropertyValue 'ok' -PassThru | Out-Null
        }
        else {
            Write-Host "  FAILED exit=$($p.ExitCode)" -ForegroundColor Red
            $failed++
            $m | Add-Member -NotePropertyName status -NotePropertyValue 'failed' -PassThru | Out-Null
        }
    }
    catch {
        Write-Host "  EXCEPTION: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
        $m | Add-Member -NotePropertyName status -NotePropertyValue 'failed' -PassThru | Out-Null
    }
    $mappingResults += $m
}

# ─── write mapping.json ─────────────────────────────────────
$mappingResults | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $mappingPath -Encoding UTF8

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor White
Write-Host "Converted: $ok / $($mapping.Count)" -ForegroundColor Green
Write-Host "Failed   : $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })
Write-Host "Mapping  : $mappingPath" -ForegroundColor Gray
