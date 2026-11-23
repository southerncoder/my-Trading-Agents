import { describe, expect, it } from 'vitest'
import { extractDecision } from './decision'

const PM = `{"decision":"HOLD","confidence":0.45,"action_now":"wait_for_trigger","trigger_price":130.0,"trigger_type":"breakout","trigger_reason":"first support {above} price","walk_away_price":114.8,"rationale":"Waiting.","key_risks":["A","B"],"data_gaps":["C"],"what_would_change_my_mind":"Earnings beat."}
FINAL DECISION: HOLD`

describe('extractDecision', () => {
  it('parses the PM JSON and drops the redundant final line', () => {
    const r = extractDecision(PM)
    expect(r?.decision.decision).toBe('HOLD')
    expect(r?.decision.trigger_price).toBe(130)
    expect(r?.decision.walk_away_price).toBe(114.8)
    expect(r?.decision.key_risks).toEqual(['A', 'B'])
    expect(r?.decision.trigger_reason).toBe('first support {above} price')
    expect(r?.rest).toBe('')
  })

  it('handles fenced JSON with prose around it', () => {
    const r = extractDecision('Some intro.\n```json\n{"decision":"buy","trigger_price":null}\n```\nFINAL DECISION: SELL')
    expect(r?.decision.decision).toBe('BUY')
    expect(r?.decision.trigger_price).toBeNull()
    expect(r?.rest).toBe('Some intro.\n\nFINAL DECISION: SELL')
  })

  it('returns null for prose, broken JSON or non-decision objects', () => {
    expect(extractDecision('Just text')).toBeNull()
    expect(extractDecision('{"decision": "HOLD"')).toBeNull()
    expect(extractDecision('{"foo": 1}')).toBeNull()
  })
})
