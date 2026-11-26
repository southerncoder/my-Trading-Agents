// The Professor's first question must match the call's timing (no "why wait for the trigger" on a buy-now call).
import { callTiming } from '../../src/agents/educational/professor';
const cases: Array<[string, string]> = [
  ['{"decision": "BUY", "action_now": "enter_now"}', 'now'],
  ['{"decision": "HOLD", "action_now": "wait_for_trigger"}', 'trigger'],
  ['{"decision": "SELL", "action_now": "exit"}', 'exit'],
  ['{"decision": "SELL", "action_now": "reduce"}', 'exit'],
  ['{"decision": "HOLD", "action_now": "hold_existing"}', 'wait'],
  ['{"decision": "HOLD", "action_now": "none"}', 'wait'],
  ['no json at all', 'wait'],
];
const bad = cases.filter(([t, want]) => callTiming(t) !== want);
if (bad.length) {
  console.error('❌ Professor timing:', bad.map(([t, w]) => `${t} -> ${callTiming(t)} (want ${w})`).join('; '));
  process.exit(1);
}
console.log(`✅ Professor timing: ${cases.length} cases`);
