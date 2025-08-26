#!/usr/bin/env node

/**
 * Post-build script to add .js extensions to compiled JavaScript imports
 * This is required for ES modules to work properly in Node.js
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname, resolve } from 'path';
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

async function resolveImportPath(importPath, currentFilePath) {
  const currentDir = dirname(currentFilePath);
  const resolvedPath = resolve(currentDir, importPath);
  
  // Check if it's a directory import (should resolve to index.js)
  try {
    const stats = await stat(resolvedPath);
    if (stats.isDirectory()) {
      const indexPath = join(resolvedPath, 'index.js');
      try {
        await stat(indexPath);
        return `${importPath}/index.js`;
      } catch {
        // No index.js found, fallback to .js extension
        return `${importPath}.js`;
      }
    }
  } catch {
    // Path doesn't exist as directory, try as file
  }
  
  // Check if the file exists with .js extension
  try {
    await stat(`${resolvedPath}.js`);
    return `${importPath}.js`;
  } catch {
    // Return original path if we can't resolve it
    return importPath;
  }
}

async function addJSExtensionsInFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    let fixedContent = content;
    let hasChanges = false;
    
    // Process relative imports starting with ../ or ./
    const importRegex = /from\s+['"`](\.\.?[^'"`]*?)['"`]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const originalPath = match[1];
      
      // Skip if already has extension or is node_modules
      if (originalPath.endsWith('.js') || originalPath.includes('node_modules')) {
        continue;
      }
      
      const resolvedPath = await resolveImportPath(originalPath, filePath);
      if (resolvedPath !== originalPath) {
        fixedContent = fixedContent.replace(match[0], match[0].replace(originalPath, resolvedPath));
        hasChanges = true;
      }
    }
    
    // Process dynamic imports
    const dynamicImportRegex = /import\s*\(\s*['"`](\.\.?[^'"`]*?)['"`]\s*\)/g;
    
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const originalPath = match[1];
      
      if (originalPath.endsWith('.js')) {
        continue;
      }
      
      const resolvedPath = await resolveImportPath(originalPath, filePath);
      if (resolvedPath !== originalPath) {
        fixedContent = fixedContent.replace(match[0], match[0].replace(originalPath, resolvedPath));
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
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