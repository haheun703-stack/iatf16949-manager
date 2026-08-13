' start-qms-server-silent.vbs - QMS server autostart (logon task, no browser).
' Same as start-qms-web.vbs minus the chrome launch: if the server is already
' alive it exits quietly, else it starts the server batch minimized.
' Registered via: schtasks ONLOGON "IATF QMS Server" (2026-08-12, approved).
' NOTE: ASCII only - wscript reads .vbs as ANSI (Korean literals break, bug 260730).
Option Explicit
Dim root, sh, fso, i
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))

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
  ' Minimized (7): electron-node dies if the console is fully hidden (0).
  sh.Run """" & root & "\scripts\start-qms-server.bat""", 7, False
  For i = 1 To 25
    WScript.Sleep 700
    If ServerAlive() Then Exit For
  Next
  ' 260813 NO MUTE FAILURE: autostart must not fail silently either - one popup at logon
  ' is better than a dead server nobody notices until they try to log in.
  If Not ServerAlive() Then
    MsgBox "QMS server did NOT start at logon." & vbCrLf & _
      "Check the 'IATF QMS Server' window in the taskbar (it stays open with the reason)." & vbCrLf & _
      "Log: %TEMP%\qms-server.log", vbCritical, "QMS autostart - start failed"
  End If
End If
