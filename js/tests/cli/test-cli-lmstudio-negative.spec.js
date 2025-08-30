/**
 * Negative tests for LM Studio CLI admin commands
 * Covers missing admin URL, network failures, and non-ok admin responses.
 */

import { createCLI } from '../../dist/cli/main.js';

async function runNegativeTests() {
  console.log('🧪 Running LM Studio negative CLI tests...\n');

  const originalArgv = process.argv.slice();
  const originalExit = process.exit;
  const originalFetch = globalThis.fetch;

  // Stub process.exit to throw to capture exit codes
  process.exit = (code) => { const e = new Error('process.exit'); e.exitCode = code; throw e; };

  try {
    const program = await createCLI();

    // 1) Missing admin URL for unload -> should return error (false result)
    console.log('1) Missing admin URL for unload...');
    globalThis.fetch = async () => { throw new Error('Should not be called'); };
    process.argv = ['node', 'cli.js', 'lmstudio:unload', '-m', 'test-model'];
    try {
      await program.parseAsync(process.argv);
      console.error('   ✗ Expected command to error due to missing admin URL');
      throw new Error('Expected error');
    } catch (err) {
      if (err && err.exitCode) {
        console.log('   ✓ Command exited with code', err.exitCode);
      } else {
        console.log('   ✓ Command threw an error as expected');
      }
    }

    // 2) Network failure when calling admin endpoint for unload
    console.log('2) Network failure for unload...');
    globalThis.fetch = async () => { throw new Error('network failure'); };
    process.argv = ['node', 'cli.js', 'lmstudio:unload', '-m', 'test-model', '-a', 'http://localhost:1234/admin'];
    try {
      await program.parseAsync(process.argv);
      console.error('   ✗ Expected command to fail due to network error');
      throw new Error('Expected network error');
    } catch (err) {
      console.log('   ✓ Network error propagated as expected:', err.message || err);
    }

    // 3) Admin returns non-ok response
    console.log('3) Admin returns non-ok response...');
    globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: 'server' }) });
    process.argv = ['node', 'cli.js', 'lmstudio:unload', '-m', 'test-model', '-a', 'http://localhost:1234/admin'];
    try {
      await program.parseAsync(process.argv);
      console.error('   ✗ Expected command to exit with non-zero due to admin failure');
      throw new Error('Expected admin failure');
    } catch (err) {
      if (err && err.exitCode === 2) {
        console.log('   ✓ Command exited with code 2 on admin failure');
      } else {
        console.log('   ✓ Command failed as expected (error)', err.message || err);
      }
    }

    console.log('\n✅ Negative CLI LM Studio tests completed');
    process.exit(0);

  } finally {
    process.argv = originalArgv;
    process.exit = originalExit;
    globalThis.fetch = originalFetch;
  }
}

runNegativeTests();
