# Quick Start Guide

## What you just built

A complete RAG (Retrieval-Augmented Generation) API system with:

- **425 Bryntum documentation files** indexed and searchable
- **1,277 chunks** embedded using OpenAI (text-embedding-3-small)
- **LanceDB vector database** for fast semantic search
- **REST API** for querying and document retrieval
- **CLI tool** for batch indexing

## Test it now!

### 1. The server is already running on port 3000

```bash
# Check health
curl http://localhost:3000/health

# API info
curl http://localhost:3000/
```

### 2. Search for documentation

```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I configure a chart with multiple data series?",
    "limit": 5
  }'
```

### 3. Get a specific document

```bash
# Use an ID from search results
curl http://localhost:3000/doc/{document-id}
```

## Example Queries to Try

**Charts:**
```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "How to customize chart colors and styling?", "limit": 3}'
```

**Grid features:**
```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "How to enable filtering and sorting in grids?", "limit": 3}'
```

**Get formatted context for RAG:**
```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain event handling in Bryntum",
    "limit": 5,
    "includeContext": true
  }'
```

## Re-index with new documents

### From filesystem:
```bash
npm run index -- --source ./path/to/docs
```

### From zip file:
```bash
npm run index -- --zip ./docs.zip
```

### Clear and re-index:
```bash
npm run index -- --source ./temp/docs-llm --clear
```

## Upload via API

```bash
curl -X POST http://localhost:3000/index \
  -F "file=@docs-llm.zip"
```

## Project Statistics

- **Documents processed:** 425
- **Chunks indexed:** 1,277
- **Vector dimensions:** 1536
- **Database size:** ~3MB
- **Indexing time:** ~54 seconds

## Next Steps: Add MCP Support

To make this work with Claude Desktop:

1. Create `src/mcp/server.js`
2. Install `@modelcontextprotocol/sdk`
3. Implement MCP tools:
   - `search_docs` - Search Bryntum documentation
   - `get_doc` - Get specific document
4. Register in Claude Desktop config

## Architecture Highlights

The code follows SOLID principles:

- **Single Responsibility:** Each class does one thing
- **Open/Closed:** Easy to add new vector stores or embedding providers
- **Liskov Substitution:** All adapters are swappable
- **Interface Segregation:** Minimal, focused interfaces
- **Dependency Inversion:** Services depend on abstractions

## Useful Commands

```bash
# Start API server
npm start

# Start with auto-reload
npm run dev

# Index from directory
npm run index -- --source ./docs

# Index from zip
npm run index -- --zip ./docs.zip

# View logs
# Logs are output to console with pino-pretty formatting
```

## Environment Variables

Edit `.env` to configure:

```env
OPENAI_API_KEY=your_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
PORT=3000
VECTOR_DB_PATH=./data/lancedb
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
LOG_LEVEL=info
```

## Cost Estimation

Using `text-embedding-3-small`:
- Price: $0.02 per 1M tokens
- 1,277 chunks × ~400 tokens avg = ~510k tokens
- Cost: ~$0.01 USD

Very affordable for documentation search!
