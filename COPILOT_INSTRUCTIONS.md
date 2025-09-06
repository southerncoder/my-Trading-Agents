# GitHub Copilot Instructions for Zep-Graphiti Integration

## Critical Security Rule: Never Include Real IP Addresses

**MANDATORY**: Never include real IP addresses in source code, test files, documentation, or any repository files.

### Why This Matters

1. **Security Policy Violation**: Exposing internal IP addresses creates security vulnerabilities
2. **Network Topology Exposure**: Real IPs reveal internal network structure
3. **Attack Surface**: Hardcoded IPs provide attack vectors for malicious actors
4. **Privacy Concerns**: Internal addresses should never be public

### Correct Approach: Use Environment Variables or Generic Examples

```python
# ✅ CORRECT - Use environment variables
REMOTE_LM_STUDIO_URL = os.getenv('REMOTE_LM_STUDIO_URL', 'http://localhost:1234')
NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')

# ✅ CORRECT - Use localhost in examples
base_url = 'http://localhost:1234/v1'
neo4j_uri = 'bolt://localhost:7687'

# ✅ CORRECT - Use generic examples in documentation
# Example: Connect to your LM Studio server at http://your-server:1234
```

### INCORRECT Approach: Hardcoded Real IPs

```python
# ❌ NEVER DO THIS - exposes real internal IPs
base_url = 'http://127.0.0.1:9876/v1'  # Real IP - SECURITY VIOLATION
neo4j_uri = 'bolt://10.0.0.45:7687'       # Real IP - SECURITY VIOLATION
```

### Security Best Practices

1. **Environment Variables**: Always use env vars for network endpoints
2. **Localhost Examples**: Use localhost or 127.0.0.1 in code examples
3. **Generic Documentation**: Use placeholders like "your-server" in docs
4. **Configuration Files**: Keep real IPs in .env files (gitignored)

**This rule applies to ALL files in the repository including source code, tests, documentation, and configuration examples.**

## Critical Rule: Always Use Graphiti Client

**MANDATORY**: When writing code that interacts with Zep-Graphiti, ALWAYS use the official Graphiti client library instead of direct HTTP API calls.

### Why This Matters

1. **Proper Data Processing**: The Graphiti client handles internal data processing logic that direct HTTP calls bypass
2. **Search Indexing**: Client-side logic ensures data is properly indexed for search functionality
3. **Entity Extraction**: The client automatically extracts entities and relationships from episodes
4. **Embedding Generation**: Proper embedding generation and storage is handled by the client
5. **Graph Consistency**: The client maintains graph consistency and relationships

### Correct Approach: Use Graphiti Client

```python
from graphiti_core import Graphiti
from graphiti_core.llm_client import LLMConfig, OpenAIClient
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.nodes import EpisodeType
from datetime import datetime, timezone

# Initialize Graphiti client
llm_config = LLMConfig(
    api_key=os.getenv('OPENAI_API_KEY', 'dummy-key'),
    base_url=os.getenv('OPENAI_BASE_URL', 'http://host.docker.internal:1234/v1'),
    model='dolphin-2.9-llama3-8b'
)
llm_client = OpenAIClient(config=llm_config)

embedder_config = OpenAIEmbedderConfig(
    api_key=os.getenv('OPENAI_API_KEY', 'dummy-key'),
    base_url=os.getenv('OPENAI_BASE_URL', 'http://host.docker.internal:1234/v1'),
    embedding_model='text-embedding-qwen3-embedding-4b',
    embedding_dim=2560
)
embedder = OpenAIEmbedder(config=embedder_config)

graphiti = Graphiti(
    neo4j_uri,
    neo4j_user,
    neo4j_password,
    llm_client=llm_client,
    embedder=embedder
)

# Add episodes using client
await graphiti.add_episode(
    name="episode_name",
    episode_body="episode content",
    source=EpisodeType.text,
    reference_time=datetime.now(timezone.utc),
    source_description="description"
)

# Search using client
results = await graphiti.search(
    query="search query",
    num_results=10
)
```

### INCORRECT Approach: Direct HTTP Calls

```python
# ❌ NEVER DO THIS - bypasses client logic
response = requests.post("http://localhost:8000/messages", json={...})
search_response = requests.post("http://localhost:8000/search", json={...})
```

### Key Client Methods to Use

1. **Adding Data**:
   - `await graphiti.add_episode()` - Add episodes (text, messages, events)
   - `await graphiti.add_episode_bulk()` - Bulk episode addition

2. **Searching**:
   - `await graphiti.search()` - Semantic search with proper ranking
   - `await graphiti._search()` - Internal search with specific configs

3. **Maintenance**:
   - `await graphiti.build_indices_and_constraints()` - Initialize graph
   - `await clear_data(graphiti.driver)` - Clear graph data

### Configuration Best Practices

1. **Use Environment Variables**: Always use env vars for configuration
2. **Proper LLM Client**: Use OpenAIClient with correct config
3. **Embedder Setup**: Configure embedder with correct dimensions
4. **Error Handling**: Wrap client calls in try-catch blocks

### Integration Testing

When testing Zep-Graphiti integration:

1. Use the Graphiti client for all data operations
2. Allow processing time after adding episodes (2-3 seconds)
3. Test search functionality using client methods
4. Verify data persistence through client queries

### Remember

- Direct HTTP calls will appear to work but will miss crucial processing
- Search functionality specifically requires client-side processing
- Entity extraction and relationship building happen in the client
- Always import and use the official Graphiti classes and methods

**This rule applies to ALL code that interacts with Zep-Graphiti services.**