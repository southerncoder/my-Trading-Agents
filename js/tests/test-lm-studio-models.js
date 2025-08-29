#!/usr/bin/env node

/**
 * Test script to check what models are available in LM Studio
 */

console.log('🤖 Checking Available Models in LM Studio...\n');

async function checkModels() {
    try {
        // Use default LM Studio URL
        const lmStudioUrl = 'http://localhost:1234';
        
        console.log(`LM Studio URL: ${lmStudioUrl}`);
        
        // Check models endpoint
        const modelsResponse = await fetch(`${lmStudioUrl}/v1/models`);
        console.log(`Models endpoint status: ${modelsResponse.status}`);
        
        if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            console.log('\n📋 Available Models:');
            console.log(JSON.stringify(modelsData, null, 2));
        } else {
            console.log(`❌ Models endpoint failed: ${modelsResponse.statusText}`);
            const errorText = await modelsResponse.text();
            console.log('Error response:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Error checking models:', error.message);
    }
}

checkModels();