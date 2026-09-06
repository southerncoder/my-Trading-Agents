import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Load secrets from Docker secrets mount point or environment variables
 * Docker secrets are mounted at /run/secrets/ in containers
 * Falls back to environment variables for local development
 */
export function loadSecrets() {
  const secrets = {};
  const secretsPath = '/run/secrets';
  const isDocker = existsSync('/.dockerenv') || existsSync(secretsPath);
  
  console.log(`[Secrets] Loading secrets (Docker: ${isDocker}, Path: ${secretsPath})`);
  
  const secretMappings = {
    // News Provider Secrets
    'brave_news_api_key': 'BRAVE_NEWS_API_KEY',
    'news_api_key': 'NEWS_API_KEY',
    'yahoo_finance_api_key': 'YAHOO_FINANCE_API_KEY',
    'tavily_api_key': 'TAVILY_API_KEY',
    
    // Service configuration
    'node_env': 'NODE_ENV',
    'log_level': 'LOG_LEVEL',
    'port': 'PORT'
  };

  for (const [secretFile, envVar] of Object.entries(secretMappings)) {
    const secretFilePath = join(secretsPath, secretFile);
    try {
      // Prefer Docker secrets when available
      if (existsSync(secretFilePath)) {
        const secretValue = readFileSync(secretFilePath, 'utf8').trim();
        if (secretValue) {
          secrets[envVar] = secretValue;
          console.log(`[Secrets] Loaded ${envVar} from Docker secret: ${secretFile}`);
          continue;
        }
      }

      // Fallback: use environment variable when Docker secret is missing or empty
      if (process.env[envVar]) {
        secrets[envVar] = process.env[envVar];
        console.log(`[Secrets] Using ${envVar} from environment variable (fallback)`);
      } else {
        console.log(`[Secrets] ${envVar} not found (checked ${secretFilePath} and env)`);
      }
    } catch (error) {
      console.log(`[Secrets] Error reading ${secretFile}: ${error.message}`);
      // If reading the secret file failed, still allow environment variable fallback
      if (process.env[envVar]) {
        secrets[envVar] = process.env[envVar];
        console.log(`[Secrets] Using ${envVar} from environment variable (after error)`);
      }
    }
  }

  // Merge secrets into process.env
  Object.assign(process.env, secrets);
  
  console.log(`[Secrets] Loaded ${Object.keys(secrets).length} secrets total`);

  return secrets;
}

/**
 * Get a specific secret value
 * Checks Docker secrets first, then falls back to environment variables
 */
export function getSecret(secretName) {
  const secretsPath = '/run/secrets';
  const secretFilePath = join(secretsPath, secretName);
  
  try {
    if (existsSync(secretFilePath)) {
      return readFileSync(secretFilePath, 'utf8').trim();
    }
  } catch (error) {
    // Fall through to environment variable
  }
  
  return process.env[secretName] || null;
}

/**
 * Check if running in Docker container
 */
export function isDocker() {
  return existsSync('/.dockerenv') || existsSync('/run/secrets');
}

export default {
  loadSecrets,
  getSecret,
  isDocker
};
