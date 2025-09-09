#!/usr/bin/env node

/**
 * Fix TypeScript imports by removing .js extensions
 * This is the modern best practice for TypeScript-first apps
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixImportsInDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      await fixImportsInDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      await fixImportsInFile(fullPath);
    }
  }
}

async function fixImportsInFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    // Remove .js extensions from imports/exports
    const fixedContent = content
      .replace(/from\s+['"`]([^'"`]+)\.js['"`]/g, "from '$1'")
      .replace(/import\s*\(\s*['"`]([^'"`]+)\.js['"`]\s*\)/g, "import('$1')")
      .replace(/export\s+.*\s+from\s+['"`]([^'"`]+)\.js['"`]/g, (match) => 
        match.replace(/\.js['"`]/, "'"));
    
    if (content !== fixedContent) {
      await writeFile(filePath, fixedContent, 'utf-8');
      console.log(`Fixed imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing TypeScript imports...');
const srcDir = join(__dirname, 'src');

fixImportsInDirectory(srcDir)
  .then(() => {
    console.log('✅ All TypeScript imports fixed!');
    console.log('📝 Removed .js extensions from all import statements');
  })
  .catch(error => {
    console.error('❌ Error fixing imports:', error);
    process.exit(1);
  });