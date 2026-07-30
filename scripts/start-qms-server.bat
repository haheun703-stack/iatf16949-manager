@echo off
rem QMS local web server (electron-node, blocking). Started minimized by start-qms-web.vbs.
rem ASCII only - cmd reads .bat as ANSI(CP949); this file is saved UTF-8, so a hardcoded
rem Korean path breaks (cd fails -> "path not found", bug found 260730). %~dp0 = this
rem script's own folder (scripts\), so the repo root is derived without any non-ASCII.
title IATF QMS Server
cd /d "%~dp0.."
set ELECTRON_RUN_AS_NODE=1
echo IATF QMS web server running. Close this window to stop. ( http://127.0.0.1:8080 )
"node_modules\electron\dist\electron.exe" "server\index.cjs" >> "%TEMP%\qms-server.log" 2>&1
