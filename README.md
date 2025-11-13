# Bryntum MCP - RAG API for Documentation

A modular, SOLID-compliant RAG (Retrieval-Augmented Generation) system for semantic search over Bryntum documentation using vector embeddings.

## Architecture

The project follows SOLID principles with clear separation of concerns:

```
src/
├── core/              # Interfaces (DIP - Dependency Inversion)
│   ├── VectorStore.js
│   ├── EmbeddingProvider.js
│   └── DocumentSource.js
│
├── adapters/          # Concrete implementations (LSP - Liskov Substitution)
│   ├── vectorstore/
│   │   └── LanceDBAdapter.js
│   ├── embeddings/
│   │   └── OpenAIAdapter.js
│   └── sources/
│       ├── FileSystemSource.js
│       └── ZipSource.js
│
├── services/          # Business logic (SRP - Single Responsibility)
│   ├── DocumentProcessor.js
│   ├── EmbeddingService.js
│   ├── IndexService.js
│   └── QueryService.js
│
├── api/               # HTTP API layer
│   ├── server.js
│   └── routes/
│       ├── index.js      # POST /index (upload zip)
│       ├── search.js     # POST /search
│       └── document.js   # GET /doc/:id
│
├── indexer/           # CLI tool
│   └── cli.js
│
└── utils/             # Shared utilities
    ├── config.js
    ├── logger.js
    └── chunker.js
```

## Features

- **Modular Architecture**: Clean separation with SOLID principles
- **Vector Search**: Semantic search using LanceDB and OpenAI embeddings
- **Multiple Sources**: Support for filesystem and zip uploads
- **Smart Chunking**: Markdown-aware chunking for better context
- **RESTful API**: Simple HTTP interface for indexing and search
- **CLI Tool**: Command-line indexer for batch processing

## Prerequisites

- Node.js v20+
- OpenAI API key

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
```

3. Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

### Option 1: CLI Indexer

Index documents from a directory:

```bash
npm run index -- --source ./temp/docs-llm
```

Index from a zip file:

```bash
npm run index -- --zip ./docs-llm.zip
```

### Option 2: REST API

Start the API server:

```bash
npm start
```

The server will start at `http://localhost:3000`

#### Upload and index a zip file:

```bash
curl -X POST http://localhost:3000/index \
  -F "file=@docs-llm.zip"
```

#### Search for documents:

```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I create a chart?",
    "limit": 5,
    "includeContext": true
  }'
```

#### Get a specific document:

```bash
curl http://localhost:3000/doc/{document-id}
```

## API Endpoints

### POST /index

Upload and index a zip file containing markdown documents.

**Request:**
- Content-Type: multipart/form-data
- Body: file (zip file)

**Response:**
```json
{
  "success": true,
  "uploadId": "abc123",
  "filename": "docs.zip",
  "documentsProcessed": 426,
  "chunksIndexed": 1234,
  "durationMs": 45000
}
```

### POST /search

Search for documents using semantic similarity.

**Request:**
```json
{
  "query": "How to configure a chart?",
  "limit": 5,
  "filter": {},
  "includeContext": false
}
```

**Response:**
```json
{
  "query": "How to configure a chart?",
  "resultCount": 5,
  "durationMs": 250,
  "results": [
    {
      "id": "abc123",
      "text": "...",
      "score": 0.15,
      "relevance": "0.850",
      "metadata": {
        "documentPath": "api/Chart/widget/Chart.md",
        "heading": "Configuring data",
        "chunkIndex": 0
      }
    }
  ]
}
```

### GET /doc/:id

Get a specific document by ID.

**Response:**
```json
{
  "id": "abc123",
  "text": "...",
  "metadata": {
    "documentPath": "api/Chart/widget/Chart.md",
    "heading": "Configuring data"
  }
}
```

## Configuration

Configuration is managed through environment variables in `.env`:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Storage Configuration
VECTOR_DB_PATH=./data/lancedb
TEMP_UPLOAD_PATH=./temp

# Chunking Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Logging
LOG_LEVEL=info
```

## SOLID Principles Implementation

### Single Responsibility Principle (SRP)
Each class has one responsibility:
- `DocumentProcessor` - only chunks documents
- `EmbeddingService` - only generates embeddings
- `QueryService` - only handles queries

### Open/Closed Principle (OCP)
New document sources can be added by extending `DocumentSource` without modifying existing code.

### Liskov Substitution Principle (LSP)
All adapters can be swapped with their base interfaces without breaking functionality.

### Interface Segregation Principle (ISP)
Interfaces are focused and minimal (VectorStore, EmbeddingProvider, DocumentSource).

### Dependency Inversion Principle (DIP)
Services depend on abstractions (interfaces) not concrete implementations.

## Next Steps

To add MCP (Model Context Protocol) support, you can:

1. Create `src/mcp/` directory
2. Implement MCP server using `@modelcontextprotocol/sdk`
3. Expose search and document retrieval as MCP tools
4. Register with Claude Desktop

## Development

Run in development mode with auto-reload:

```bash
npm run dev
```

## License

ISC
