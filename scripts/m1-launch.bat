@echo off
rem M-1 helper (260813): start the rebuilt desktop app with a local diagnostic port
rem so the bot can verify the "no user selected -> save rejected" guard automatically.
rem Port 9223 is local-only (127.0.0.1). ASCII only (see note in start-qms-server.bat).
cd /d "%~dp0..\dist\win-unpacked"
for %%f in ("IATF16949*.exe") do (
  start "" "%%f" --remote-debugging-port=9223
  goto done
)
echo [FAIL] app exe not found in dist\win-unpacked
pause
exit /b 1
:done
exit /b 0
