#!/usr/bin/env node

/**
 * Debug Configuration Test - Check what config is actually available
 */

console.log('🔍 Configuration Debug Test');
console.log('===========================\n');

async function debugConfig() {
    try {
        console.log('1️⃣  Testing DEFAULT_CONFIG from default.js');
        const { DEFAULT_CONFIG } = await import('./dist/config/default.js');
        console.log('Available fields:', Object.keys(DEFAULT_CONFIG));
        console.log('llmProvider:', DEFAULT_CONFIG.llmProvider);
        console.log('backendUrl:', DEFAULT_CONFIG.backendUrl);
        console.log();
        
        console.log('2️⃣  Testing backwardCompatibleConfig');
        const { backwardCompatibleConfig } = await import('./dist/config/index.js');
        const legacyConfig = backwardCompatibleConfig.getConfig();
        console.log('Legacy config fields:', Object.keys(legacyConfig));
        console.log('llmProvider:', legacyConfig.llmProvider);
        console.log('backendUrl:', legacyConfig.backendUrl);
        console.log();
        
        console.log('3️⃣  Testing ENHANCED_DEFAULT_CONFIG');
        const { ENHANCED_DEFAULT_CONFIG } = await import('./dist/config/index.js');
        console.log('Enhanced config fields:', Object.keys(ENHANCED_DEFAULT_CONFIG));
        console.log('llmProvider:', ENHANCED_DEFAULT_CONFIG.llmProvider);
        console.log();
        
        console.log('4️⃣  Testing enhancedConfigLoader');
        const { enhancedConfigLoader } = await import('./dist/config/index.js');
        const enhancedConfig = enhancedConfigLoader.getConfig();
        console.log('Enhanced loader config fields:', Object.keys(enhancedConfig));
        
        const legacyFromEnhanced = enhancedConfigLoader.toLegacyConfig();
        console.log('Legacy from enhanced fields:', Object.keys(legacyFromEnhanced));
        console.log('llmProvider from toLegacyConfig:', legacyFromEnhanced.llmProvider);
        console.log('backendUrl from toLegacyConfig:', legacyFromEnhanced.backendUrl);
        
    } catch (error) {
        console.error('Config debug failed:', error.message);
        console.error(error.stack);
    }
}

debugConfig();