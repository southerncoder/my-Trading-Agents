/**
 * Debug test for entity node creation
 */

async function testEntityNodeCreation() {
  console.log('🔍 Debugging Entity Node Creation...\n');
  
  const serviceUrl = process.env.ZEP_SERVICE_URL || 'http://localhost:8000';
  const groupId = 'test-trading-session';
  
  try {
    // Test 1: Simple entity node request
    console.log('1. Testing simple entity node creation...');
    
    const simpleRequest = {
      uuid: `test-entity-${Date.now()}`,
      group_id: groupId,
      name: 'AAPL',
      summary: 'Apple Inc. stock entity'
    };
    
    console.log('Request data:', JSON.stringify(simpleRequest, null, 2));
    
    const response = await fetch(`${serviceUrl}/entity-node`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(simpleRequest)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Entity node created successfully!');
    } else {
      console.log('❌ Entity node creation failed');
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log('Raw error response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testEntityNodeCreation();