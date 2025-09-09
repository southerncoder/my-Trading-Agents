// Test script to verify LM Studio chat completion with system role
import fetch from 'node-fetch';

const testChatWithSystem = async () => {
    console.log('🤖 Testing Chat Completion with System Role...');
    
    const requestData = {
        model: "dolphin-2.9-llama3-8b",
        messages: [
            {
                role: "system", 
                content: "You are a helpful assistant that extracts facts from data."
            },
            {
                role: "user", 
                content: "What can you tell me about this data?"
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
        
        const responseText = await response.text();
        console.log('Response body:', responseText);
        
        if (response.ok) {
            console.log('✅ Chat completion with system role working!');
        } else {
            console.log('❌ Chat completion with system role failed');
        }
    } catch (error) {
        console.error('❌ Error testing chat completion:', error.message);
    }
};

testChatWithSystem();