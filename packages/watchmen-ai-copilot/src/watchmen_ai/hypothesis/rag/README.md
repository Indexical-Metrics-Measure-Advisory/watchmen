# RAG Embedding Service

A comprehensive RAG (Retrieval-Augmented Generation) embedding service built on LanceDB for storing and retrieving challenge markdown content from simulation results.

## Overview

The RAG Embedding Service provides vector-based storage and similarity search capabilities for business challenge analysis content. It automatically processes simulation results, extracts markdown content, chunks it appropriately, generates embeddings, and stores everything in a high-performance LanceDB vector database.

## Features

### 🚀 Core Capabilities
- **Vector Storage**: Store challenge markdown content with semantic embeddings
- **Similarity Search**: Find similar challenges using vector similarity
- **Content Chunking**: Intelligent text chunking with overlap for better retrieval
- **Multiple Content Types**: Support for different content types (reports, summaries, analysis)
- **Metadata Support**: Rich metadata storage for filtering and organization
- **Async Operations**: Full async/await support for high performance

### 📊 Content Types Supported
- **Full Reports**: Complete markdown analysis reports
- **Executive Summaries**: Key conclusions and insights
- **Hypothesis Analysis**: Detailed hypothesis testing results
- **Question & Answer**: Q&A analysis markdown

### 🔍 Search Features
- **Semantic Search**: Vector-based similarity search
- **Content Filtering**: Filter by content type, simulation ID
- **Configurable Results**: Adjustable result limits and scoring
- **Multi-modal Queries**: Support for various query types

## Installation

### Dependencies

Add the following dependencies to your `pyproject.toml`:

```toml
lancedb = "^0.14.0"
sentence-transformers = "^3.3.1"
pyarrow = "^18.1.0"
numpy = "^2.2.1"
```

Install using Poetry:

```bash
poetry install
```

## Quick Start

### Basic Usage

```python
import asyncio
from watchmen_ai.hypothesis.rag.rag_emb_service import (
    get_rag_embedding_service,
    store_challenge_content,
    search_similar_content
)

async def main():
    # Store simulation result
    document_ids = await store_challenge_content(simulation_result)
    print(f"Stored {len(document_ids)} documents")
    
    # Search for similar content
    results = await search_similar_content(
        "customer retention strategies", 
        limit=10
    )
    
    for result in results:
        print(f"Found: {result.document.challenge_title}")
        print(f"Score: {result.score:.4f}")

asyncio.run(main())
```

### Advanced Usage

```python
from watchmen_ai.hypothesis.rag.rag_emb_service import RAGEmbeddingService

# Initialize with custom configuration
rag_service = RAGEmbeddingService(
    db_path="./custom_db",
    table_name="my_challenges",
    embedding_model="all-mpnet-base-v2",
    chunk_size=1500,
    chunk_overlap=300
)

# Store simulation result
document_ids = await rag_service.store_simulation_result(simulation_result)

# Advanced search with filters
results = await rag_service.search_similar_challenges(
    query="business analysis",
    limit=5,
    content_types=["executive_summary", "hypothesis_analysis"],
    simulation_ids=["sim_123", "sim_456"]
)

# Get all documents for a simulation
documents = await rag_service.get_challenge_by_simulation_id("sim_123")

# Get database statistics
stats = await rag_service.get_database_stats()
print(f"Total documents: {stats['total_documents']}")
```

## Configuration

### RAGEmbeddingService Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `db_path` | str | `"./data/lancedb"` | Path to LanceDB database |
| `table_name` | str | `"challenge_documents"` | Name of the table |
| `embedding_model` | str | `"text-embedding-ada-002"` | OpenAI embedding model |
| `chunk_size` | int | `1000` | Size of text chunks |
| `chunk_overlap` | int | `200` | Overlap between chunks |

### Environment Variables

For OpenAI embedding models, you need to set:

```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

### Embedding Models

Supported embedding models:
- `text-embedding-ada-002` (default) - OpenAI's high-quality embedding model
- `all-MiniLM-L6-v2` - Fast sentence transformer, good quality
- `all-mpnet-base-v2` - Higher quality sentence transformer, slower
- `all-distilroberta-v1` - Balanced performance
- `paraphrase-multilingual-MiniLM-L12-v2` - Multilingual support

## Data Models

### ChallengeDocument

```python
class ChallengeDocument(BaseModel):
    id: str                          # Unique document ID
    simulation_id: str               # Simulation identifier
    challenge_title: str             # Challenge title
    challenge_description: str       # Challenge description
    markdown_content: str            # Actual markdown content
    content_type: str               # Type of content
    chunk_index: int                # Chunk index (0-based)
    total_chunks: int               # Total number of chunks
    created_at: datetime            # Creation timestamp
    metadata: Dict[str, Any]        # Additional metadata
```

### VectorSearchResult

```python
class VectorSearchResult(BaseModel):
    document: ChallengeDocument     # The found document
    score: float                    # Similarity score
    distance: float                 # Vector distance
```

## API Reference

### Core Methods

#### `store_simulation_result(simulation_result: SimulationResult) -> List[str]`
Stores a simulation result's challenge markdown content in the vector database.

**Returns**: List of document IDs that were created

#### `search_similar_challenges(query: str, limit: int = 10, content_types: Optional[List[str]] = None, simulation_ids: Optional[List[str]] = None) -> List[VectorSearchResult]`
Searches for similar challenges using vector similarity.

**Parameters**:
- `query`: Search query text
- `limit`: Maximum number of results
- `content_types`: Filter by content types
- `simulation_ids`: Filter by simulation IDs

#### `get_challenge_by_simulation_id(simulation_id: str) -> List[ChallengeDocument]`
Retrieves all documents for a specific simulation.

#### `delete_simulation_documents(simulation_id: str) -> int`
Deletes all documents for a simulation.

**Returns**: Number of documents deleted

#### `get_database_stats() -> Dict[str, Any]`
Returns database statistics including document counts and content distribution.

### Convenience Functions

#### `get_rag_embedding_service() -> RAGEmbeddingService`
Returns the global RAG embedding service instance.

#### `store_challenge_content(simulation_result: SimulationResult) -> List[str]`
Convenience function to store challenge content.

#### `search_similar_content(query: str, limit: int = 10) -> List[VectorSearchResult]`
Convenience function to search similar content.

## Content Processing

### Automatic Content Extraction

The service automatically extracts and processes different types of content from `SimulationResult`:

1. **Full Report**: Generated using `build_analysis_report_md()`
2. **Executive Summary**: Extracted from `challengeInsightResult`
3. **Hypothesis Analysis**: From `hypothesisAnalysisMarkdownDict`
4. **Question & Answer**: From `questionAnswerMarkdown`

### Text Chunking Strategy

- **Chunk Size**: Configurable (default: 1000 characters)
- **Overlap**: Configurable (default: 200 characters)
- **Boundary Detection**: Attempts to break at sentence boundaries
- **Metadata Preservation**: Each chunk maintains reference to original document

## Performance Considerations

### Embedding Generation
- Uses OpenAI's text-embedding-ada-002 for high-quality embeddings (1536 dimensions)
- Falls back to sentence-transformers for other models
- Supports GPU acceleration for sentence-transformers models
- Batch processing for multiple documents

### Database Performance
- LanceDB provides fast vector similarity search
- Automatic indexing for optimal query performance
- Efficient storage with PyArrow columnar format

### Memory Usage
- Streaming processing for large documents
- Configurable chunk sizes to manage memory
- Lazy loading of embedding models

## Monitoring and Logging

The service includes comprehensive logging:

```python
import logging
logging.getLogger('watchmen_ai.hypothesis.rag.rag_emb_service').setLevel(logging.INFO)
```

Log events include:
- Document storage operations
- Search queries and results
- Database initialization
- Error conditions

## Error Handling

The service includes robust error handling for:
- Database connection issues
- Embedding model loading failures
- Invalid input data
- Storage capacity issues

All methods raise appropriate exceptions with descriptive error messages.

## Examples

See `rag_example.py` for comprehensive usage examples including:
- Basic storage and retrieval
- Advanced search with filters
- Database management
- Error handling patterns

## Integration with Watchmen AI

### With Chat Router

```python
from watchmen_ai.hypothesis.rag.rag_emb_service import search_similar_content

async def enhanced_chat_response(user_query: str):
    # Search for relevant historical challenges
    similar_challenges = await search_similar_content(user_query, limit=3)
    
    # Use results to enhance AI response context
    context = "\n".join([r.document.markdown_content for r in similar_challenges])
    
    # Generate response with enhanced context
    return generate_ai_response(user_query, context)
```

### With Analysis Pipeline

```python
async def store_analysis_results(simulation_result: SimulationResult):
    # Store in vector database for future retrieval
    document_ids = await store_challenge_content(simulation_result)
    
    # Log storage success
    logger.info(f"Stored analysis results: {document_ids}")
    
    return document_ids
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database path permissions
   - Ensure sufficient disk space
   - Verify LanceDB installation

2. **Embedding Model Issues**
   - For OpenAI models: Check OPENAI_API_KEY environment variable
   - For sentence-transformers: Check internet connection for model download
   - Verify model name is correct
   - Ensure sufficient memory for model loading

3. **Performance Issues**
   - Reduce chunk size for faster processing
   - Use smaller embedding models
   - Consider GPU acceleration

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Enable detailed logging
rag_service = RAGEmbeddingService()
```

## Future Enhancements

- [ ] Support for multiple embedding models simultaneously
- [ ] Automatic model selection based on content type
- [ ] Integration with external vector databases
- [ ] Real-time embedding updates
- [ ] Advanced filtering and faceted search
- [ ] Embedding model fine-tuning capabilities

## License

This service is part of the Watchmen AI Copilot package and follows the same licensing terms.