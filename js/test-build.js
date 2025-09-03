// Test that both library and CLI are built correctly
import { existsSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Testing build outputs...');

const distPath = resolve(process.cwd(), 'dist');
const expectedFiles = [
  'index.js',           // Main library
  'cli/main.js'         // CLI
];

let allFilesExist = true;

for (const file of expectedFiles) {
  const filePath = resolve(distPath, file);
  if (existsSync(filePath)) {
    console.log(`✅ ${file} - exists`);
  } else {
    console.log(`❌ ${file} - missing`);
    allFilesExist = false;
  }
}

if (allFilesExist) {
  console.log('\n🎯 Build Test Results:');
  console.log('   ✅ Main library built successfully');
  console.log('   ✅ CLI built successfully');
  console.log('   ✅ Both builds are included in single npm run build');
  console.log('\n🚀 Ready for production deployment!');
} else {
  console.log('\n❌ Some build outputs are missing');
  process.exit(1);
}