@echo off
rem QMS server ONE-CLICK RESTART (260813 - after the mute-failure incident: an old server
rem held :8080, a "restart" silently kept serving the old version).
rem 260814 M-12 hardening (code-review 8/13): the old script trusted taskkill blindly.
rem   [1] VERIFY the port is actually free after the kill (fail hard if not - nothing starts)
rem   [2] close orphan "IATF QMS Server" launcher windows (one piled up per restart)
rem   [3] after health OK, show the NEW server's pid + start time (health now exposes them,
rem       so a human can tell old/new apart - the identity the batch-A slimming removed).
rem Steps: kill whatever LISTENs on :8080 -> verify freed -> sweep orphan windows ->
rem        start minimized -> verify health + identity.
rem NOTE: this DISCONNECTS logged-in users (they log in again once). Run it on purpose.
rem ASCII only (see note in start-qms-server.bat).
title QMS server restart
cd /d "%~dp0.."

echo [1/4] stopping old server on :8080 ...
set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":8080 "') do (
  set FOUND=1
  echo        killing PID %%p
  taskkill /pid %%p /f >nul 2>&1
)
if "%FOUND%"=="0" echo        no old server found - fresh start

rem -- M-12 [1]: do NOT trust taskkill - re-check the port until it is actually free (max 6s)
set TRIES=0
:waitfree
netstat -ano | findstr "LISTENING" | findstr ":8080 " >nul 2>&1
if errorlevel 1 goto freed
set /a TRIES+=1
if %TRIES% geq 6 goto stillheld
timeout /t 1 /nobreak >nul
goto waitfree

:stillheld
echo.
echo [FAIL] port 8080 is STILL held - the kill did not work (permissions? see Task Manager).
echo        NOTHING was started - the old server keeps serving. Fix and run this again.
echo.
pause
exit /b 1

:freed
echo        port 8080 confirmed free.

echo [2/4] sweeping orphan "IATF QMS Server" windows ...
rem -- M-12 [2]: each restart used to leave one dead launcher window behind (the electron
rem    child dies by PID kill, its host cmd falls to [FAIL]+pause and sits there forever).
rem -- C' (260817): the sweep used to be `taskkill /f /t /fi "WINDOWTITLE eq IATF QMS Server*"`.
rem    The review-copy server (:8081) is launched by this same script family and carries the
rem    SAME window title, so one restart could take it down mid-review (rule 36-4).
rem
rem    First fix was "drop /t", on the premise that electron survives its console going away.
rem    The co-work review (C' reply 3) rejected that premise as unproven and demanded evidence,
rem    which is fair: "parent process died" (observed 8/16) is NOT "console was destroyed".
rem    Evidence now exists - scripts/e2e-console-kill.mjs, 12/12: host-cmd kill (no /t) -> server
rem    SURVIVES; console WM_CLOSE (cmd confirmed gone) -> server SURVIVES; /t tree kill -> server
rem    DIES. So dropping /t was right for THIS launch shape.
rem
rem    But the root fix the reviewer asked for does not depend on that premise at all:
rem    **decide by ownership, not by window title.** sweep-orphan-consoles.ps1 protects every
rem    process that currently owns a LISTENING port (and its parent chain) and sweeps only the
rem    windows that own nothing. If the launch shape ever changes, :8081 is still safe.
call powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sweep-orphan-consoles.ps1"

echo [3/4] starting new server (minimized window "IATF QMS Server") ...
start "IATF QMS Server" /min cmd /c "%~dp0start-qms-server.bat"

echo [4/4] waiting for health (max 25s) ...
for /l %%i in (1,1,25) do (
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:8080/api/health | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 goto up
  timeout /t 1 /nobreak >nul
)
goto down

:up
echo.
echo [OK] server is UP: http://127.0.0.1:8080  (users must log in again)
rem -- M-12 [3]: show the new server's identity (pid + start time from /api/health)
powershell -NoProfile -Command "try { $j = Invoke-RestMethod -TimeoutSec 3 'http://127.0.0.1:8080/api/health'; Write-Host ('     new server PID ' + $j.pid + ', started ' + $j.startedAt) } catch { Write-Host '     (identity check failed - see the server window)' }"
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
