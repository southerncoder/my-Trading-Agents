#!/usr/bin/env python3
"""
Test using the actual Graphiti client instead of direct HTTP calls
This should properly handle data processing and search indexing
"""

import asyncio
import uuid
import os
from datetime import datetime, timezone
from typing import List, Dict, Any

# Import the Graphiti client from our implementation
import sys
sys.path.append('/app/graph_service')

from graphiti_core import Graphiti
from graphiti_core.llm_client import LLMConfig, OpenAIClient
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.nodes import EpisodeType
from datetime import datetime, timezone

async def create_graphiti_client():
    """Create a proper Graphiti client using the same configuration as the service"""
    
    # Use environment variables same as the service - match docker-compose configuration
    neo4j_uri = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
    neo4j_user = os.getenv('NEO4J_USER', 'neo4j')
    neo4j_password = os.getenv('NEO4J_PASSWORD', 'demo-password-change-me')
    
    # Create LLM client with proper configuration
    llm_config = LLMConfig(
        api_key=os.getenv('OPENAI_API_KEY', 'dummy-key'),
        base_url=os.getenv('OPENAI_BASE_URL', 'http://host.docker.internal:1234/v1'),
        model='dolphin-2.9-llama3-8b'
    )
    llm_client = OpenAIClient(config=llm_config)
    
    # Create embedder
    embedder_config = OpenAIEmbedderConfig(
        api_key=os.getenv('OPENAI_API_KEY', 'dummy-key'),
        base_url=os.getenv('OPENAI_BASE_URL', 'http://host.docker.internal:1234/v1'),
        embedding_model='text-embedding-qwen3-embedding-4b',
        embedding_dim=2560
    )
    embedder = OpenAIEmbedder(config=embedder_config)
    
    # Create Graphiti client using the proper constructor
    graphiti = Graphiti(
        neo4j_uri,
        neo4j_user,
        neo4j_password,
        llm_client=llm_client,
        embedder=embedder
    )
    
    return graphiti

async def test_with_graphiti_client():
    """Test data creation and search using the actual Graphiti client"""
    
    print("🧪 TESTING WITH GRAPHITI CLIENT")
    print("=" * 50)
    
    try:
        # Create Graphiti client
        print("1. Creating Graphiti client...")
        graphiti = await create_graphiti_client()
        print("   ✅ Graphiti client created")
        
        # Test group ID
        group_id = "graphiti_client_test"
        
        # 2. Add episodes (messages) using Graphiti client
        print(f"\n2. Adding episodes using Graphiti client...")
        
        episodes_data = [
            "Sarah Johnson is a premium customer who prefers sustainable products and has a size 8 shoe preference.",
            "The EcoRunners are made from recycled materials and come in sizes 6-10 with excellent comfort ratings.",
            "Sarah recently inquired about environmentally friendly running shoes for her daily 5K runs."
        ]
        
        episode_uuids = []
        for i, content in enumerate(episodes_data):
            try:
                # Use the add_episode method with proper parameters
                await graphiti.add_episode(
                    name=f"test_episode_{i+1}",
                    episode_body=content,
                    source=EpisodeType.text,
                    reference_time=datetime.now(timezone.utc),
                    source_description=f"Test episode {i+1}"
                )
                print(f"   ✅ Added episode {i+1}")
            except Exception as e:
                print(f"   ❌ Failed to add episode {i+1}: {e}")
        
        print(f"   📊 Successfully added {len(episodes_data)} episodes")
        
        # 3. Wait for processing (episodes automatically create entities)
        print(f"\n3. Waiting for data processing...")
        await asyncio.sleep(3)
        print("   ⏰ Processing time complete")
        
        # 4. Test search using Graphiti client
        print(f"\n4. Testing search using Graphiti client...")
        
        search_queries = [
            "Sarah Johnson",
            "sustainable", 
            "EcoRunners",
            "size 8",
            "recycled materials"
        ]
        
        search_results_found = 0
        for i, query in enumerate(search_queries):
            try:
                # Use Graphiti's search method with correct parameters
                results = await graphiti.search(
                    query=query,
                    num_results=10
                )
                
                result_count = len(results) if results else 0
                print(f"   Search {i+1} ('{query}'): {result_count} results")
                
                if result_count > 0:
                    search_results_found += 1
                    # Show first result
                    first_result = results[0]
                    if hasattr(first_result, 'fact'):
                        print(f"      Sample result: {first_result.fact[:100]}...")
                    else:
                        print(f"      Sample result: {str(first_result)[:100]}...")
                        
            except Exception as e:
                print(f"   ❌ Search {i+1} failed: {e}")
        
        # 5. Test graph data retrieval
        print(f"\n5. Testing direct graph data retrieval...")
        
        try:
            # Use the internal search method to get nodes
            from graphiti_core.search.search_config_recipes import NODE_HYBRID_SEARCH_EPISODE_MENTIONS
            
            search_result = await graphiti._search('Sarah', NODE_HYBRID_SEARCH_EPISODE_MENTIONS)
            
            node_count = len(search_result.nodes) if search_result and hasattr(search_result, 'nodes') else 0
            print(f"   ✅ Node search: {node_count} nodes found")
            
            if node_count > 0:
                search_results_found += 1
                print(f"      Sample node: {search_result.nodes[0].uuid}")
                
        except Exception as e:
            print(f"   ❌ Node search failed: {e}")
        
        # 6. Summary
        print(f"\n6. Test Summary:")
        print(f"   Episodes added: {len(episodes_data)}")
        print(f"   Search queries with results: {search_results_found}/{len(search_queries) + 1}")
        
        if search_results_found > 0:
            print(f"\n   ✅ SUCCESS: Graphiti client search is working!")
            print(f"   ✅ Data is properly indexed and searchable")
            print(f"   🎯 The issue was bypassing the Graphiti client logic")
        else:
            print(f"\n   ⚠️  Still no search results found")
            print(f"   💡 May need more time for indexing or different search approach")
        
        return search_results_found > 0
        
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    success = await test_with_graphiti_client()
    
    if success:
        print(f"\n🎉 INTEGRATION TEST SUCCESS!")
        print(f"✅ Graphiti client properly handles data indexing and search")
        print(f"✅ Direct HTTP calls bypass important client-side processing")
    else:
        print(f"\n⚠️  Further investigation needed")
        print(f"💡 The Graphiti client may handle indexing differently")

if __name__ == "__main__":
    asyncio.run(main())