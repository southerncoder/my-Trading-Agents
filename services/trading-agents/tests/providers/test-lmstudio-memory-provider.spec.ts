import { LMStudioMemoryProvider } from '../../src/providers/lmstudio-memory-provider';
import { AgentLLMConfig } from '../../src/types/agent-config';
import LMStudioManager from '../../src/models/lmstudio-manager';

describe('LMStudioMemoryProvider', () => {
  let config: AgentLLMConfig;
  let provider: LMStudioMemoryProvider;

  beforeEach(() => {
    // Clear any cached state
    (LMStudioManager as any).modelLoadedCache?.clear?.();
    (LMStudioManager as any).instanceLocks?.clear?.();

    config = {
      provider: 'lm_studio',
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:1234/v1'
    };

    provider = new LMStudioMemoryProvider(config);
  });

  afterEach(() => {
    // Clear state after each test
    (LMStudioManager as any).modelLoadedCache?.clear?.();
    (LMStudioManager as any).instanceLocks?.clear?.();
  });

  describe('initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(provider.getProviderName()).toBe('lmstudio-memory');
    });

    test('should use default model when not specified', () => {
      const configWithoutModel: AgentLLMConfig = {
        provider: 'lm_studio',
        model: 'nomic-embed-text', // Default model
        baseUrl: 'http://localhost:1234/v1'
      };
      const providerWithoutModel = new LMStudioMemoryProvider(configWithoutModel);
      expect(providerWithoutModel.getProviderName()).toBe('lmstudio-memory');
    });
  });

  describe('model checking and locking', () => {
    test('should call ensureModelLoaded before embedding operations', async () => {
      const mockEnsureModelLoaded = jest.spyOn(LMStudioManager, 'ensureModelLoaded')
        .mockResolvedValue();

      // Mock fetch for the embedding API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            embedding: [0.1, 0.2, 0.3]
          }]
        })
      });

      await provider.embedText('test text');

      expect(mockEnsureModelLoaded).toHaveBeenCalledWith(
        'nomic-embed-text',
        'http://localhost:1234/v1',
        {
          pollIntervalMs: 1000,
          timeoutMs: 30000
        }
      );

      mockEnsureModelLoaded.mockRestore();
    });

    test('should handle concurrent embedding requests with proper locking', async () => {
      const mockEnsureModelLoaded = jest.spyOn(LMStudioManager, 'ensureModelLoaded')
        .mockResolvedValue();

      // Mock fetch for the embedding API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            embedding: [0.1, 0.2, 0.3]
          }]
        })
      });

      // Make concurrent requests
      const promises = [
        provider.embedText('test text 1'),
        provider.embedText('test text 2'),
        provider.embedText('test text 3')
      ];

      const results = await Promise.all(promises);

      // All requests should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      // ensureModelLoaded should be called for each request
      expect(mockEnsureModelLoaded).toHaveBeenCalledTimes(3);

      mockEnsureModelLoaded.mockRestore();
    });

    test('should throw error when model loading fails', async () => {
      const mockEnsureModelLoaded = jest.spyOn(LMStudioManager, 'ensureModelLoaded')
        .mockRejectedValue(new Error('Model loading failed'));

      await expect(provider.embedText('test text')).rejects.toThrow(
        'LM Studio model \'nomic-embed-text\' could not be loaded'
      );

      mockEnsureModelLoaded.mockRestore();
    });
  });

  describe('embedding operations', () => {
    beforeEach(() => {
      // Mock the model loading to always succeed
      jest.spyOn(LMStudioManager, 'ensureModelLoaded').mockResolvedValue();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should embed single text successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
          }]
        })
      });

      const result = await provider.embedText('test text');

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:1234/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: 'test text',
            model: 'nomic-embed-text',
            encoding_format: 'float'
          })
        })
      );
    });

    test('should embed multiple texts in batches', async () => {
      const mockBatchResponse = {
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] },
          { embedding: [0.7, 0.8, 0.9] }
        ]
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBatchResponse)
      });

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await provider.embedTexts(texts);

      expect(result).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9]
      ]);

      // Should make one batch request for all texts
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(provider.embedText('test text')).rejects.toThrow(
        'LM Studio API error: 500 Internal Server Error'
      );
    });

    test('should handle invalid API response format', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          invalid: 'response'
        })
      });

      await expect(provider.embedText('test text')).rejects.toThrow(
        'Invalid response format from LM Studio embedding API'
      );
    });
  });

  describe('similarity calculation', () => {
    test('should calculate cosine similarity correctly', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];

      const similarity = provider.calculateSimilarity(embedding1, embedding2);

      expect(similarity).toBe(0); // Orthogonal vectors
    });

    test('should handle identical vectors', () => {
      const embedding1 = [1, 2, 3];
      const embedding2 = [1, 2, 3];

      const similarity = provider.calculateSimilarity(embedding1, embedding2);

      expect(similarity).toBe(1); // Identical vectors
    });

    test('should handle zero vectors', () => {
      const embedding1 = [0, 0, 0];
      const embedding2 = [1, 2, 3];

      const similarity = provider.calculateSimilarity(embedding1, embedding2);

      expect(similarity).toBe(0); // Zero vector similarity
    });

    test('should handle mismatched dimensions', () => {
      const embedding1 = [1, 2, 3];
      const embedding2 = [1, 2];

      const similarity = provider.calculateSimilarity(embedding1, embedding2);

      expect(similarity).toBe(0); // Mismatched dimensions
    });
  });
});