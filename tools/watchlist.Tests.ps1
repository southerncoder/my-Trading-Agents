# Pester 3.4 tests for Apply-WatchlistRequests. Run: Invoke-Pester tools\watchlist.Tests.ps1
. "$PSScriptRoot\watchlist.ps1"

$utf8 = New-Object Text.UTF8Encoding $false

function New-TestEnv($stocks, $requests) {
  $dir = Join-Path $TestDrive ([guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $dir | Out-Null
  $e = [pscustomobject]@{ Wl = (Join-Path $dir 'watchlist.json'); Q = (Join-Path $dir 'watchlist.jsonl'); Done = (Join-Path $dir 'watchlist.done.jsonl') }
  if ($null -ne $stocks) {
    [IO.File]::WriteAllText($e.Wl, ((@{ _comment = 'keep me'; stocks = $stocks }) | ConvertTo-Json -Depth 5), $utf8)
  }
  if ($requests) {
    $lines = foreach ($r in $requests) { if ($r -is [string]) { $r } else { $r | ConvertTo-Json -Compress } }
    [IO.File]::WriteAllText($e.Q, (($lines -join "`n") + "`n"), $utf8)
  }
  $e
}

function Apply($e) { Apply-WatchlistRequests -WatchlistPath $e.Wl -QueuePath $e.Q -DonePath $e.Done }
function ReadWl($e) { [IO.File]::ReadAllText($e.Wl) | ConvertFrom-Json }
function DoneEntries($e) { if (Test-Path $e.Done) { @(Get-Content $e.Done | Where-Object { $_.Trim() } | ForEach-Object { $_ | ConvertFrom-Json }) } else { @() } }

$nvda = @{ ticker = 'NVDA'; list = 'core'; cadence = 'nightly' }

Describe 'Apply-WatchlistRequests' {
  It 'does nothing and creates nothing when there is no queue' {
    $e = New-TestEnv @($nvda) $null
    $out = Apply $e
    @($out).Count | Should Be 0
    Test-Path $e.Done | Should Be $false
  }

  It 'adds a stock: trims and uppercases the ticker, keeps lesson and _comment, empties the queue' {
    $e = New-TestEnv @($nvda) @(@{ id = '1'; action = 'add'; ticker = ' amd '; list = 'core'; cadence = 'weekly'; lesson = 'chips' })
    $out = Apply $e
    $wl = ReadWl $e
    $amd = @($wl.stocks | Where-Object { $_.ticker -eq 'AMD' })
    $amd.Count | Should Be 1
    $amd[0].list | Should Be 'core'
    $amd[0].cadence | Should Be 'weekly'
    $amd[0].lesson | Should Be 'chips'
    $wl._comment | Should Be 'keep me'
    (($out -join ' ') -match 'AMD') | Should Be $true
    Test-Path $e.Q | Should Be $false
    Test-Path ($e.Q + '.processing') | Should Be $false
    (DoneEntries $e)[0].result | Should Be 'applied'
  }

  It 'set_cadence changes an existing stock' {
    $e = New-TestEnv @($nvda) @(@{ id = '1'; action = 'set_cadence'; ticker = 'nvda'; cadence = 'paused' })
    Apply $e | Out-Null
    (ReadWl $e).stocks[0].cadence | Should Be 'paused'
  }

  It 'rejects add of a ticker already on the list, including a second add in the same batch' {
    $e = New-TestEnv @($nvda) @(
      @{ id = '1'; action = 'add'; ticker = 'NVDA'; list = 'core'; cadence = 'nightly' },
      @{ id = '2'; action = 'add'; ticker = 'KO'; list = 'brands'; cadence = 'nightly' },
      @{ id = '3'; action = 'add'; ticker = 'KO'; list = 'brands'; cadence = 'weekly' })
    Apply $e | Out-Null
    @((ReadWl $e).stocks).Count | Should Be 2
    $d = DoneEntries $e
    $d[0].result | Should Be 'rejected'
    $d[1].result | Should Be 'applied'
    $d[2].result | Should Be 'rejected'
  }

  It 'rejects set_cadence for an unknown ticker' {
    $e = New-TestEnv @($nvda) @(@{ id = '1'; action = 'set_cadence'; ticker = 'ZZZ'; cadence = 'paused' })
    Apply $e | Out-Null
    (DoneEntries $e)[0].result | Should Be 'rejected'
  }

  It 'rejects hostile or malformed tickers, lists, cadences and actions without touching the file' {
    $bad = @(
      @{ id = 'a'; action = 'add'; ticker = 'NVDA"}],"x":1'; list = 'core'; cadence = 'nightly' },
      @{ id = 'b'; action = 'add'; ticker = '..\..\evil'; list = 'core'; cadence = 'nightly' },
      @{ id = 'c'; action = 'add'; ticker = 'ABCDEFGHIJK'; list = 'core'; cadence = 'nightly' },
      @{ id = 'd'; action = 'add'; ticker = 'OK'; list = 'staples'; cadence = 'nightly' },
      @{ id = 'e'; action = 'add'; ticker = 'OK'; list = 'core'; cadence = 'hourly' },
      @{ id = 'f'; action = 'add'; ticker = 'OK'; list = 'core' },
      @{ id = 'g'; action = 'delete'; ticker = 'NVDA' })
    $e = New-TestEnv @($nvda) $bad
    $before = [IO.File]::ReadAllText($e.Wl)
    Apply $e | Out-Null
    [IO.File]::ReadAllText($e.Wl) | Should Be $before
    @(DoneEntries $e | Where-Object { $_.result -eq 'rejected' }).Count | Should Be 7
  }

  It 'rejects an unparsable line but still applies the others' {
    $e = New-TestEnv @($nvda) @('{not json', @{ id = '2'; action = 'add'; ticker = 'KO'; list = 'brands'; cadence = 'nightly' })
    Apply $e | Out-Null
    $d = DoneEntries $e
    $d[0].result | Should Be 'rejected'
    $d[1].result | Should Be 'applied'
  }

  It 'strips control characters from the lesson and caps it at 200 characters' {
    $long = ('x' * 300)
    $e = New-TestEnv @($nvda) @(@{ id = '1'; action = 'add'; ticker = 'KO'; list = 'brands'; cadence = 'nightly'; lesson = ("a`tb`r`n") + $long })
    Apply $e | Out-Null
    $ko = @((ReadWl $e).stocks | Where-Object { $_.ticker -eq 'KO' })[0]
    $ko.lesson.Length | Should BeLessThan 201
    ($ko.lesson -match '[\x00-\x1f]') | Should Be $false
  }

  It 'keeps stocks a JSON array with one stock, writes no BOM, and Get-Watchlist can still read it' {
    $e = New-TestEnv @($nvda) @(@{ id = '1'; action = 'set_cadence'; ticker = 'NVDA'; cadence = 'nightly' })
    Apply $e | Out-Null
    $raw = [IO.File]::ReadAllText($e.Wl)
    ($raw -match '"stocks"\s*:\s*\[') | Should Be $true
    $bytes = [IO.File]::ReadAllBytes($e.Wl)
    ($bytes[0] -eq 0xEF) | Should Be $false
    $script:WatchlistPath = $e.Wl
    (Get-Watchlist -Date '2026-11-23').Core -contains 'NVDA' | Should Be $true
  }

  It 'keeps the batch file and changes nothing when watchlist.json is missing or unparsable' {
    $e = New-TestEnv $null @(@{ id = '1'; action = 'add'; ticker = 'KO'; list = 'brands'; cadence = 'nightly' })
    $out = Apply $e
    @(Get-ChildItem (Split-Path $e.Q) -Filter 'watchlist.jsonl.*').Count | Should Be 1
    Test-Path $e.Wl | Should Be $false
    (($out -join ' ') -match 'could not') | Should Be $true
    [IO.File]::WriteAllText($e.Wl, '{broken', $utf8)
    Apply $e | Out-Null
    @(Get-ChildItem (Split-Path $e.Q) -Filter 'watchlist.jsonl.*').Count | Should Be 1
    [IO.File]::ReadAllText($e.Wl) | Should Be '{broken'
  }

  It 'processes a leftover .processing file from a crashed run before the new queue' {
    $e = New-TestEnv @($nvda) @(@{ id = '2'; action = 'add'; ticker = 'PEP'; list = 'brands'; cadence = 'nightly' })
    [IO.File]::WriteAllText(($e.Q + '.processing'), ((@{ id = '1'; action = 'add'; ticker = 'KO'; list = 'brands'; cadence = 'nightly' } | ConvertTo-Json -Compress) + "`n"), $utf8)
    Apply $e | Out-Null
    $tickers = @((ReadWl $e).stocks | ForEach-Object { $_.ticker })
    ($tickers -contains 'KO') | Should Be $true
    ($tickers -contains 'PEP') | Should Be $true
    (DoneEntries $e)[0].request.ticker | Should Be 'KO'
    Test-Path ($e.Q + '.processing') | Should Be $false
  }
}

Describe 'Apply-WatchlistRequests review fixes' {
  It 'keeps non-ASCII text intact across rewrites (UTF-8 in, UTF-8 out)' {
    $e = New-TestEnv @($nvda) $null
    [IO.File]::WriteAllText($e.Wl, ('{"_comment":"caf' + [char]0xE9 + '","stocks":[{"ticker":"NVDA","list":"core","cadence":"nightly","lesson":"na' + [char]0xEF + 've"}]}'), $utf8)
    [IO.File]::WriteAllText($e.Q, ('{"action":"add","ticker":"KO","list":"core","cadence":"nightly","lesson":"caf' + [char]0xE9 + '"}' + "`n"), $utf8)
    Apply $e | Out-Null
    [IO.File]::WriteAllText($e.Q, ('{"action":"set_cadence","ticker":"NVDA","cadence":"weekly"}' + "`n"), $utf8)
    Apply $e | Out-Null
    $wl = [IO.File]::ReadAllText($e.Wl, $utf8) | ConvertFrom-Json
    $wl._comment | Should Be ('caf' + [char]0xE9)
    (@($wl.stocks | Where-Object ticker -eq 'NVDA')[0].lesson) | Should Be ('na' + [char]0xEF + 've')
    (@($wl.stocks | Where-Object ticker -eq 'KO')[0].lesson) | Should Be ('caf' + [char]0xE9)
  }

  It 'when watchlist.json cannot be replaced: reports waiting, keeps the batch, logs nothing as applied, then applies later' {
    $e = New-TestEnv @($nvda) @(@{ action = 'set_cadence'; ticker = 'NVDA'; cadence = 'paused' })
    $lock = [IO.File]::Open($e.Wl, 'Open', 'Read', 'Read')
    try { $out = Apply $e } finally { $lock.Dispose() }
    (($out -join ' ') -match 'waiting') | Should Be $true
    (($out -join ' ') -match 'applied') | Should Be $false
    (ReadWl $e).stocks[0].cadence | Should Be 'nightly'
    @(DoneEntries $e).Count | Should Be 0
    Test-Path "$($e.Wl).tmp" | Should Be $false
    $out2 = Apply $e
    (($out2 -join ' ') -match 'NVDA now paused') | Should Be $true
    (ReadWl $e).stocks[0].cadence | Should Be 'paused'
    @(DoneEntries $e).Count | Should Be 1
  }

  It 'processes a batch stranded in a .moving file by a crashed run' {
    $e = New-TestEnv @($nvda) $null
    $line = (@{ action = 'add'; ticker = 'KO'; list = 'core'; cadence = 'nightly' } | ConvertTo-Json -Compress)
    [IO.File]::WriteAllText("$($e.Q).moving.20260101000000000.abc", $line + "`n", $utf8)
    $out = Apply $e
    (($out -join ' ') -match 'added KO') | Should Be $true
    @(Get-ChildItem (Split-Path $e.Q) -Filter 'watchlist.jsonl.*').Count | Should Be 0
  }

  It 'does not delete a batch file that grew after it was read' {
    $e = New-TestEnv @($nvda) $null
    $proc = "$($e.Q).processing"
    [IO.File]::WriteAllText($proc, ((@{ action = 'add'; ticker = 'KO'; list = 'core'; cadence = 'nightly' } | ConvertTo-Json -Compress) + "`n"), $utf8)
    # Simulated late append: the file gains a line between our read and delete. Done via the test hook.
    $global:AfterBatchRead = { [IO.File]::AppendAllText($proc, ((@{ action = 'add'; ticker = 'PEP'; list = 'core'; cadence = 'nightly' } | ConvertTo-Json -Compress) + "`n"), $utf8) }
    try { Apply $e | Out-Null } finally { $global:AfterBatchRead = $null }
    Test-Path $proc | Should Be $true
    $out = Apply $e
    (@((ReadWl $e).stocks | Where-Object ticker -eq 'PEP')).Count | Should Be 1
  }

  It 'rejects a list written in capitals' {
    $e = New-TestEnv @($nvda) @(@{ action = 'add'; ticker = 'KO'; list = 'CORE'; cadence = 'nightly' })
    $out = Apply $e
    (($out -join ' ') -match 'list must be') | Should Be $true
  }

  It 'does not cut an emoji in half when capping the lesson at 200 characters' {
    $emoji = [char]::ConvertFromUtf32(0x1F600)
    $e = New-TestEnv @($nvda) @(@{ id = '1'; action = 'add'; ticker = 'KO'; list = 'core'; cadence = 'nightly'; lesson = (('x' * 199) + $emoji + 'tail') })
    Apply $e | Out-Null
    $bytes = [IO.File]::ReadAllBytes($e.Wl)
    $text = (New-Object Text.UTF8Encoding($false, $true)).GetString($bytes)
    $ko = @(($text | ConvertFrom-Json).stocks | Where-Object { $_.ticker -eq 'KO' })[0]
    ($ko.lesson -match [string][char]0xFFFD) | Should Be $false
    $ko.lesson.Length | Should Be 199
  }
}
