@echo off
rem QMS local web server (electron-node, blocking). Started minimized by start-qms-web.vbs.
rem ASCII only - Korean breaks under CP949 console. Logs go to a file (console stays empty/minimized).
title IATF QMS Server
cd /d "d:\IATF16949,SQ 자동작성 봇\iatf16949-manager"
set ELECTRON_RUN_AS_NODE=1
echo IATF QMS web server running. Close this window to stop. ( http://127.0.0.1:8080 )
"node_modules\electron\dist\electron.exe" "server\index.cjs" >> "%TEMP%\qms-server.log" 2>&1
