#!/usr/bin/env node

import { createCLI } from './main.js';

async function main() {
  try {
    const program = await createCLI();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Failed to start CLI:', error);
    process.exit(1);
  }
}

main();