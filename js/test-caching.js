/**
 * Test script for cached dataflows and performance improvements
 */

import { CachedDataflowsFactory } from './dist/dataflows/cached-dataflows.js';

async function testCachedDataflows() {
    console.log('Testing cached dataflows performance...\n');

    // Mock config
    const config = {
        dataDir: './data',
        finnhubApiKey: '',
        googleNewsApiKey: '',
        redditClientId: '',
        redditClientSecret: '',
        redditUsername: '',
        redditPassword: ''
    };

    const factory = new CachedDataflowsFactory(config, true);

    // Test Yahoo Finance caching
    console.log('=== Testing Yahoo Finance Caching ===');
    const yahooApi = factory.createYahooFinanceAPI();
    
    console.log('First call (cache miss):');
    const start1 = Date.now();
    const result1 = await yahooApi.getData('AAPL', '2025-08-20', '2025-08-24', true);
    const duration1 = Date.now() - start1;
    console.log(`Duration: ${duration1}ms, Result length: ${result1.length}`);

    console.log('\nSecond call (cache hit):');
    const start2 = Date.now();
    const result2 = await yahooApi.getData('AAPL', '2025-08-20', '2025-08-24', true);
    const duration2 = Date.now() - start2;
    console.log(`Duration: ${duration2}ms, Result length: ${result2.length}`);

    const speedup = duration1 / duration2;
    console.log(`\nCache speedup: ${speedup.toFixed(2)}x\n`);

    // Test cache statistics
    console.log('=== Cache Statistics ===');
    const stats = factory.getAllCacheStats();
    console.log('Yahoo Finance Cache Stats:', {
        hits: stats.yahoo.hits,
        misses: stats.yahoo.misses,
        hitRate: `${stats.yahoo.hitRate.toFixed(1)}%`,
        memoryUsageMB: `${stats.yahoo.memoryUsageMB.toFixed(2)}MB`
    });

    console.log('Combined Cache Stats:', {
        totalHits: stats.combined.totalHits,
        totalMisses: stats.combined.totalMisses,
        overallHitRate: `${stats.combined.overallHitRate.toFixed(1)}%`,
        totalMemoryMB: `${stats.combined.totalMemoryMB.toFixed(2)}MB`
    });

    // Test cache invalidation
    console.log('\n=== Testing Cache Invalidation ===');
    factory.invalidateSymbol('AAPL');
    
    console.log('Third call after invalidation (cache miss again):');
    const start3 = Date.now();
    const result3 = await yahooApi.getData('AAPL', '2025-08-20', '2025-08-24', true);
    const duration3 = Date.now() - start3;
    console.log(`Duration: ${duration3}ms, Result length: ${result3.length}`);

    // Test pre-warming
    console.log('\n=== Testing Cache Pre-warming ===');
    const preWarmStart = Date.now();
    await factory.preWarmAllCaches(['MSFT', 'GOOGL'], '2025-08-20', '2025-08-24', 7);
    const preWarmDuration = Date.now() - preWarmStart;
    console.log(`Pre-warming completed in: ${preWarmDuration}ms`);

    const finalStats = factory.getAllCacheStats();
    console.log('Final Cache Stats:', {
        totalEntries: finalStats.yahoo.entryCount,
        totalMemoryMB: `${finalStats.combined.totalMemoryMB.toFixed(2)}MB`,
        overallHitRate: `${finalStats.combined.overallHitRate.toFixed(1)}%`
    });

    console.log('\n✅ Cached dataflows test completed successfully!');
}

testCachedDataflows()
    .then(() => {
        console.log('\n🎉 All caching tests passed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Caching tests failed:', error);
        process.exit(1);
    });