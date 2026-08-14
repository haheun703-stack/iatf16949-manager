@echo off
rem M-1 helper (260813): start the rebuilt desktop app with a local diagnostic port
rem so the bot can verify the "no user selected -> save rejected" guard automatically.
rem Port 9223 is local-only (127.0.0.1). ASCII only (see note in start-qms-server.bat).
rem M-18 (code-review 8/13): the debug port is an UNAUTHENTICATED execution channel into
rem the app's DB while the app runs. The app MUST be closed right after the check.
cd /d "%~dp0..\dist\win-unpacked"
for %%f in ("IATF16949*.exe") do (
  start "" "%%f" --remote-debugging-port=9223
  goto done
)
echo [FAIL] app exe not found in dist\win-unpacked
pause
exit /b 1
:done
echo.
echo [!] IMPORTANT: when the check is done, CLOSE the app window. You MUST close it -
echo     while it runs, port 9223 is an open no-login channel into the app (local only,
echo     but still). Do not leave it running in the background.
echo.
pause
exit /b 0
