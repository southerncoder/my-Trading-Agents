#!/usr/bin/env node

/**
 * Post-build script to add .js extensions to compiled JavaScript imports
 * This is required for ES modules to work properly in Node.js
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function addJSExtensionsInDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await addJSExtensionsInDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      await addJSExtensionsInFile(fullPath);
    }
  }
}

async function addJSExtensionsInFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    // Add .js extensions to relative imports that don't already have them
    const fixedContent = content
      .replace(/from\s+['"`](\.\.[^'"`]*?)['"`]/g, (match, path) => {
        if (path.endsWith('.js') || path.includes('node_modules')) {
          return match;
        }
        return match.replace(path, `${path}.js`);
      })
      .replace(/from\s+['"`](\.[^'"`]*?)['"`]/g, (match, path) => {
        if (path.endsWith('.js') || path.includes('node_modules')) {
          return match;
        }
        return match.replace(path, `${path}.js`);
      })
      .replace(/import\s*\(\s*['"`](\.\.[^'"`]*?)['"`]\s*\)/g, (match, path) => {
        if (path.endsWith('.js')) {
          return match;
        }
        return match.replace(path, `${path}.js`);
      })
      .replace(/import\s*\(\s*['"`](\.[^'"`]*?)['"`]\s*\)/g, (match, path) => {
        if (path.endsWith('.js')) {
          return match;
        }
        return match.replace(path, `${path}.js`);
      });
    
    if (content !== fixedContent) {
      await writeFile(filePath, fixedContent, 'utf-8');
      console.log(`Added .js extensions in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Adding .js extensions to compiled JavaScript...');
const distDir = join(__dirname, 'dist');

addJSExtensionsInDirectory(distDir)
  .then(() => {
    console.log('✅ All JavaScript imports fixed!');
    console.log('📝 Added .js extensions to relative imports');
  })
  .catch(error => {
    console.error('❌ Error fixing JavaScript imports:', error);
    process.exit(1);
  });