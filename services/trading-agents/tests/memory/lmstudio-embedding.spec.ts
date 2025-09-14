import { describe, test, expect, afterEach, beforeEach, jest } from '@jest/globals';

describe('LM Studio embeddings and prod fallback gating', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('LM Studio works without OPENAI_API_KEY when LOCAL_LMSTUDIO_BASE_URL is set', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.OPENAI_API_KEY;
    process.env.LOCAL_LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';

    jest.resetModules();
  const { embedWithResilience } = await import('../../src/utils/resilient-embedder');
    const res = await embedWithResilience({ text: 'hello world', model: 'text-embedding-3-small' });
    expect(Array.isArray(res.embedding)).toBe(true);
    expect(res.embedding.length).toBeGreaterThan(0);
  });

  test('Factory routes local_lmstudio to OpenAI-compatible provider when baseURL present', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.OPENAI_API_KEY;
    process.env.LOCAL_LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';

    jest.resetModules();
  const { EmbeddingProviderFactory } = await import('../../src/providers/memory-provider');
    const cfg: any = {
      provider: 'local_lmstudio',
      model: 'text-embedding-3-small',
      baseUrl: process.env.LOCAL_LMSTUDIO_BASE_URL
    };

    const provider = EmbeddingProviderFactory.createProvider(cfg);
    const vec = await provider.embedText('check route');
    expect(vec.length).toBeGreaterThan(0);
    expect(provider.getProviderName()).toContain('openai');
  });

  test('Local simple embedding is blocked in production without ALLOW_LOCAL_EMBEDDING', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.OPENAI_API_KEY;
    delete process.env.LOCAL_LMSTUDIO_BASE_URL;
    delete process.env.LLM_BACKEND_URL;
    delete process.env.ALLOW_LOCAL_EMBEDDING;

    jest.resetModules();
  const { embedWithResilience } = await import('../../src/utils/resilient-embedder');
    await expect(embedWithResilience({ text: 'prod block', model: 'local' })).rejects.toThrow(/disabled/i);
  });

  test('Local simple embedding can be enabled in production explicitly', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_LOCAL_EMBEDDING = 'true';

    jest.resetModules();
  const { embedWithResilience } = await import('../../src/utils/resilient-embedder');
    const res = await embedWithResilience({ text: 'allow prod local', model: 'local' });
    expect(res.embedding.length).toBeGreaterThan(0);
  });
});
