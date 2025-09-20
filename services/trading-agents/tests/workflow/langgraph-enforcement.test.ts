import { EnhancedTradingAgentsGraph } from '../../src/graph/enhanced-trading-graph';
import { recordResult } from './test-helper';

(async () => {
  const name = 'langgraph-enforcement';
  const warnings: string[] = [];
  const errors: string[] = [];
  const metrics: Record<string, any> = {};
  try {
    const cfg = {
      config: {
        projectDir: './project',
        resultsDir: './results',
        dataDir: './data',
        dataCacheDir: './cache',
        exportsDir: './exports',
        logsDir: './logs',
        deepThinkLlm: 'microsoft/phi-4-mini-reasoning',
        quickThinkLlm: 'microsoft/phi-4-mini-reasoning',
        maxDebateRounds: 1,
        maxRiskDiscussRounds: 1,
        maxRecurLimit: 1,
        onlineTools: false
      },
      enableLangGraph: false, // Intentionally attempt to disable
      selectedAnalysts: ['market'] as any
    };
    const g = new EnhancedTradingAgentsGraph(cfg as any);
    const info = g.getConfigInfo();
    metrics.langGraphEnabled = info.langGraphEnabled;
    metrics.langGraphEnforcement = (info as any).langGraphEnforcement;
    if (!info.langGraphEnabled) {
      errors.push('LangGraph should be enabled but is disabled');
    }
    if (metrics.langGraphEnforcement !== 'forced' && cfg.enableLangGraph === false) {
      warnings.push('Expected enforcement flag to be forced');
    }
    recordResult({ name, passed: errors.length === 0, warnings, errors, metrics });
  } catch (e: any) {
    errors.push(e?.message || String(e));
    recordResult({ name, passed: false, warnings, errors, metrics });
  }
})();
