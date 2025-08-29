/**
 * Test embedding creation with LM Studio
 */

async function testEmbeddings() {
  console.log('🧮 Testing Embedding Creation...\n');
  
  try {
    const response = await fetch('http://localhost:1234/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-key'
      },
      body: JSON.stringify({
        model: 'text-embedding-nomic-embed-text-v1.5',
        input: 'Apple Inc. stock entity'
      })
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText.substring(0, 200) + '...');
    
    if (response.ok) {
      console.log('✅ Embeddings working!');
    } else {
      console.log('❌ Embedding failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEmbeddings();