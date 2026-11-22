<#
.SYNOPSIS
  Registers (or updates) the "Portfolio analysis worker" scheduled task: every 10 minutes, hidden, for the current
  user, one copy at a time. It runs tools\portfolio-worker.ps1, which exits at once when nothing is queued.

.EXAMPLE
  .\tools\register-portfolio-worker.ps1            # register or update
  .\tools\register-portfolio-worker.ps1 -Remove    # remove the task
#>
param([switch]$Remove, [int]$EveryMinutes = 10)
$name = 'Portfolio analysis worker'
if ($Remove) { Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue; Write-Host "Removed '$name'"; return }
$vbs = Join-Path $PSScriptRoot 'run-hidden.vbs'
$worker = Join-Path $PSScriptRoot 'portfolio-worker.ps1'
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$vbs`" powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$worker`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $name -Description 'Runs analyses queued by the paper-portfolio service (Picks page requests and nightly re-analysis rules). Exits at once when nothing is queued.' -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Registered '$name' (every $EveryMinutes minutes). Remove with: .\tools\register-portfolio-worker.ps1 -Remove"
