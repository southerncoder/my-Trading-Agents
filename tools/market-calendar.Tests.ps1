. (Join-Path $PSScriptRoot 'market-calendar.ps1')

Describe 'Test-MarketHoliday' {
  It 'is true on Thanksgiving 2026 and Christmas 2026' {
    (Test-MarketHoliday ([datetime]'2026-11-26')) | Should Be $true
    (Test-MarketHoliday ([datetime]'2026-12-25')) | Should Be $true
  }
  It 'is true on observed holidays that move off the weekend (July 3 2026, June 18 2027, Dec 24 2027)' {
    (Test-MarketHoliday ([datetime]'2026-07-03')) | Should Be $true
    (Test-MarketHoliday ([datetime]'2027-06-18')) | Should Be $true
    (Test-MarketHoliday ([datetime]'2027-12-24')) | Should Be $true
  }
  It 'is false on an ordinary weekday and on early-close days, which still trade' {
    (Test-MarketHoliday ([datetime]'2026-11-24')) | Should Be $false
    (Test-MarketHoliday ([datetime]'2026-11-27')) | Should Be $false
    (Test-MarketHoliday ([datetime]'2026-12-24')) | Should Be $false
  }
  It 'ignores the time of day' {
    (Test-MarketHoliday ([datetime]'2026-11-26 16:42')) | Should Be $true
  }
  It 'agrees with the web-api list (same 20 dates)' {
    $api = Get-Content (Join-Path $PSScriptRoot '..\services\web-api\src\services\nightly-derive.ts') -Raw
    $m = [regex]::Matches(([regex]::Match($api, 'MARKET_HOLIDAYS = new Set\(\[(.*?)\]\)', 'Singleline')).Groups[1].Value, '\d{4}-\d{2}-\d{2}')
    $apiDates = @($m | ForEach-Object { $_.Value } | Sort-Object)
    $apiDates.Count | Should Be 20
    (($script:MarketHolidays | Sort-Object) -join ',') | Should Be ($apiDates -join ',')
  }
}