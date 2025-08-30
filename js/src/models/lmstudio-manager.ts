import { createLogger } from '../utils/enhanced-logger';

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes

export class LMStudioManager {
  private static logger = createLogger('system', 'LMStudioManager');
  // Locks keyed by LM Studio baseUrl to serialize model load/switch requests
  private static instanceLocks: Map<string, Promise<void>> = new Map();
  // Simple in-memory TTL cache keyed by `${baseUrl}::${modelName}` to avoid repeated polling
  private static modelLoadedCache: Map<string, { expiresAt: number }> = new Map();
  // Simple in-memory metrics
  private static metrics: {
    loadAttempts: number;
    loadSuccesses: number;
    loadFailures: number;
    unloadAttempts: number;
    unloadSuccesses: number;
    unloadFailures: number;
    switchAttempts: number;
    switchSuccesses: number;
    switchFailures: number;
    latenciesMs: { [key: string]: number[] };
  } = {
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

  /**
   * Ensure the requested model is loaded in LM Studio. This will poll the public models endpoint
   * and, if an admin endpoint is provided via env var `LM_STUDIO_ADMIN_URL`, attempt to load the model
   * by POSTing to `${adminUrl}/models/load` with payload { model }
   */
  static async ensureModelLoaded(
    modelName: string,
    baseUrl: string,
    options?: { adminUrl?: string; pollIntervalMs?: number; timeoutMs?: number }
  ): Promise<void> {
    const adminUrl = options?.adminUrl || process.env.LM_STUDIO_ADMIN_URL;
    const pollInterval = options?.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
    const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;

    this.logger.info('ensureModelLoaded', 'Ensuring LM Studio model is loaded', { modelName, baseUrl, adminUrl });

    const modelsEndpoint = `${baseUrl.replace(/\/$/, '')}/models`;

    const getFetch = async (): Promise<any> => {
      if (typeof (globalThis as any).fetch === 'function') {
        return (globalThis as any).fetch.bind(globalThis);
      }
      // Dynamically import node-fetch at runtime if needed (won't be statically bundled by Vite)
      const mod = await import('node-fetch');
      return (mod.default ?? mod) as any;
    };

    const modelExists = async (): Promise<boolean> => {
      try {
  const _fetch = await getFetch();
  const res = await _fetch(modelsEndpoint, { method: 'GET' });
        if (!res.ok) return false;
        const json = await res.json();
        // Expecting json to be an array or object containing models
        if (Array.isArray(json)) return json.some((m: any) => m.name === modelName || m.id === modelName);
        if (json?.models && Array.isArray(json.models)) return json.models.some((m: any) => m.name === modelName || m.id === modelName);
        return false;
      } catch (err) {
        this.logger.warn('ensureModelLoaded', 'Failed to query models endpoint', { err: String(err) });
        return false;
      }
    };

    const cacheKey = `${baseUrl}::${modelName}`;
    const ttlMs = Number(process.env.LM_STUDIO_MODEL_CACHE_TTL_MS || 30_000);

    // If cached and not expired, return quickly
    const cached = this.modelLoadedCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.info('ensureModelLoaded', 'Model marked as loaded in cache', { modelName, baseUrl });
      return;
    }

    // If model already present (fresh check), return and prime cache
    if (await modelExists()) {
      this.logger.info('ensureModelLoaded', 'Model already loaded (live check)', { modelName });
      this.modelLoadedCache.set(cacheKey, { expiresAt: Date.now() + ttlMs });
      return;
    }

  const lockKey = baseUrl;
    // If another load/switch is in progress for this LM Studio instance, wait for it to complete
    const existing = this.instanceLocks.get(lockKey);
      if (existing) {
      this.logger.info('ensureModelLoaded', 'Waiting for existing load operation to complete', { baseUrl, modelName });
      await existing;
      // After waiting, check again if model exists; if so, prime cache and return
      if (await modelExists()) {
        this.logger.info('ensureModelLoaded', 'Model loaded by another operation', { modelName });
        this.modelLoadedCache.set(cacheKey, { expiresAt: Date.now() + ttlMs });
        return;
      }
    }

    // Create and set a lock representing the load/poll operation for this LM Studio instance.
    // The admin POST (if available) is performed inside the promise after the lock is set
    // so concurrent callers will wait on the same operation and not issue duplicate POSTs.
    const loadPromise = (async () => {
      // If the model appeared while we were setting up, return quickly
      if (await modelExists()) {
        this.logger.info('ensureModelLoaded', 'Model became available before admin request', { modelName });
        return;
      }

      if (adminUrl) {
        try {
          const loadUrl = `${adminUrl.replace(/\/$/, '')}/models/load`;
          this.logger.info('ensureModelLoaded', 'Requesting model load via admin endpoint', { loadUrl });
          const _fetch = await getFetch();
            // metrics
            const start = Date.now();
            this.metrics.loadAttempts += 1;
            const res = await _fetch(loadUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: modelName })
            });
            const dur = Date.now() - start;
            (this.metrics.latenciesMs['load'] ??= []).push(dur);
            if (res && res.ok) {
              this.metrics.loadSuccesses += 1;
            } else {
              this.metrics.loadFailures += 1;
            }
        } catch (err) {
          this.logger.warn('ensureModelLoaded', 'Failed to request model load via admin endpoint', { err: String(err) });
        }
      } else {
        this.logger.info('ensureModelLoaded', 'No LM_STUDIO_ADMIN_URL provided; expecting manual model load', { modelName });
      }

      // Poll until model appears or timeout
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (await modelExists()) {
          this.logger.info('ensureModelLoaded', 'Model loaded successfully', { modelName });
          return;
        }
        await new Promise(r => setTimeout(r, pollInterval));
      }
      throw new Error(`Timeout waiting for LM Studio model '${modelName}' to become available at ${modelsEndpoint}`);
    })();

    this.instanceLocks.set(lockKey, loadPromise);
    try {
      await loadPromise;
      // On success, prime the cache
      this.modelLoadedCache.set(cacheKey, { expiresAt: Date.now() + ttlMs });
    } finally {
      // Ensure the lock is removed regardless of success/failure
      this.instanceLocks.delete(lockKey);
    }
  }

  /**
   * Preload a model (alias for ensureModelLoaded) but returns immediately if cached.
   */
  static async preloadModel(modelName: string, baseUrl: string, options?: { adminUrl?: string; pollIntervalMs?: number; timeoutMs?: number }): Promise<void> {
    // ensureModelLoaded already checks cache and locks, so just call it
    return this.ensureModelLoaded(modelName, baseUrl, options);
  }

  /**
   * Request model load via admin endpoint. Returns true if request was sent successfully.
   */
  static async requestModelLoad(modelName: string, adminUrlOrUndefined?: string): Promise<boolean> {
    const adminUrl = adminUrlOrUndefined || process.env.LM_STUDIO_ADMIN_URL;
    if (!adminUrl) return false;
    try {
      const loadUrl = `${adminUrl.replace(/\/$/, '')}/models/load`;
      const _fetch = typeof (globalThis as any).fetch === 'function' ? (globalThis as any).fetch : (await import('node-fetch')).default;
      const start = Date.now();
      this.metrics.loadAttempts += 1;
      const res = await _fetch(loadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });
      const dur = Date.now() - start;
      (this.metrics.latenciesMs['load'] ??= []).push(dur);
      if (res && res.ok) {
        this.metrics.loadSuccesses += 1;
        return true;
      }
      this.metrics.loadFailures += 1;
      return false;
    } catch (err) {
      this.logger.warn('requestModelLoad', 'Failed to send admin load request', { err: String(err), adminUrl, modelName });
      return false;
    }
  }

  /**
   * Request model unload via admin endpoint. Returns true if request was sent successfully.
   */
  static async requestModelUnload(modelName: string, adminUrlOrUndefined?: string): Promise<boolean> {
    const adminUrl = adminUrlOrUndefined || process.env.LM_STUDIO_ADMIN_URL;
    if (!adminUrl) return false;
    try {
      const unloadUrl = `${adminUrl.replace(/\/$/, '')}/models/unload`;
      const _fetch = typeof (globalThis as any).fetch === 'function' ? (globalThis as any).fetch : (await import('node-fetch')).default;
      const start = Date.now();
      this.metrics.unloadAttempts += 1;
      const res = await _fetch(unloadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });
      const dur = Date.now() - start;
      (this.metrics.latenciesMs['unload'] ??= []).push(dur);
      if (res && res.ok) {
        this.metrics.unloadSuccesses += 1;
        return true;
      }
      this.metrics.unloadFailures += 1;
      return false;
    } catch (err) {
      this.logger.warn('requestModelUnload', 'Failed to send admin unload request', { err: String(err), adminUrl, modelName });
      return false;
    }
  }

  /**
   * Request a model switch: attempt to load targetModel and optionally unload previous model.
   * This will call admin load for targetModel and, if unloadPrevious is true and admin/unload available, request unload for previousModel.
   */
  static async requestModelSwitch(targetModel: string, baseUrl: string, options?: { adminUrl?: string; unloadPrevious?: boolean; previousModel?: string; pollIntervalMs?: number; timeoutMs?: number }): Promise<void> {
    const adminUrl = options?.adminUrl || process.env.LM_STUDIO_ADMIN_URL;
    this.metrics.switchAttempts += 1;
    // Request load for the target model and then wait until it's available
    if (adminUrl) {
      await this.requestModelLoad(targetModel, adminUrl);
    }
    // Wait for model to become available using ensureModelLoaded which handles locks
    const ensureOpts: { adminUrl?: string; pollIntervalMs?: number; timeoutMs?: number } = {};
    if (adminUrl) ensureOpts.adminUrl = adminUrl;
    if (options?.pollIntervalMs) ensureOpts.pollIntervalMs = options.pollIntervalMs;
    if (options?.timeoutMs) ensureOpts.timeoutMs = options.timeoutMs;
    await this.ensureModelLoaded(targetModel, baseUrl, ensureOpts);

    // Optionally request unload of previous model
    if (options?.unloadPrevious && options?.previousModel && adminUrl) {
      try {
        await this.requestModelUnload(options.previousModel, adminUrl);
        this.metrics.switchSuccesses += 1;
      } catch (err) {
        this.metrics.switchFailures += 1;
        this.logger.warn('requestModelSwitch', 'Failed to request unload of previous model', { err: String(err), previousModel: options.previousModel });
      }
    }
  }

  /**
   * Return collected metrics snapshot
   */
  static getMetrics(): any {
    return JSON.parse(JSON.stringify(this.metrics));
  }
}

export default LMStudioManager;
