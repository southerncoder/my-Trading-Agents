import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function loadSecrets() {
  const secrets = {};
  const secretsPath = '/run/secrets';
  const secretMappings = {
    'yahoo_finance_api_key': 'YAHOO_FINANCE_API_KEY',
    'marketwatch_api_key': 'MARKETWATCH_API_KEY',
    'node_env': 'NODE_ENV',
    'log_level': 'LOG_LEVEL',
    'port': 'PORT'
  };

  const isDocker = existsSync('/.dockerenv') || existsSync(secretsPath);
  console.log(`[Secrets] Loading secrets (Docker: ${isDocker}, Path: ${secretsPath})`);

  for (const [secretFile, envVar] of Object.entries(secretMappings)) {
    const secretFilePath = join(secretsPath, secretFile);
    try {
      if (existsSync(secretFilePath)) {
        const val = readFileSync(secretFilePath, 'utf8').trim();
        if (val) {
          secrets[envVar] = val;
          console.log(`[Secrets] Loaded ${envVar} from Docker secret: ${secretFile}`);
          continue;
        }
      }

      if (process.env[envVar]) {
        secrets[envVar] = process.env[envVar];
        console.log(`[Secrets] Using ${envVar} from environment variable (fallback)`);
      } else {
        console.log(`[Secrets] ${envVar} not found (checked ${secretFilePath} and env)`);
      }
    } catch (error) {
      console.log(`[Secrets] Error reading ${secretFile}: ${error.message}`);
      if (process.env[envVar]) {
        secrets[envVar] = process.env[envVar];
        console.log(`[Secrets] Using ${envVar} from environment variable (after error)`);
      }
    }
  }

  Object.assign(process.env, secrets);
  console.log(`[Secrets] Loaded ${Object.keys(secrets).length} secrets total`);
  return secrets;
}

export default { loadSecrets };
