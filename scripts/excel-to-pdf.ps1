# Convert Excel files to per-sheet PDFs using Excel COM automation.
#
# Usage:
#   .\excel-to-pdf.ps1 -InputPath "C:\path\file.xlsx" -OutputDir "C:\out"
#   .\excel-to-pdf.ps1 -InputDir "C:\folder" -OutputDir "C:\out"

param(
    [string]$InputPath,
    [string]$InputDir,
    [Parameter(Mandatory = $true)]
    [string]$OutputDir
)

function Sanitize-FileName {
    param([string]$Name)
    $invalid = [IO.Path]::GetInvalidFileNameChars()
    $clean = -join ($Name.ToCharArray() | ForEach-Object {
        if ($invalid -contains $_) { '_' } else { $_ }
    })
    $clean = ($clean -replace '_+', '_').Trim('_', ' ', '.')
    if (-not $clean) { $clean = 'sheet' }
    return $clean
}

function Get-CleanBaseName {
    param([string]$FullPath)
    $bn = [IO.Path]::GetFileNameWithoutExtension($FullPath)
    $bn = $bn -replace '\s*\([^)]*\)\s*', ' '
    $bn = $bn.Trim()
    return (Sanitize-FileName -Name $bn)
}

function Set-SheetPageFit {
    param([object]$Sheet, [object]$Excel)
    try { $Sheet.PageSetup.Zoom = $false } catch {}
    try { $Sheet.PageSetup.FitToPagesWide = 1 } catch {}
    try { $Sheet.PageSetup.FitToPagesTall = 0 } catch {}
    try { $Sheet.PageSetup.LeftMargin = $Excel.InchesToPoints(0.3) } catch {}
    try { $Sheet.PageSetup.RightMargin = $Excel.InchesToPoints(0.3) } catch {}
    try { $Sheet.PageSetup.TopMargin = $Excel.InchesToPoints(0.3) } catch {}
    try { $Sheet.PageSetup.BottomMargin = $Excel.InchesToPoints(0.3) } catch {}
    try { $Sheet.PageSetup.HeaderMargin = $Excel.InchesToPoints(0.0) } catch {}
    try { $Sheet.PageSetup.FooterMargin = $Excel.InchesToPoints(0.0) } catch {}
}

function Convert-OneWorkbook {
    param([object]$Excel, [string]$InputFile, [string]$OutputBase)

    $fileBase = Get-CleanBaseName -FullPath $InputFile
    $thisOut = Join-Path $OutputBase $fileBase
    if (-not (Test-Path $thisOut)) {
        New-Item -ItemType Directory -Path $thisOut -Force | Out-Null
    }

    Write-Host "OPEN: $([IO.Path]::GetFileName($InputFile))" -ForegroundColor Cyan
    $wb = $null
    try {
        $wb = $Excel.Workbooks.Open($InputFile, 0, $true)  # ReadOnly
    }
    catch {
        Write-Host "  ERROR opening: $($_.Exception.Message)" -ForegroundColor Red
        $r = @{ file = $InputFile; status = 'open_failed'; sheets = 0; exported = 0; failed = 0; outDir = $thisOut }
        Write-Output -NoEnumerate $r
        return
    }

    $sheetIdx = 0
    $exported = 0
    $failed = 0
    foreach ($sheet in $wb.Worksheets) {
        $sheetIdx++
        $sheetName = $sheet.Name
        $cleanName = Sanitize-FileName -Name $sheetName
        $pdfName = ('{0:D2}_{1}.pdf' -f $sheetIdx, $cleanName)
        $pdfPath = Join-Path $thisOut $pdfName

        try {
            Set-SheetPageFit -Sheet $sheet -Excel $Excel
            $sheet.ExportAsFixedFormat(0, $pdfPath) | Out-Null
            Write-Host "  [$sheetIdx] $pdfName" -ForegroundColor Green
            $exported++
        }
        catch {
            Write-Host "  FAILED [$sheetName]: $($_.Exception.Message)" -ForegroundColor Yellow
            $failed++
        }
    }

    try { $wb.Close($false) | Out-Null } catch {}

    $r = @{
        file     = $InputFile
        status   = 'ok'
        sheets   = $sheetIdx
        exported = $exported
        failed   = $failed
        outDir   = $thisOut
    }
    Write-Output -NoEnumerate $r
}

# ─── Main ───────────────────────────────────────────────────

if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }

$inputs = @()
if ($InputPath) {
    if (-not (Test-Path $InputPath)) {
        Write-Error "InputPath not found: $InputPath"
        exit 1
    }
    $inputs += (Get-Item -LiteralPath $InputPath).FullName
}
elseif ($InputDir) {
    if (-not (Test-Path $InputDir)) {
        Write-Error "InputDir not found: $InputDir"
        exit 1
    }
    $inputs = Get-ChildItem -LiteralPath $InputDir -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object {
            -not $_.PSIsContainer -and
            $_.Extension -match '\.xlsx?$' -and
            -not $_.Name.StartsWith('~$')
        } |
        ForEach-Object { $_.FullName }
}
else {
    Write-Error "Must provide either -InputPath or -InputDir"
    exit 1
}

Write-Host "Total files: $($inputs.Count)" -ForegroundColor White
Write-Host "Output dir : $OutputDir" -ForegroundColor White
Write-Host ""

# Remove Mark of the Web from input files (avoids Protected View prompts)
Write-Host "Unblocking input files (remove MOTW)..." -ForegroundColor Gray
foreach ($f in $inputs) {
    try { Unblock-File -LiteralPath $f -ErrorAction SilentlyContinue } catch {}
}

$excel = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.ScreenUpdating = $false
    $excel.AskToUpdateLinks = $false
    $excel.EnableEvents = $false
    # 3 = msoAutomationSecurityForceDisable (disable ALL macros silently)
    try { $excel.AutomationSecurity = 3 } catch {}
}
catch {
    Write-Error "Failed to start Excel: $($_.Exception.Message)"
    exit 1
}

$results = New-Object System.Collections.ArrayList
foreach ($inputFile in $inputs) {
    $r = Convert-OneWorkbook -Excel $excel -InputFile $inputFile -OutputBase $OutputDir
    [void]$results.Add($r)
}

try { $excel.Quit() | Out-Null } catch {}
try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null } catch {}
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor White
$ok = ($results | Where-Object { $_.status -eq 'ok' }).Count
$exportedTotal = 0
foreach ($r in $results) { $exportedTotal += $r.exported }
$failedTotal = 0
foreach ($r in $results) { $failedTotal += $r.failed }
Write-Host "Files processed: $ok / $($results.Count)" -ForegroundColor White
Write-Host "PDFs exported  : $exportedTotal" -ForegroundColor Green
Write-Host "Failed sheets  : $failedTotal" -ForegroundColor $(if ($failedTotal -gt 0) { 'Yellow' } else { 'Green' })
