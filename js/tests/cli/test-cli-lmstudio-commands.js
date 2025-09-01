/**
 * Unit tests for LM Studio CLI admin commands
 */

import { createCLI } from '../../dist/cli/main.js';

async function testLmStudioCommands() {
  console.log('🧪 Testing LM Studio CLI Commands Wiring...\n');

  const originalArgv = process.argv.slice();
  const originalExit = process.exit;
  const originalFetch = globalThis.fetch;

  // Stub process.exit to throw so we can catch exit codes
  process.exit = (code) => { const e = new Error('process.exit'); e.exitCode = code; throw e; };

  // Stub global fetch to simulate LM Studio admin and models endpoints
  globalThis.fetch = async (url, _opts) => {
    // Normalize URL
    const s = String(url);
    // Return models list containing 'test-model' for GET /models
    if (s.endsWith('/models')) {
      return {
        ok: true,
        json: async () => [{ name: 'test-model' }]
      };
    }
    // For admin load/unload endpoints return ok
    if (s.includes('/models/load') || s.includes('/models/unload')) {
      return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
    }
    // Fallback
    return { ok: true, json: async () => ({}) };
  };

  try {
    // Create CLI program
    const program = await createCLI();

    // Test: preload command (should call ModelProvider.preloadModel -> LMStudioManager.ensureModelLoaded)
    console.log('1) Testing lmstudio:preload...');
    process.argv = ['node', 'cli.js', 'lmstudio:preload', '-m', 'test-model', '-h', 'http://localhost:1234/v1'];
    try {
      await program.parseAsync(process.argv);
      console.log('   ✓ lmstudio:preload executed without throwing');
    } catch (err) {
      // preload does not call process.exit on success; any thrown error is a failure
      console.error('   ✗ lmstudio:preload threw:', err.message || err);
      throw err;
    }

    // Test: unload command should call LMStudioManager.requestModelUnload and exit with code 0
    console.log('2) Testing lmstudio:unload...');
    process.argv = ['node', 'cli.js', 'lmstudio:unload', '-m', 'test-model', '-a', 'http://localhost:1234/admin'];
    try {
      await program.parseAsync(process.argv);
    } catch (err) {
      if (err && err.exitCode === 0) {
        console.log('   ✓ lmstudio:unload exited with code 0');
      } else {
        console.error('   ✗ lmstudio:unload failed:', err.message || err);
        throw err;
      }
    }

    // Test: switch command should call requestModelSwitch and exit 0
    console.log('3) Testing lmstudio:switch...');
    process.argv = ['node', 'cli.js', 'lmstudio:switch', '-t', 'test-model', '-h', 'http://localhost:1234/v1', '-a', 'http://localhost:1234/admin', '-f', 'old-model'];
    try {
      await program.parseAsync(process.argv);
    } catch (err) {
      if (err && err.exitCode === 0) {
        console.log('   ✓ lmstudio:switch exited with code 0');
      } else {
        console.error('   ✗ lmstudio:switch failed:', err.message || err);
        throw err;
      }
    }

    // Test: metrics command should print metrics and exit 0
    console.log('4) Testing lmstudio:metrics...');
    process.argv = ['node', 'cli.js', 'lmstudio:metrics'];
    try {
      await program.parseAsync(process.argv);
    } catch (err) {
      if (err && err.exitCode === 0) {
        console.log('   ✓ lmstudio:metrics exited with code 0');
      } else {
        console.error('   ✗ lmstudio:metrics failed:', err.message || err);
        throw err;
      }
    }

    console.log('\n🎉 LM Studio CLI command wiring tests passed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ LM Studio CLI tests failed:', error && error.message ? error.message : error);
    process.exit(1);
  } finally {
    // Restore originals
    process.argv = originalArgv;
    process.exit = originalExit;
    globalThis.fetch = originalFetch;
  }
}

// Run tests
testLmStudioCommands();
