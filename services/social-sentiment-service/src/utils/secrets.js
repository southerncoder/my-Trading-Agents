import fs from 'fs';
import path from 'path';

/**
 * Load secrets from Docker secrets files and set as environment variables
 */
export function loadSecrets() {
  const secretsPath = '/run/secrets';
  
  // Check if running in Docker with secrets
  if (!fs.existsSync(secretsPath)) {
    console.log('[Secrets] Not running in Docker with secrets, using environment variables');
    return;
  }

  console.log('[Secrets] Loading Docker secrets...');

  // Map of secret files to environment variable names
  const secretMappings = {
    'reddit_client_id': 'REDDIT_CLIENT_ID',
    'reddit_client_secret': 'REDDIT_CLIENT_SECRET',
    'reddit_username': 'REDDIT_USERNAME',
    'reddit_password': 'REDDIT_PASSWORD',
    'reddit_user_agent': 'REDDIT_USER_AGENT',
    'twitter_bearer_token': 'TWITTER_BEARER_TOKEN'
  };

  for (const [secretFile, envVar] of Object.entries(secretMappings)) {
    const secretFilePath = path.join(secretsPath, secretFile);
    
    try {
      if (fs.existsSync(secretFilePath)) {
        const secretValue = fs.readFileSync(secretFilePath, 'utf8').trim();
        if (secretValue) {
          process.env[envVar] = secretValue;
          console.log(`[Secrets] Loaded ${envVar} from ${secretFile}`);
        }
      }
    } catch (error) {
      console.warn(`[Secrets] Failed to load ${secretFile}:`, error.message);
    }
  }

  console.log('[Secrets] Docker secrets loading complete');
}