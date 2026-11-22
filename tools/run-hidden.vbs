' Runs a command with no visible window and waits for it (used by scheduled tasks so no console flashes).
'   wscript.exe run-hidden.vbs powershell.exe -NoProfile -File C:\path\script.ps1
Set sh = CreateObject("WScript.Shell")
cmd = ""
For Each a In WScript.Arguments
  cmd = cmd & " """ & a & """"
Next
WScript.Quit sh.Run(Trim(cmd), 0, True)
