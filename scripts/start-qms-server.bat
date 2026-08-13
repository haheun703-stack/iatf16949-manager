@echo off
rem QMS local web server (electron-node, blocking). Started minimized by start-qms-web.vbs.
rem ASCII only - cmd reads .bat as ANSI(CP949); this file is saved UTF-8, so a hardcoded
rem Korean path breaks (cd fails -> "path not found", bug found 260730). %~dp0 = this
rem script's own folder (scripts\), so the repo root is derived without any non-ASCII.
rem 260813: NO MUTE FAILURE (35 directive) - if port 8080 is already taken, or the server
rem process dies on its own, this window now STAYS OPEN and says why (the 8/13 incident:
rem an old server held the port, the new one died silently, and the old version kept serving).
title IATF QMS Server
cd /d "%~dp0.."

rem -- pre-check: is something already LISTENING on :8080? (old server -> new one would die mute)
netstat -ano | findstr "LISTENING" | findstr ":8080 " >nul 2>&1
if %errorlevel%==0 (
  echo.
  echo [FAIL] Port 8080 is ALREADY in use - an old QMS server is still running.
  echo        To RESTART: close the existing "IATF QMS Server" window first,
  echo        or run scripts\restart-qms-server.bat - then run this again.
  echo.
  pause
  exit /b 1
)

set ELECTRON_RUN_AS_NODE=1
rem 260813: the old text said "Close this window to stop" - PROVEN WRONG (electron is a GUI
rem subsystem exe, it detaches from this console and survives the close as an orphan).
echo IATF QMS web server running.  ( http://127.0.0.1:8080 )
echo KEEP this window open - minimize it. Closing it does NOT stop the server.
echo To stop or restart: run scripts\restart-qms-server.bat
"node_modules\electron\dist\electron.exe" "server\index.cjs" >> "%TEMP%\qms-server.log" 2>&1

rem -- reached only when the server exits BY ITSELF (crash/port race): keep window + show log tail
echo.
echo [FAIL] QMS server exited unexpectedly. Last log lines ( %TEMP%\qms-server.log ):
powershell -NoProfile -Command "Get-Content -Tail 15 \"$env:TEMP\qms-server.log\""
echo.
pause
exit /b 1
