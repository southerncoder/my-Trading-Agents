# US stock-market full-day closures (NYSE; source: nyse.com/trade/hours-calendars).
# Early-close days (Nov 27 2026, Dec 24 2026, Nov 26 2027) still trade, so they are not listed.
# Keep in step with MARKET_HOLIDAYS in services/web-api/src/services/nightly-derive.ts (a test checks this).
# Extend before the end of 2027.
$script:MarketHolidays = @(
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
  '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'
)

function Test-MarketHoliday([datetime]$Date) {
  $script:MarketHolidays -contains $Date.ToString('yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
}