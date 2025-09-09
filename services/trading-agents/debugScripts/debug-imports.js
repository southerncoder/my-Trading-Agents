import 'dotenv/config';
import { config } from 'dotenv';

console.log('🔍 DEBUG: Testing CLI imports...');

// Load local environment configuration
config({ path: '.env.local' });

try {
  console.log('🔍 DEBUG: Importing CLI utils...');
  const cliUtils = await import('./src/cli/utils.js');
  console.log('✅ CLI utils imported');

  console.log('🔍 DEBUG: Importing CLI types...');
  const cliTypes = await import('./src/cli/types.js');
  console.log('✅ CLI types imported');

  console.log('🔍 DEBUG: Importing MessageBuffer...');
  const { MessageBuffer } = await import('./src/cli/message-buffer.js');
  console.log('✅ MessageBuffer imported');

  console.log('🔍 DEBUG: Importing DisplaySystem...');
  const { DisplaySystem } = await import('./src/cli/display.js');
  console.log('✅ DisplaySystem imported');

  console.log('🔍 DEBUG: Importing DEFAULT_CONFIG...');
  const { DEFAULT_CONFIG } = await import('./src/config/default.js');
  console.log('✅ DEFAULT_CONFIG imported');

  console.log('🔍 DEBUG: All basic CLI imports successful');

} catch (error) {
  console.error('❌ Import failed:', error);
}