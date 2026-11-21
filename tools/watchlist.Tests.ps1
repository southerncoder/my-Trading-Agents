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

  It 'leaves the queue as .processing and changes nothing when watchlist.json is missing or unparsable' {
    $e = New-TestEnv $null @(@{ id = '1'; action = 'add'; ticker = 'KO'; list = 'brands'; cadence = 'nightly' })
    $out = Apply $e
    Test-Path ($e.Q + '.processing') | Should Be $true
    Test-Path $e.Wl | Should Be $false
    (($out -join ' ') -match 'could not') | Should Be $true
    [IO.File]::WriteAllText($e.Wl, '{broken', $utf8)
    Apply $e | Out-Null
    Test-Path ($e.Q + '.processing') | Should Be $true
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
