import path from 'path';

// jest test to ensure embedding models are skipped for analysts when CONSIDER_MEMORY=true

describe('EnhancedConfigLoader embedding model opt-in', () => {
  const loaderPath = path.resolve(__dirname, '..', '..', 'src', 'config', 'enhanced-loader.ts');
  const mappingPath = path.resolve(__dirname, '..', '..', 'src', 'memory', 'agent-model-mapping.json');

  const clearRequireCache = (modulePath: string) => {
    try {
      const resolved = require.resolve(modulePath);
      delete require.cache[resolved];
    } catch (e) {
      // ignore if not resolvable
    }
  };

  const clearAllModuleCacheFor = (substr: string) => {
    Object.keys(require.cache).forEach(k => {
      if (k.includes(substr)) delete require.cache[k];
    });
  };

    const loadLoader = () => {
      clearRequireCache(loaderPath);
      // require the compiled JS path from dist if exists, otherwise require TS via ts-node.
      // We import the built JS in runtime tests by using the source's exported singleton name
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('../../src/config/enhanced-loader');
    };

  beforeEach(() => {
    // make sure default env var states
    delete process.env.CONSIDER_MEMORY;
  });

  let originalMappingText: string | null = null;
  beforeAll(() => {
    const fs = require('fs');
    originalMappingText = fs.readFileSync(mappingPath, 'utf8');
  });

  afterAll(() => {
    // restore original mapping file
    const fs = require('fs');
    if (originalMappingText !== null) {
      fs.writeFileSync(mappingPath, originalMappingText, 'utf8');
      // clear caches so other tests see restored mapping
      clearRequireCache(mappingPath);
      clearRequireCache(path.resolve(__dirname, '..', '..', 'src', 'config', 'enhanced-loader'));
    }
  });

  test('skips embedding model for analyst when memory considered and not opted-in', () => {
    // Prepare a mapping that recommends an embedding model
  clearAllModuleCacheFor('agent-model-mapping');
  clearRequireCache(mappingPath);
  const mapping = require(mappingPath);
    mapping['market_analyst'] = {
      provider: 'remote_lmstudio',
      model: 'text-embedding-qwen3-embedding-4b',
      allowEmbeddingModel: false
    };

    // write a temp mapping to disk so the loader will read it
    const fs = require('fs');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');
  // clear any require cache so loader picks up new mapping file
  clearAllModuleCacheFor('agent-model-mapping');
  clearAllModuleCacheFor('enhanced-loader');
  clearRequireCache(mappingPath);
  clearRequireCache(path.resolve(__dirname, '..', '..', 'src', 'config', 'enhanced-loader'));

    process.env.CONSIDER_MEMORY = 'true';

    // instantiate a fresh loader instance so it reads the mapping we just wrote
    clearAllModuleCacheFor('enhanced-loader');
    clearRequireCache(path.resolve(__dirname, '..', '..', 'src', 'config', 'enhanced-loader'));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { EnhancedConfigLoader } = require('../../src/config/enhanced-loader');
    const loaderInstance = new EnhancedConfigLoader();
    const cfg = loaderInstance.getAgentConfig('market');

    // ensure the embedding model was NOT applied as primary for marketAnalyst
    expect(cfg.model).not.toMatch(/embedding|embed/);

    // restore mapping from git by re-reading from original (no-op here since we overwrote intentionally)
  });

  test('applies embedding model when agent opts-in', () => {
  clearAllModuleCacheFor('agent-model-mapping');
  clearRequireCache(mappingPath);
  const mapping = require(mappingPath);
    mapping['market_analyst'] = {
      provider: 'remote_lmstudio',
      model: 'text-embedding-qwen3-embedding-4b',
      allowEmbeddingModel: true
    };
    const fs = require('fs');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');
  clearAllModuleCacheFor('agent-model-mapping');
  clearAllModuleCacheFor('enhanced-loader');
  clearRequireCache(mappingPath);
  clearRequireCache(path.resolve(__dirname, '..', '..', 'src', 'config', 'enhanced-loader'));

    process.env.CONSIDER_MEMORY = 'true';

    // instantiate a fresh loader instance so it reads the mapping we just wrote
    clearAllModuleCacheFor('enhanced-loader');
    clearRequireCache(path.resolve(__dirname, '..', '..', 'src', 'config', 'enhanced-loader'));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { EnhancedConfigLoader } = require('../../src/config/enhanced-loader');
    const loaderInstance = new EnhancedConfigLoader();
    const cfg = loaderInstance.getAgentConfig('market');

    // embedding model should be applied when opt-in is true
    expect(cfg.model).toMatch(/embedding|embed/);
  });
});
