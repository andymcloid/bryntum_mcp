# Bryntum RAG MCP Server

Model Context Protocol (MCP) server implementation for Bryntum documentation RAG.

## Overview

This MCP server provides a thin wrapper around the Bryntum RAG backend, exposing documentation search and retrieval capabilities through the MCP protocol.

**Protocol**: MCP over HTTP
**Transport**: JSON-RPC 2.0 over POST, SSE for streaming
**Authentication**: None (open access)

## Endpoints

- `GET /mcp` - Server info
- `POST /mcp` - JSON-RPC endpoint for MCP protocol
- `GET /mcp/sse` - SSE endpoint for streaming responses

## Available Tools

### 1. search_docs

Search Bryntum documentation using semantic similarity.

**Parameters:**
- `query` (string, required): Search query
- `limit` (number, optional): Max results (1-50, default: 5)
- `version` (string, optional): Documentation version (defaults to latest)
- `product` (string, optional): Filter by product (grid, scheduler, gantt, etc.)
- `framework` (string, optional): Filter by framework (react, angular, vue, vanilla)

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_docs",
      "arguments": {
        "query": "grid configuration",
        "limit": 5,
        "product": "grid"
      }
    },
    "id": 1
  }'
```

### 2. search_examples

Search specifically for code examples in documentation.

**Parameters:** Same as `search_docs`

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_examples",
      "arguments": {
        "query": "react grid",
        "framework": "react"
      }
    },
    "id": 2
  }'
```

### 3. get_doc

Get a specific document chunk by ID.

**Parameters:**
- `id` (string, required): Document chunk ID from search results

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_doc",
      "arguments": {
        "id": "b69e3d5f-bfef-459f-95b8-b9f0a1d196f0"
      }
    },
    "id": 3
  }'
```

### 4. list_versions

List all available documentation versions.

**Parameters:** None

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_versions",
      "arguments": {}
    },
    "id": 4
  }'
```

## MCP Protocol Flow

### 1. Initialize

First, initialize the MCP connection:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "bryntum-rag-mcp",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

### 2. List Tools

Get available tools:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

### 3. Call Tools

Use the tools as shown in examples above.

## SSE Streaming

Connect to SSE endpoint for streaming responses:

```bash
curl -N http://localhost:3000/mcp/sse
```

The server will send periodic pings to keep the connection alive.

## Error Handling

All errors follow JSON-RPC 2.0 error format:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Error description"
  },
  "id": null
}
```

**Common error codes:**
- `-32600`: Invalid Request (malformed JSON-RPC)
- `-32601`: Method not found
- `-32602`: Invalid params (unknown tool or invalid arguments)
- `-32603`: Internal error

## Integration with Claude Desktop

To use this MCP server with Claude Desktop, add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bryntum-rag": {
      "transport": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## Architecture

The MCP server is a thin wrapper with no business logic:

```
MCP Client → MCP HTTP Server → JSON-RPC Handler → Tools → RAG Backend
                                                              ↓
                                                    QueryService / VectorStore
```

All actual RAG functionality lives in the existing backend services:
- `QueryService` - Search and query operations
- `VectorStore` (Weaviate) - Vector database operations
- `EmbeddingService` - Text embeddings via OpenAI

## Development

MCP routes are defined in: `src/api/routes/mcp.js`

Key components:
- `handleJsonRpc()` - JSON-RPC request handler
- `executeTool()` - Tool execution router
- `MCP_TOOLS` - Tool definitions with schemas

## Testing

Test MCP info endpoint:
```bash
# Get MCP server info
curl http://localhost:3000/mcp
```

Test tools:
```bash
# List versions
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_versions","arguments":{}},"id":1}'

# Search docs
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_docs","arguments":{"query":"grid","limit":2}},"id":2}'
```

## Logging

MCP operations are logged with component tag "MCP":

```
[INFO] MCP: Executing MCP tool {tool: "search_docs", args: {...}}
[INFO] MCP: SSE connection established {ip: "..."}
```

Check server logs for MCP activity.
