#!/usr/bin/env node
// Manual test migrated from root: test-lmstudio-connection.ts
// Purpose: Validate remote LM Studio connectivity via LLMProviderFactory.

import { LLMProviderFactory } from '../../src/providers/llm-factory';
import { LLMProvider } from '../../src/types/config';

async function main() {
  console.log('🧪 LM Studio connection manual test...');
  const config = {
    provider: 'remote_lmstudio' as LLMProvider,
    model: 'mistralai/devstral-small-2507',
    baseUrl: process.env.REMOTE_LM_STUDIO_BASE_URL,
    temperature: 0.7,
    maxTokens: 100
  };
  console.log('📍 URL:', config.baseUrl);
  try {
    const ok = await LLMProviderFactory.testConnection(config);
    if (ok) console.log('✅ Connection successful'); else console.log('❌ Connection failed');
  } catch (e) {
    console.error('❌ Connection error:', e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
