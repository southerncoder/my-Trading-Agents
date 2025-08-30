// Fix compiled TypeScript imports for ESM compatibility#!/usr/bin/env node#!/usr/bin/env node#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';

import { join, dirname } from 'path';

import { fileURLToPath } from 'url';

// Fix compiled TypeScript imports for ESM compatibility

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);// This script ensures that all .js imports in the compiled output are correct

const distDir = join(__dirname, 'dist');

/**/**

async function fixImports(dir) {

  try {import { readdir, readFile, writeFile } from 'fs/promises';

    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {import { join, dirname } from 'path'; * Fix compiled TypeScript imports for ESM compatibility * Post-build script to add .js extensions to compiled JavaScript imports

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {import { fileURLToPath } from 'url';

        await fixImports(fullPath);

      } else if (entry.isFile() && entry.name.endsWith('.js')) { * This script ensures that all .js imports in the compiled output are correct * This is required for ES modules to work properly in Node.js

        await fixJSFile(fullPath);

      }const __filename = fileURLToPath(import.meta.url);

    }

  } catch (error) {const __dirname = dirname(__filename); */ */

    console.log(`Skipping directory ${dir}: ${error.message}`);

  }

}

const distDir = join(__dirname, 'dist');

async function fixJSFile(filePath) {

  try {

    const content = await readFile(filePath, 'utf-8');

    const fixedContent = contentasync function fixImports(dir) {import { readdir, readFile, writeFile } from 'fs/promises';import { readdir, readFile, writeFile, stat } from 'fs/promises';

      .replace(/from\s+['"](\.[^'"]*?)['"];/g, (match, importPath) => {

        if (!importPath.endsWith('.js') && !importPath.includes('?')) {  try {

          return match.replace(importPath, importPath + '.js');

        }    const entries = await readdir(dir, { withFileTypes: true });import { join, dirname } from 'path';import { join, dirname, resolve } from 'path';

        return match;

      });    

    

    if (fixedContent !== content) {    for (const entry of entries) {import { fileURLToPath } from 'url';import { fileURLToPath } from 'url';

      await writeFile(filePath, fixedContent);

      console.log(`Fixed imports in: ${filePath}`);      const fullPath = join(dir, entry.name);

    }

  } catch (error) {      

    console.log(`Error processing ${filePath}: ${error.message}`);

  }      if (entry.isDirectory()) {

}

        await fixImports(fullPath);const __filename = fileURLToPath(import.meta.url);const __filename = fileURLToPath(import.meta.url);

fixImports(distDir)

  .then(() => console.log('Import fixing completed'))      } else if (entry.isFile() && entry.name.endsWith('.js')) {

  .catch(error => {

    console.log(`Import fixing failed: ${error.message}`);        await fixJSFile(fullPath);const __dirname = dirname(__filename);const __dirname = dirname(__filename);

    process.exit(0);

  });      }

    }

  } catch (error) {

    console.log(`Skipping directory ${dir}: ${error.message}`);const distDir = join(__dirname, 'dist');async function addJSExtensionsInDirectory(dir) {

  }

}  const entries = await readdir(dir, { withFileTypes: true });



async function fixJSFile(filePath) {async function fixImports(dir) {  

  try {

    const content = await readFile(filePath, 'utf-8');  try {  for (const entry of entries) {

    

    // Fix relative imports to include .js extension    const entries = await readdir(dir, { withFileTypes: true });    const fullPath = join(dir, entry.name);

    const fixedContent = content

      .replace(/from\s+['"](\.[^'"]*?)['"];/g, (match, importPath) => {        

        if (!importPath.endsWith('.js') && !importPath.includes('?')) {

          return match.replace(importPath, importPath + '.js');    for (const entry of entries) {    if (entry.isDirectory()) {

        }

        return match;      const fullPath = join(dir, entry.name);      await addJSExtensionsInDirectory(fullPath);

      })

      .replace(/import\s*\(\s*['"](\.[^'"]*?)['"]\s*\)/g, (match, importPath) => {          } else if (entry.isFile() && entry.name.endsWith('.js')) {

        if (!importPath.endsWith('.js') && !importPath.includes('?')) {

          return match.replace(importPath, importPath + '.js');      if (entry.isDirectory()) {      await addJSExtensionsInFile(fullPath);

        }

        return match;        await fixImports(fullPath);    }

      });

          } else if (entry.isFile() && entry.name.endsWith('.js')) {  }

    if (fixedContent !== content) {

      await writeFile(filePath, fixedContent);        await fixJSFile(fullPath);}

      console.log(`Fixed imports in: ${filePath}`);

    }      }

  } catch (error) {

    console.log(`Error processing ${filePath}: ${error.message}`);    }async function resolveImportPath(importPath, currentFilePath) {

  }

}  } catch (error) {  const currentDir = dirname(currentFilePath);



// Run the fix    console.log(`Skipping directory ${dir}: ${error.message}`);  const resolvedPath = resolve(currentDir, importPath);

fixImports(distDir)

  .then(() => console.log('Import fixing completed'))  }  

  .catch(error => {

    console.log(`Import fixing failed: ${error.message}`);}  // Check if it's a directory import (should resolve to index.js)

    process.exit(0); // Don't fail the build for this

  });  try {

async function fixJSFile(filePath) {    const stats = await stat(resolvedPath);

  try {    if (stats.isDirectory()) {

    const content = await readFile(filePath, 'utf-8');      const indexPath = join(resolvedPath, 'index.js');

          try {

    // Fix relative imports to include .js extension        await stat(indexPath);

    const fixedContent = content        return `${importPath}/index.js`;

      .replace(/from\s+['"](\.[^'"]*?)['"];/g, (match, importPath) => {      } catch {

        if (!importPath.endsWith('.js') && !importPath.includes('?')) {        // No index.js found, fallback to .js extension

          return match.replace(importPath, importPath + '.js');        return `${importPath}.js`;

        }      }

        return match;    }

      })  } catch {

      .replace(/import\s*\(\s*['"](\.[^'"]*?)['"]\s*\)/g, (match, importPath) => {    // Path doesn't exist as directory, try as file

        if (!importPath.endsWith('.js') && !importPath.includes('?')) {  }

          return match.replace(importPath, importPath + '.js');  

        }  // Check if the file exists with .js extension

        return match;  try {

      });    await stat(`${resolvedPath}.js`);

        return `${importPath}.js`;

    if (fixedContent !== content) {  } catch {

      await writeFile(filePath, fixedContent);    // Return original path if we can't resolve it

      console.log(`Fixed imports in: ${filePath}`);    return importPath;

    }  }

  } catch (error) {}

    console.log(`Error processing ${filePath}: ${error.message}`);

  }async function addJSExtensionsInFile(filePath) {

}  try {

    const content = await readFile(filePath, 'utf-8');

// Run the fix    let fixedContent = content;

fixImports(distDir)    let hasChanges = false;

  .then(() => console.log('Import fixing completed'))    

  .catch(error => {    // Process relative imports starting with ../ or ./

    console.log(`Import fixing failed: ${error.message}`);    const importRegex = /from\s+['"`](\.\.?[^'"`]*?)['"`]/g;

    process.exit(0); // Don't fail the build for this    let match;

  });    
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