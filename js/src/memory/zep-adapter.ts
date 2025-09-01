import axios, { AxiosInstance } from 'axios';

export type ZepAdapterConfig = {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
};

export class ZepAdapter {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(cfg: ZepAdapterConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: cfg.timeoutMs ?? 15000,
      headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}
    });
  }

  // Temporal search - best-effort path; many Zep deployments expose a temporal search endpoint
  async temporalSearch(params: any): Promise<any> {
    const tryPaths = ['/temporal/search', '/search/temporal', '/graph/temporal/search'];
    for (const p of tryPaths) {
      try {
        const res = await this.client.post(p, params);
        return res.data;
      } catch (_err) {
        // attempt next endpoint
      }
    }
    throw new Error('temporalSearch failed for all known endpoints');
  }

  // Vector similarity search
  async vectorSearch(params: any): Promise<any> {
    const tryPaths = ['/vectors/search', '/search/vectors', '/vector/search'];
    for (const p of tryPaths) {
      try {
        const res = await this.client.post(p, params);
        return res.data;
      } catch (_err) {
        // attempt next endpoint
      }
    }
    throw new Error('vectorSearch failed for all known endpoints');
  }

  // Store an entity (create or update)
  async storeEntity(entityType: string, payload: any): Promise<any> {
    const path = `/entities/${encodeURIComponent(entityType)}`;
    try {
      const res = await this.client.post(path, payload);
      return res.data;
    } catch (_err) {
      // fallback to generic entities endpoint
      // fallback to generic entities endpoint
      const res = await this.client.post('/entities', { type: entityType, payload });
      return res.data;
    }
  }

  // Store a relationship
  async storeRelationship(payload: any): Promise<any> {
    try {
      const res = await this.client.post('/relationships', payload);
      return res.data;
    } catch (_err) {
      // fallback
      // fallback
      const res = await this.client.post('/links', payload);
      return res.data;
    }
  }

  // Retrieve entities by query
  async retrieveEntities(query: any): Promise<any> {
    try {
      const res = await this.client.post('/entities/query', query);
      return res.data;
    } catch (_err) {
      // fallback to list
      const res = await this.client.get('/entities');
      return res.data;
    }
  }
}

export function createZepAdapter(cfg: ZepAdapterConfig) {
  return new ZepAdapter(cfg);
}
