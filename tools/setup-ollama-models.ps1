# Pulls the local models this stack uses and creates the alias graphiti needs.
# Ollama stays on its default port (11434).
param(
    [string]$ChatModel = 'qwen3.5:9b',
    [string]$EmbeddingModel = 'qwen3-embedding:4b'
)
$ErrorActionPreference = 'Stop'
foreach ($m in @($ChatModel, $EmbeddingModel)) {
    if (-not (ollama list | Select-String -SimpleMatch $m)) { ollama pull $m }
}
# graphiti 0.31.2 hard-codes the embedder model name `text-embedding-3-small`; alias it to the local model.
ollama cp $EmbeddingModel text-embedding-3-small
"Models ready: $ChatModel, $EmbeddingModel (alias text-embedding-3-small)"
