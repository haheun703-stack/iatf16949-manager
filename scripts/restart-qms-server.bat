@echo off
rem QMS server ONE-CLICK RESTART (260813 - after the mute-failure incident: an old server
rem held :8080, a "restart" silently kept serving the old version).
rem Steps: kill whatever LISTENs on :8080 -> start the server minimized -> verify health.
rem NOTE: this DISCONNECTS logged-in users (they log in again once). Run it on purpose.
rem ASCII only (see note in start-qms-server.bat).
title QMS server restart
cd /d "%~dp0.."

echo [1/3] stopping old server on :8080 ...
set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":8080 "') do (
  set FOUND=1
  echo        killing PID %%p
  taskkill /pid %%p /f >nul 2>&1
)
if "%FOUND%"=="0" echo        no old server found - fresh start
timeout /t 2 /nobreak >nul

echo [2/3] starting new server (minimized window "IATF QMS Server") ...
start "IATF QMS Server" /min cmd /c "%~dp0start-qms-server.bat"

echo [3/3] waiting for health (max 25s) ...
set OK=0
for /l %%i in (1,1,25) do (
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:8080/api/health | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 goto up
  timeout /t 1 /nobreak >nul
)
goto down

:up
echo.
echo [OK] server is UP: http://127.0.0.1:8080  (users must log in again)
echo.
pause
exit /b 0

:down
echo.
echo [FAIL] server did NOT come up - check the "IATF QMS Server" window
echo        and the log: %TEMP%\qms-server.log
echo.
pause
exit /b 1
