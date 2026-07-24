@echo off
rem ============================================================
rem start-qms-web.bat — 로컬 웹 서버(이 콘솔) + 크롬 자동 열기. 바탕화면 바로가기가 직접 가리킨다.
rem   electron.exe 는 콘솔 프로세스(cmd)가 부모여야 산다 → 이 콘솔에서 blocking 실행.
rem   크롬은 별도 powershell 이 5초 뒤 연다(서버 기동 대기). 이 최소화 창을 닫으면 서버 종료.
rem   127.0.0.1 고정(사내망 오픈 전). 최초 로그인 시 이름+원하는 비번으로 계정 비번 설정.
rem ============================================================
title IATF QMS Server (닫으면 웹서버 종료)
cd /d "d:\IATF16949,SQ 자동작성 봇\iatf16949-manager"

rem 서버가 이미 떠있으면 크롬만 열고 종료
powershell -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient;try{$c.Connect('127.0.0.1',8080);$c.Close();exit 0}catch{exit 1}"
if not errorlevel 1 goto onlychrome

rem 크롬 지연 오픈(별도 hidden powershell — 서버 뜰 시간 확보)
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 5; Start-Process chrome '--app=http://127.0.0.1:8080/'"

rem 서버 blocking(이 콘솔)
set ELECTRON_RUN_AS_NODE=1
"node_modules\electron\dist\electron.exe" "server\index.cjs"
goto end

:onlychrome
start "" chrome --app=http://127.0.0.1:8080/
:end
