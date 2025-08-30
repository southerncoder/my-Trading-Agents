import LMStudioManager from '../../src/models/lmstudio-manager';

describe('LMStudioManager ensureModelLoaded + preloadModel', () => {
  const baseUrl = 'http://localhost:1234/v1';
  const adminUrl = 'http://localhost:1234/admin';

  beforeEach(() => {
    // Reset internal caches/locks
    (LMStudioManager as any).modelLoadedCache?.clear?.();
    (LMStudioManager as any).instanceLocks?.clear?.();
    // Reset global.fetch mock
    (global as any).fetch = undefined;
    jest.resetAllMocks();
  });

  test('primes cache when model already present', async () => {
    // Mock fetch to return model present on GET
    (global as any).fetch = jest.fn(async (url: string, opts?: any) => {
      if (opts && opts.method === 'POST') {
        return { ok: true, json: async () => ({}) };
      }
      // GET /models -> return model list
      return { ok: true, json: async () => [{ name: 'test-model' }] };
    });

    // First call should query and prime the cache
    await LMStudioManager.ensureModelLoaded('test-model', baseUrl, { pollIntervalMs: 10, timeoutMs: 2000 });

    const cacheKey = `${baseUrl}::test-model`;
    const cached = (LMStudioManager as any).modelLoadedCache.get(cacheKey);
    expect(cached).toBeDefined();

    // Clear fetch mock call history and call again - should return from cache and not call fetch
    (global as any).fetch = jest.fn();
    await LMStudioManager.ensureModelLoaded('test-model', baseUrl, { pollIntervalMs: 10, timeoutMs: 2000 });
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  test('concurrent preload triggers single admin POST and resolves both', async () => {
    const state = { loaded: false };

    (global as any).fetch = jest.fn(async (url: string, opts?: any) => {
      const method = opts?.method || 'GET';
      if (method === 'GET') {
        if (state.loaded) {
          return { ok: true, json: async () => [{ name: 'concurrent-model' }] };
        }
        return { ok: true, json: async () => [] };
      }
      if (method === 'POST') {
        // Admin load request - mark loaded
        state.loaded = true;
        return { ok: true, json: async () => ({ status: 'ok' }) };
      }
      return { ok: false };
    });

    const p1 = LMStudioManager.ensureModelLoaded('concurrent-model', baseUrl, { adminUrl, pollIntervalMs: 5, timeoutMs: 2000 });
    const p2 = LMStudioManager.ensureModelLoaded('concurrent-model', baseUrl, { adminUrl, pollIntervalMs: 5, timeoutMs: 2000 });

    await Promise.all([p1, p2]);

    // Verify POST called exactly once
    const calls: any[] = (global as any).fetch.mock.calls;
    const postCalls = calls.filter(c => (c[1] && c[1].method === 'POST') || (c[1] && c[1].method === 'post'));
    expect(postCalls.length).toBe(1);

    // Cache should be primed
    const cacheKey = `${baseUrl}::concurrent-model`;
    const cached = (LMStudioManager as any).modelLoadedCache.get(cacheKey);
    expect(cached).toBeDefined();
  });
});
