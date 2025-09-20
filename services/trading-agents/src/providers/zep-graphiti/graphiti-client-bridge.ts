import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from '../../utils/enhanced-logger';

/**
 * TypeScript interface to Python Graphiti client via bridge
 * Replaces HTTP-based calls with proper Graphiti client usage
 */

export interface GraphitiBridgeConfig {
  pythonPath?: string;
  bridgeScriptPath?: string;
}

export interface HealthResponse {
  status: string;
  graphiti_initialized: boolean;
  neo4j_connected: boolean;
  message?: string;
}

export interface BridgeResponse {
  success?: boolean;
  error?: string;
  message?: string;
  uuid?: string;
  facts?: Array<{
    fact: string;
    confidence: number;
    timestamp: string;
    source_entity?: string;
    metadata?: Record<string, any>;
  }>;
  total_results?: number;
  query?: string;
}

export class GraphitiClientBridge {
  private logger = createLogger('agent', 'GraphitiClientBridge');
  private config: GraphitiBridgeConfig;
  private bridgeScriptPath: string;

  constructor(config: GraphitiBridgeConfig = {}) {
    this.config = {
      pythonPath: config.pythonPath || 'python',
      bridgeScriptPath: config.bridgeScriptPath || this.getDefaultBridgePath(),
      ...config
    };
    this.bridgeScriptPath = this.config.bridgeScriptPath!;
    
    this.logger.info('initialize', 'Initializing Graphiti client bridge', {
      pythonPath: this.config.pythonPath,
      bridgeScriptPath: this.bridgeScriptPath
    });
  }

  private getDefaultBridgePath(): string {
    // Bridge script lives in services/zep_graphiti/tests relative to current file (services/trading-agents/src/providers/zep-graphiti)
    const currentDir = path.dirname(__filename);
    const candidate = path.resolve(currentDir, '..', '..', '..', '..', 'zep_graphiti', 'tests', 'graphiti_ts_bridge.py');
    if (!fs.existsSync(candidate)) {
      this.logger.warn('initialize', 'Graphiti bridge script not found at expected path', { candidate });
    }
    return candidate;
  }

  private async executeBridgeCommand(operation: string, params?: Record<string, any>): Promise<BridgeResponse> {
    return new Promise((resolve, reject) => {
      const args = [this.bridgeScriptPath, operation];
      if (params) {
        args.push(JSON.stringify(params));
      }

      const process = spawn(this.config.pythonPath!, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          this.logger.error('executeBridgeCommand', 'Bridge command failed', {
            operation,
            exitCode: code,
            stderr: stderr.trim()
          });
          reject(new Error(`Bridge command failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim()) as BridgeResponse;
          if (result.error) {
            this.logger.error('executeBridgeCommand', 'Bridge returned error', {
              operation,
              error: result.error
            });
            reject(new Error(result.error));
          } else {
            this.logger.debug('executeBridgeCommand', 'Bridge command successful', {
              operation,
              hasResults: !!result.facts || !!result.uuid || !!result.success
            });
            resolve(result);
          }
        } catch (parseError) {
          this.logger.error('executeBridgeCommand', 'Failed to parse bridge response', {
            operation,
            stdout: stdout.trim(),
            parseError: String(parseError)
          });
          reject(new Error(`Failed to parse bridge response: ${parseError}`));
        }
      });

      process.on('error', (error) => {
        this.logger.error('executeBridgeCommand', 'Bridge process error', {
          operation,
          error: String(error)
        });
        reject(error);
      });
    });
  }

  /**
   * Test connection to Graphiti service
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.executeBridgeCommand('healthcheck') as HealthResponse;
      return response.status === 'healthy';
    } catch (error) {
      this.logger.error('testConnection', 'Health check failed', { error: String(error) });
      return false;
    }
  }

  /**
   * Add episode/messages to the knowledge graph
   */
  async addEpisode(
    groupId: string,
    messages: Array<{
      content: string;
      name?: string;
      role?: string;
      role_type?: string;
      timestamp?: string;
      source_description?: string;
    }>
  ): Promise<void> {
    const timer = this.logger.startTimer('addEpisode');
    
    try {
      const response = await this.executeBridgeCommand('messages', {
        group_id: groupId,
        messages
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to add episode');
      }

      timer();
      this.logger.info('addEpisode', 'Episode added successfully', { 
        groupId, 
        messageCount: messages.length 
      });
    } catch (error) {
      this.logger.error('addEpisode', 'Failed to add episode', { 
        groupId, 
        error: String(error) 
      });
      throw error;
    }
  }

  /**
   * Create entity node
   */
  async createEntityNode(
    uuid: string,
    groupId: string,
    name: string,
    summary: string
  ): Promise<string> {
    const timer = this.logger.startTimer('createEntityNode');
    
    try {
      const response = await this.executeBridgeCommand('entity-node', {
        uuid,
        group_id: groupId,
        name,
        summary
      });

      if (!response.success || !response.uuid) {
        throw new Error(response.error || 'Failed to create entity node');
      }

      timer();
      this.logger.info('createEntityNode', 'Entity node created successfully', { 
        name, 
        groupId,
        entityUuid: response.uuid
      });

      return response.uuid;
    } catch (error) {
      this.logger.error('createEntityNode', 'Failed to create entity node', { 
        name, 
        groupId, 
        error: String(error) 
      });
      throw error;
    }
  }

  /**
   * Search memories using semantic search
   */
  async searchMemories(
    query: string,
    maxResults: number = 10,
    centerNodeUuid?: string
  ): Promise<{
    facts: Array<{
      fact: string;
      confidence: number;
      timestamp: string;
      source_entity?: string;
      metadata?: Record<string, any>;
    }>;
    total_results: number;
    query: string;
  }> {
    const timer = this.logger.startTimer('searchMemories');
    
    try {
      const response = await this.executeBridgeCommand('search', {
        query,
        max_results: maxResults,
        ...(centerNodeUuid && { center_node_uuid: centerNodeUuid })
      });

      timer();
      this.logger.info('searchMemories', 'Memory search completed', {
        query,
        factsFound: response.facts?.length || 0,
        totalResults: response.total_results || 0
      });

      return {
        facts: response.facts || [],
        total_results: response.total_results || 0,
        query: response.query || query
      };
    } catch (error) {
      this.logger.error('searchMemories', 'Memory search failed', { 
        query, 
        error: String(error) 
      });
      
      // Return empty result on error
      return {
        facts: [],
        total_results: 0,
        query
      };
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<HealthResponse> {
    try {
      return await this.executeBridgeCommand('healthcheck') as HealthResponse;
    } catch (error) {
      this.logger.error('getHealthStatus', 'Failed to get health status', { error: String(error) });
      return {
        status: 'error',
        graphiti_initialized: false,
        neo4j_connected: false,
        message: String(error)
      };
    }
  }
}

/**
 * Factory function to create and test a GraphitiClientBridge
 */
export async function createGraphitiClientBridge(
  config: GraphitiBridgeConfig = {}
): Promise<GraphitiClientBridge> {
  const bridge = new GraphitiClientBridge(config);
  
  // Test connection
  const connected = await bridge.testConnection();
  if (!connected) {
    throw new Error('Failed to connect to Graphiti service via bridge. Make sure the Python environment and Zep services are running.');
  }
  
  return bridge;
}