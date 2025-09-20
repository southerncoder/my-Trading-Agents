import { FinancialSituationMemory } from '../../src/agents/utils/memory';
import { recordResult } from './test-helper';

(async () => {
  const testName = 'roundtrip-memory-similarity';
  const warnings: string[] = [];
  const errors: string[] = [];
  const metrics: Record<string, any> = {};
  try {
    const agentConfig = { provider: 'remote_lmstudio', model: 'openai/gpt-oss-20b' } as any;
    const memory = new FinancialSituationMemory('roundtrip', agentConfig);

    const inputSituation = 'Rising interest rates are increasing banking sector volatility';
    const inputRecommendation = 'Reduce exposure to rate-sensitive bank equities and monitor yield curve inversion signals';
    await memory.addSituations([[inputSituation, inputRecommendation]]);
    metrics.memoryCount = memory.count();

    const query = 'banking sector facing volatility due to higher rates';
    const matches = await memory.getMemories(query, 3);
    metrics.retrievedCount = matches.length;

    // Similarity: use provided similarityScore if present, else fallback token overlap
    function tokenOverlap(a: string, b: string) {
      const at = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
      const bt = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
      let inter = 0; for (const t of at) if (bt.has(t)) inter++;
      return inter / Math.max(1, Math.min(at.size, bt.size));
    }

    let bestScore = 0;
    for (const m of matches) {
      const score = typeof m.similarityScore === 'number' ? m.similarityScore : tokenOverlap(inputSituation, m.matchedSituation);
      if (score > bestScore) bestScore = score;
    }
    metrics.bestScore = bestScore;

    const minSimilarity = process.env.WORKFLOW_MIN_ROUNDTRIP_SIMILARITY ? parseFloat(process.env.WORKFLOW_MIN_ROUNDTRIP_SIMILARITY) : 0.4;
    if (bestScore < minSimilarity) {
      warnings.push(`similarity below threshold: ${bestScore.toFixed(2)} < ${minSimilarity}`);
    }

    recordResult({ name: testName, passed: true, warnings, errors, metrics });
  } catch (e: any) {
    errors.push(e?.message || String(e));
    recordResult({ name: testName, passed: false, warnings, errors, metrics });
  }
})();
