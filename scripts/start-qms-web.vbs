' start-qms-web.vbs - QMS local web launcher (no console window).
' Server already up -> open chrome only. Else start server hidden (logs to file), wait, open chrome.
Option Explicit
Dim root, sh, i
root = "d:\IATF16949,SQ 자동작성 봇\iatf16949-manager"
Set sh = CreateObject("WScript.Shell")

Function ServerAlive()
  Dim ok, h
  ok = False
  On Error Resume Next
  Set h = CreateObject("MSXML2.XMLHTTP")
  h.Open "GET", "http://127.0.0.1:8080/api/health", False
  h.Send
  If Err.Number = 0 Then
    If h.Status = 200 Then ok = True
  End If
  On Error GoTo 0
  ServerAlive = ok
End Function

If Not ServerAlive() Then
  ' Run the server batch MINIMIZED (7). electron-node dies if the console is fully hidden (0),
  ' so we keep a minimized console (taskbar only). Logs go to %TEMP%\qms-server.log.
  sh.Run """" & root & "\scripts\start-qms-server.bat""", 7, False
  For i = 1 To 25
    WScript.Sleep 700
    If ServerAlive() Then Exit For
  Next
End If

' Open the app in a new chrome window if chrome is found, else default browser.
' (--app windows merged into an existing chrome and were unreliable; --new-window is stable.)
Dim chromePath, q
q = Chr(34)
chromePath = ""
On Error Resume Next
chromePath = sh.RegRead("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe\")
If chromePath = "" Then chromePath = sh.RegRead("HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe\")
If chromePath <> "" Then
  sh.Run q & chromePath & q & " --new-window http://127.0.0.1:8080/", 1, False
Else
  sh.Run "http://127.0.0.1:8080/", 1, False
End If
On Error GoTo 0
