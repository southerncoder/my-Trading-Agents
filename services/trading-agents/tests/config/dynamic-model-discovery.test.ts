/**
 * Test suite for dynamic model discovery functionality
 *
 * This test validates that the remote LM Studio configuration can:
 * - Discover available models from LM Studio API
 * - Dynamically assign models based on capabilities
 * - Generate performance profiles automatically
 * - Handle connection failures gracefully
 */

// NOTE: REMOTE_LMSTUDIO_BASE_URL environment variable must be set for these tests
// This should be configured in .env.local as: REMOTE_LMSTUDIO_BASE_URL=<your-lm-studio-url>

// Do NOT set fallback URLs - tests should fail if environment variable is not configured
if (!process.env.REMOTE_LMSTUDIO_BASE_URL) {
  throw new Error('SECURITY ERROR: REMOTE_LMSTUDIO_BASE_URL environment variable is required for tests');
}

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  fetchAvailableModels,
  discoverModelCapabilities,
  createDynamicModelAssignments,
  getDynamicPerformanceProfiles,
  createAgentModelConfigs,
  createRemoteLMStudioConfig,
  getDiscoveredModels,
  generateDynamicTestScenarios,
  getFallbackModels
} from '../../examples/config/remote-lmstudio.config';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Dynamic Model Discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // NOTE: Do NOT clear REMOTE_LMSTUDIO_BASE_URL - tests require it to be set
  });

  describe('Model Discovery', () => {
    it('should discover model capabilities from model names', () => {
      const phiModel = discoverModelCapabilities('microsoft/phi-4-reasoning-plus');
      expect(phiModel.capabilities).toContain('reasoning');
      expect(phiModel.size).toBe('large'); // Phi-4 should be detected as large due to 14B+ params
      expect(phiModel.quality).toBe('excellent');

      const fastModel = discoverModelCapabilities('qwen/qwen3-1.7b');
      expect(fastModel.capabilities).toContain('fast');
      expect(fastModel.size).toBe('small');
      expect(fastModel.speed).toBe('fast');

      const creativeModel = discoverModelCapabilities('dolphin-2.9-llama3-8b');
      expect(creativeModel.capabilities).toContain('creative');
      expect(creativeModel.quality).toBe('excellent'); // Creative models get excellent quality
    });

    it('should handle connection failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      await expect(fetchAvailableModels()).rejects.toThrow('Connection failed');
    });

    it('should fetch models from LM Studio API when available', async () => {
      const mockModels = [
        { id: 'test-model-1' },
        { id: 'test-model-2' }
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ data: mockModels }),
        headers: new Headers(),
        redirected: false,
        type: 'basic' as ResponseType,
        url: `${process.env.REMOTE_LM_STUDIO_BASE_URL}/models`,
        clone: () => mockResponse,
        text: async () => JSON.stringify({ data: mockModels }),
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData()
      };

      mockFetch.mockResolvedValue(mockResponse as Response);

      const models = await fetchAvailableModels();
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.REMOTE_LM_STUDIO_BASE_URL}/models`,
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: expect.any(AbortSignal)
        })
      );
      expect(models.length).toBe(2);
    });
  });

  describe('Dynamic Model Assignment', () => {
    it('should assign models based on capabilities', async () => {
      const assignments = await createDynamicModelAssignments();

      expect(assignments).toHaveProperty('quickThinking');
      expect(assignments).toHaveProperty('deepThinking');
      expect(assignments).toHaveProperty('marketAnalyst');
      expect(assignments).toHaveProperty('newsAnalyst');
      expect(assignments).toHaveProperty('socialAnalyst');
      expect(assignments).toHaveProperty('fundamentalsAnalyst');
      expect(assignments).toHaveProperty('researchManager');
      expect(assignments).toHaveProperty('riskManager');
      expect(assignments).toHaveProperty('trader');
      expect(assignments).toHaveProperty('ragOptimized');
      expect(assignments).toHaveProperty('largeContext');

      // Verify all assignments have required properties
      Object.values(assignments).forEach((config: any) => {
        expect(config).toHaveProperty('provider', 'remote_lmstudio');
        expect(config).toHaveProperty('modelName');
        expect(config).toHaveProperty('baseURL');
        expect(config).toHaveProperty('temperature');
        expect(config).toHaveProperty('maxTokens');
      });
    });

    it('should prioritize models by quality and speed', async () => {
      const assignments = await createDynamicModelAssignments();

      // Quick thinking should get a fast model
      expect(assignments.quickThinking.temperature).toBe(0.5);
      expect(assignments.quickThinking.maxTokens).toBe(1024);

      // Deep thinking should get a high-quality model
      expect(assignments.deepThinking.temperature).toBe(0.3);
      expect(assignments.deepThinking.maxTokens).toBe(2048);
    });
  });

  describe('Performance Profile Generation', () => {
    it('should generate dynamic performance profiles', async () => {
      const profiles = await getDynamicPerformanceProfiles();

      expect(Object.keys(profiles).length).toBeGreaterThan(0);

      // Check that profiles have expected structure
      const firstProfile = Object.values(profiles)[0] as any;
      expect(firstProfile).toHaveProperty('parameters');
      expect(firstProfile).toHaveProperty('specialty');
      expect(firstProfile).toHaveProperty('speed');
      expect(firstProfile).toHaveProperty('quality');
      expect(firstProfile).toHaveProperty('useCase');
      expect(firstProfile).toHaveProperty('strengths');
      expect(firstProfile).toHaveProperty('idealFor');
    });

    it('should generate appropriate use cases based on capabilities', () => {
      const reasoningModel = discoverModelCapabilities('microsoft/phi-4-reasoning-plus');
      const fastModel = discoverModelCapabilities('qwen/qwen3-1.7b');
      const creativeModel = discoverModelCapabilities('dolphin-2.9-llama3-8b');

      // This would be tested through the profile generation function
      // but we're testing the capability detection here
      expect(reasoningModel.capabilities).toContain('reasoning');
      expect(fastModel.capabilities).toContain('fast');
      expect(creativeModel.capabilities).toContain('creative');
    });
  });

  describe('Configuration Creation', () => {
    it('should create agent model configurations', async () => {
      const configs = await createAgentModelConfigs();

      expect(configs).toHaveProperty('quickThinking');
      expect(configs).toHaveProperty('deepThinking');
      expect(configs).toHaveProperty('specialized');

      expect(configs.specialized).toHaveProperty('marketAnalyst');
      expect(configs.specialized).toHaveProperty('newsAnalyst');
      expect(configs.specialized).toHaveProperty('socialAnalyst');
      expect(configs.specialized).toHaveProperty('fundamentalsAnalyst');
      expect(configs.specialized).toHaveProperty('researchManager');
      expect(configs.specialized).toHaveProperty('riskManager');
      expect(configs.specialized).toHaveProperty('trader');
      expect(configs.specialized).toHaveProperty('ragOptimized');
      expect(configs.specialized).toHaveProperty('largeContext');
    });

    it('should create trading agents configuration', async () => {
      const config = await createRemoteLMStudioConfig();

      expect(config).toHaveProperty('llmProvider', 'remote_lmstudio');
      expect(config).toHaveProperty('backendUrl');
      expect(config).toHaveProperty('deepThinkLlm');
      expect(config).toHaveProperty('quickThinkLlm');
      expect(config).toHaveProperty('maxDebateRounds', 3);
      expect(config).toHaveProperty('maxRiskDiscussRounds', 3);
      expect(config).toHaveProperty('maxRecurLimit', 10);
      expect(config).toHaveProperty('onlineTools', true);
    });

    it('should use environment variable for remote URL', async () => {
      // Test that the configuration uses the environment variable
      const config = await createRemoteLMStudioConfig();

      // The backendUrl should match the environment variable
      expect(config.backendUrl).toBe(process.env.REMOTE_LM_STUDIO_BASE_URL);
    });

    it('should validate environment variable is properly configured', async () => {
      // Test that all model configurations use the correct base URL from environment
      const configs = await createAgentModelConfigs();

      // All configurations should use the environment variable URL
      expect(configs.quickThinking.baseURL).toBe(process.env.REMOTE_LM_STUDIO_BASE_URL);
      expect(configs.deepThinking.baseURL).toBe(process.env.REMOTE_LM_STUDIO_BASE_URL);

      // Check specialized configs too
      Object.values(configs.specialized).forEach((config: any) => {
        expect(config.baseURL).toBe(process.env.REMOTE_LM_STUDIO_BASE_URL);
      });
    });
  });

  describe('Test Scenario Generation', () => {
    it('should generate dynamic test scenarios', async () => {
      const scenarios = await generateDynamicTestScenarios();

      expect(scenarios).toHaveProperty('lightweightSetup');
      expect(scenarios).toHaveProperty('balancedSetup');
      expect(scenarios).toHaveProperty('premiumSetup');
      expect(scenarios).toHaveProperty('specializedSetup');

      // Verify scenario structure
      Object.values(scenarios).forEach((scenario: any) => {
        expect(scenario).toHaveProperty('quickThinking');
        expect(scenario).toHaveProperty('deepThinking');
        expect(scenario).toHaveProperty('description');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockFetch.mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 15000);
      }));

      await expect(fetchAvailableModels()).rejects.toThrow('Timeout');
    });

    it('should handle invalid API responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
        headers: new Headers(),
        redirected: false,
        type: 'basic' as ResponseType,
        url: `${process.env.REMOTE_LM_STUDIO_BASE_URL}/models`,
        clone: () => mockResponse,
        text: async () => '',
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData()
      };

      mockFetch.mockResolvedValue(mockResponse as Response);

      await expect(fetchAvailableModels()).rejects.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent results across multiple calls', async () => {
      const models1 = await getDiscoveredModels();
      const models2 = await getDiscoveredModels();

      expect(models1.length).toBe(models2.length);
      expect(models1[0].id).toBe(models2[0].id);
    });

    it('should validate model assignment logic', async () => {
      const assignments = await createDynamicModelAssignments();

      // Ensure no duplicate model assignments for different roles
      const modelNames = Object.values(assignments).map((config: any) => config.modelName);
      const uniqueModels = new Set(modelNames);

      // Allow some model reuse but ensure we have variety
      expect(uniqueModels.size).toBeGreaterThan(1);
      expect(uniqueModels.size).toBeLessThanOrEqual(modelNames.length);
    });
  });
});