#!/usr/bin/env python3
import requests
import os

def test_connectivity():
    base_url = os.getenv('OPENAI_BASE_URL', 'http://host.docker.internal:5432/v1')
    print(f"Testing connectivity to: {base_url}")
    
    try:
        # Test models endpoint
        models_url = f"{base_url.rstrip('/v1')}/v1/models"
        print(f"Testing models endpoint: {models_url}")
        response = requests.get(models_url, timeout=10)
        print(f"Models API Status: {response.status_code}")
        if response.status_code == 200:
            models = response.json()
            print(f"Available models: {[model['id'] for model in models['data']]}")
        else:
            print(f"Models API Error: {response.text}")
            
        # Test embeddings endpoint
        embedding_url = f"{base_url}/embeddings"
        print(f"Testing embeddings endpoint: {embedding_url}")
        embedding_data = {
            "model": "text-embedding-qwen3-embedding-4b",
            "input": ["test"]
        }
        response = requests.post(embedding_url, json=embedding_data, timeout=10)
        print(f"Embeddings API Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Embeddings API Error: {response.text}")
        else:
            print("Embeddings API working correctly")
            
    except Exception as e:
        print(f"Connectivity test failed: {e}")

if __name__ == "__main__":
    test_connectivity()