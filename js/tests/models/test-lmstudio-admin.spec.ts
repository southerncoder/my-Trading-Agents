/// <reference types="jest" />
import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import LMStudioManager from '../../src/models/lmstudio-manager';

describe('LMStudioManager admin API helpers', () => {
  const adminUrl = 'http://localhost:1234/admin';
  const baseUrl = 'http://localhost:1234/v1';

  beforeEach(() => {
    // reset metrics and mocks
    (LMStudioManager as any).metrics = {
      loadAttempts: 0,
      loadSuccesses: 0,
      loadFailures: 0,
      unloadAttempts: 0,
      unloadSuccesses: 0,
      unloadFailures: 0,
      switchAttempts: 0,
      switchSuccesses: 0,
      switchFailures: 0,
      latenciesMs: {}
    };
    (global as any).fetch = undefined;
    jest.resetAllMocks();
  });

  test('requestModelLoad returns true on ok response', async () => {
    (global as any).fetch = jest.fn(async (url: string, opts?: any) => ({ ok: true }));
    const res = await LMStudioManager.requestModelLoad('model-a', adminUrl);
    expect(res).toBe(true);
    const metrics = LMStudioManager.getMetrics();
    expect(metrics.loadAttempts).toBe(1);
    expect(metrics.loadSuccesses).toBe(1);
  });

  test('requestModelLoad returns false on non-ok response', async () => {
    (global as any).fetch = jest.fn(async (url: string, opts?: any) => ({ ok: false }));
    const res = await LMStudioManager.requestModelLoad('model-b', adminUrl);
    expect(res).toBe(false);
    const metrics = LMStudioManager.getMetrics();
    expect(metrics.loadAttempts).toBe(1);
    expect(metrics.loadFailures).toBe(1);
  });

  test('requestModelUnload returns true on ok response', async () => {
    (global as any).fetch = jest.fn(async (url: string, opts?: any) => ({ ok: true }));
    const res = await LMStudioManager.requestModelUnload('model-a', adminUrl);
    expect(res).toBe(true);
    const metrics = LMStudioManager.getMetrics();
    expect(metrics.unloadAttempts).toBe(1);
    expect(metrics.unloadSuccesses).toBe(1);
  });

  test('requestModelSwitch loads and waits for target then unloads previous', async () => {
    // Setup fetch behavior: GET /models returns empty until after load POST, POST /models/load returns ok
    const state: any = { loaded: false };
    (global as any).fetch = jest.fn(async (url: string, opts?: any) => {
      const method = opts?.method || 'GET';
      if (method === 'GET') {
        return { ok: true, json: async () => (state.loaded ? [{ name: 'target-model' }] : []) };
      }
      if (method === 'POST') {
        // Simulate load call causing model to become available
        if (url.endsWith('/models/load')) {
          state.loaded = true;
          return { ok: true, json: async () => ({ status: 'ok' }) };
        }
        if (url.endsWith('/models/unload')) {
          return { ok: true, json: async () => ({ status: 'unloaded' }) };
        }
      }
      return { ok: false };
    });

    await LMStudioManager.requestModelSwitch('target-model', baseUrl, { adminUrl, unloadPrevious: true, previousModel: 'old-model', pollIntervalMs: 5, timeoutMs: 2000 });

    const metrics = LMStudioManager.getMetrics();
    expect(metrics.switchAttempts).toBe(1);
    // loadAttempt and unloadAttempt should have been recorded
    expect(metrics.loadAttempts).toBeGreaterThanOrEqual(1);
    expect(metrics.unloadAttempts).toBeGreaterThanOrEqual(1);
  });
});
