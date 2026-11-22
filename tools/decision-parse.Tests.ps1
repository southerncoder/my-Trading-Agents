. (Join-Path $PSScriptRoot 'decision-parse.ps1')

Describe 'Read-PmDecision' {
  It 'reads the last Portfolio Manager JSON block, even with LaTeX-style escapes inside' {
    $log = @'
noise {"decision": "BUY", "confidence": 0.9}
more noise
{"decision": "HOLD", "confidence": 0.62, "action_now": "wait_for_trigger", "trigger_price": 130.5, "rationale": "Up 5\% this week"}
Final trading decision: HOLD (Confidence: 0.62)
'@
    $d = Read-PmDecision $log
    $d.Decision | Should Be 'HOLD'
    $d.Confidence | Should Be 0.62
    $d.Action | Should Be 'wait_for_trigger'
    $d.Label | Should Be 'Buy if price reaches trigger'
    $d.Json.trigger_price | Should Be 130.5
    $d.Json.rationale | Should Be 'Up 5% this week'
  }
  It 'falls back to the final decision line when there is no JSON block' {
    $d = Read-PmDecision 'Final trading decision: SELL (Confidence: 0.55)'
    $d.Decision | Should Be 'SELL'
    $d.Confidence | Should Be 0.55
    $d.Json | Should BeNullOrEmpty
  }
  It 'defaults to HOLD at 0.3 when nothing is readable' {
    $d = Read-PmDecision 'the model said nothing useful'
    $d.Decision | Should Be 'HOLD'
    $d.Confidence | Should Be 0.3
    $d.Label | Should Be 'Wait'
  }
}

Describe 'NormAction and CallLabel' {
  It 'maps free-form actions onto the allowed set' {
    NormAction 'Enter on trigger' | Should Be 'wait_for_trigger'
    NormAction 'enter_partial' | Should Be 'enter_now'
    NormAction 'scale out' | Should Be 'reduce'
    NormAction 'close position' | Should Be 'exit'
    NormAction 'maintain' | Should Be 'hold_existing'
    NormAction '' | Should Be ''
  }
  It 'labels calls the way the pages show them' {
    CallLabel 'BUY' 'enter_now' | Should Be 'Buy now'
    CallLabel 'SELL' 'wait_for_trigger' | Should Be 'Short if price reaches trigger'
    CallLabel 'SELL' 'enter_now' | Should Be 'Short (bet price falls)'
    CallLabel 'SELL' 'reduce' | Should Be 'Trim'
    CallLabel 'SELL' 'exit' | Should Be 'Exit'
    CallLabel 'HOLD' 'hold_existing' | Should Be 'Keep'
  }
  It 'Num reads numbers out of text' {
    Num '$1,234.5' | Should Be 1234.5
    Num 'n/a' | Should BeNullOrEmpty
  }
}
