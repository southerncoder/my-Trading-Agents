// Debug CLI startup condition
console.log('=== CLI STARTUP DEBUG ===');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);
console.log('file://${process.argv[1]}:', `file://${process.argv[1]}`);
console.log('Match?:', import.meta.url === `file://${process.argv[1]}`);
console.log('process.argv:', process.argv);

// Test different startup conditions
const conditions = [
  import.meta.url === `file://${process.argv[1]}`,
  process.argv[1].endsWith('src/cli/main.ts'),
  process.argv.includes('analyze'),
];

console.log('Startup conditions:');
conditions.forEach((condition, index) => {
  console.log(`  Condition ${index + 1}:`, condition);
});

if (process.argv.includes('analyze')) {
  console.log('✅ This would trigger CLI startup!');
}