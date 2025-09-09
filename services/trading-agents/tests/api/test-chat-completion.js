// Test script to verify LM Studio chat completion endpoint
import fetch from 'node-fetch';

const testChatCompletion = async () => {
    console.log('🤖 Testing Chat Completion...');
    
    const requestData = {
        model: "dolphin-2.9-llama3-8b",
        messages: [
            {
                role: "user", 
                content: "Hello, this is a test message."
            }
        ],
        max_tokens: 100,
        temperature: 0.1
    };
    
    try {
        console.log('Request data:', JSON.stringify(requestData, null, 2));
        
        const response = await fetch('http://localhost:1234/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer demo-key'
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Response body:', responseText);
        
        if (response.ok) {
            console.log('✅ Chat completion working!');
        } else {
            console.log('❌ Chat completion failed');
        }
    } catch (error) {
        console.error('❌ Error testing chat completion:', error.message);
    }
};

testChatCompletion();