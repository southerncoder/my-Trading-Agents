# Shared helpers for reading an analysis log (one `node cli.js analyze` run). Dot-source this file.
# Used by nightly-brief.ps1 (the nightly run) and analyze-ticker.ps1 (one ticker on demand), so both read
# the Portfolio Manager's decision the same way.

function Num($v) { if ($null -eq $v) { return $null }; $s = ([string]$v) -replace '[^0-9.\-]', ''; $n = 0.0; if ($s -and [double]::TryParse($s, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$n)) { return $n }; return $null }
function Cut($s, $n) { if ($s) { $s = [string]$s; $s.Substring(0, [Math]::Min($n, $s.Length)) } else { '' } }
function Raw($v) { if ($null -eq $v) { return $null }; if ($v -is [psobject] -and $v.PSObject.Properties['raw']) { return $v.raw }; return $v }

# Free-form action words from the model, mapped onto the allowed set.
function NormAction($v) {
  if (-not $v) { return '' }
  $s = ([string]$v).Trim().ToLower() -replace '[\s-]+', '_'
  if ($s -in 'enter_now','wait_for_trigger','hold_existing','reduce','exit') { return $s }
  if ($s -match 'trigger|pullback|dip|limit|on_|if_|pending|wait') { return 'wait_for_trigger' }
  if ($s -match 'partial|enter|buy|add|accumulate|initiate|short') { return 'enter_now' }
  if ($s -match 'trim|reduce|scale') { return 'reduce' }
  if ($s -match 'exit|sell|close|cover') { return 'exit' }
  if ($s -match 'hold|keep|maintain') { return 'hold_existing' }
  return ''
}

# The label the pages show for a decision and action.
function CallLabel($d, $a) {
  if ($a -eq 'wait_for_trigger') { if ($d -eq 'SELL') { return 'Short if price reaches trigger' } else { return 'Buy if price reaches trigger' } }
  if ($d -eq 'BUY') { if ($a -eq 'hold_existing') { return 'Keep' } else { return 'Buy now' } }
  if ($d -eq 'SELL') { if ($a -eq 'reduce') { return 'Trim' } elseif ($a -eq 'enter_now') { return 'Short (bet price falls)' } else { return 'Exit' } }
  if ($a -eq 'hold_existing') { return 'Keep' } else { return 'Wait' }
}

# The Portfolio Manager's decision from a log: the last JSON block with a "decision" field, else the
# "Final trading decision" line, else HOLD at 0.3.
function Read-PmDecision([string]$Text) {
  $json = $null
  $ms = [regex]::Matches($Text, '\{[^{}]*"decision"[^{}]*\}')
  # Models sometimes write LaTeX-style escapes (\%) inside the JSON; strip them or the whole block is lost.
  if ($ms.Count) { try { $json = ($ms[$ms.Count - 1].Value -replace '\\(?!["\\/bfnrtu])', '') | ConvertFrom-Json } catch { $json = $null } }
  $fin = [regex]::Match($Text, 'Final trading decision:\s*(BUY|HOLD|SELL)\s*\(Confidence:\s*([0-9.]+)\)')
  $d = if ($json) { ([string]$json.decision).ToUpper() } elseif ($fin.Success) { $fin.Groups[1].Value } else { 'HOLD' }
  $c = if ($json -and $json.confidence) { [double]$json.confidence } elseif ($fin.Success) { [double]$fin.Groups[2].Value } else { 0.3 }
  $a = if ($json) { NormAction $json.action_now } else { '' }
  [pscustomobject]@{ Json = $json; Decision = $d; Confidence = $c; Action = $a; Label = (CallLabel $d $a) }
}
