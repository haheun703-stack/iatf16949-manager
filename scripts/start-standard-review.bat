@echo off
rem ============================================================
rem scripts/start-standard-review.bat - standard-pack CLEAN-INSTALL review server (:8083)
rem (S3-1 co-work proposal, 2026-08-19: content of the SALES build is only visible on a
rem  clean install - this server lets the reviewer compare it side-by-side with :8081.)
rem
rem - DB      : %LOCALAPPDATA%\iatf-standard-review  (stable dir, NOT temp - survives cleanup.
rem             First run creates it via IATF_INIT_DB=1; later runs just reopen it.)
rem - Packs   : standard only (no tpc pack, no real names - the exact sales-install shape).
rem - Badge   : IATF_REVIEW_COPY=1 (explicit, M2 260823) => health.copy=true => red "review copy" banner
rem             + E2E bot login allowed (rule 36-6). Without the flag a copy is a plain customer install.
rem - Login   : E2E봇 / qms1234  (seed once: scripts\seed-local-passwords.cjs with the same
rem             IATF_DATA_DIR - kept out of this bat so a plain relaunch never reseeds.)
rem - Title   : distinct from "IATF QMS Server*" so restart-qms-server.bat sweep never hits us.
rem - ASCII only in this file (cmd reads .bat as ANSI/CP949 - Korean here breaks, bug 260730).
rem ============================================================
title QMS Standard Review 8083
cd /d "%~dp0.."

netstat -ano | findstr "LISTENING" | findstr ":8083 " >nul 2>&1
if %errorlevel%==0 (
  echo.
  echo [FAIL] Port 8083 already in use - the standard review server seems to be running.
  echo        Check the "QMS Standard Review 8083" window in the taskbar.
  echo.
  pause
  exit /b 1
)

set ELECTRON_RUN_AS_NODE=1
set PORT=8083
set IATF_DATA_DIR=%LOCALAPPDATA%\iatf-standard-review
rem M2 (260823): review-copy badge + E2E bot login are opened ONLY by this explicit flag (42-D). Never set it for a customer install.
set IATF_REVIEW_COPY=1
set IATF_INIT_DB=1
set IATF_INSTALL_PACKS=standard
echo Standard-pack clean-install review server.  ( http://127.0.0.1:8083 )
echo KEEP this window open - minimize it. Closing it does NOT stop the server.
echo Login: E2E bot account only (review copy - no real records).
"node_modules\electron\dist\electron.exe" "server\index.cjs" >> "%TEMP%\qms-standard-8083.log" 2>&1

echo.
echo [FAIL] Standard review server exited unexpectedly. Last log lines ( %TEMP%\qms-standard-8083.log ):
powershell -NoProfile -Command "Get-Content -Tail 15 \"$env:TEMP\qms-standard-8083.log\""
echo.
pause
exit /b 1
