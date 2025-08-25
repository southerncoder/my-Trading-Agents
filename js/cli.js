#!/usr/bin/env node

import { createCLI } from './dist/cli/main.js';

async function main() {
  try {
    const program = await createCLI();
    await program.parseAsync();
  } catch (error) {
    console.error('CLI Error:', error);
    process.exit(1);
  }
}

main();