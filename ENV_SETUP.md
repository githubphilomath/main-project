# Environment Variables Setup

## Quick Setup

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and replace `your_gemini_api_key_here` with your actual Gemini API key.

## Environment Variables Explained

### Required Variables

**GEMINI_API_KEY** (REQUIRED)
- Your Google Gemini API key
- Get it from: https://makersuite.google.com/app/apikey
- Example: `GEMINI_API_KEY=AIzaSy...`

### Database Configuration

**DATABASE_URL**
- PostgreSQL connection string
- Default for Docker Compose: `postgresql://postgres:postgres@localhost:5432/agent_platform`
- Format: `postgresql://user:password@host:port/database`

**DB_POOL_SIZE**
- Number of database connections in the pool
- Default: `10`

**DB_MAX_OVERFLOW**
- Maximum overflow connections
- Default: `20`

### ChromaDB Configuration

**CHROMA_HOST**
- ChromaDB server hostname
- Default: `localhost` (for Docker Compose)
- For production: your ChromaDB server address

**CHROMA_PORT**
- ChromaDB server port
- Default: `8000`

**CHROMA_COLLECTION_KNOWLEDGE**
- Name for knowledge base collection
- Default: `knowledge_base`

**CHROMA_COLLECTION_MEMORY**
- Name for project memory collection
- Default: `project_memory`

**CHROMA_COLLECTION_VERSION**
- Name for version control collection
- Default: `approval_version`

### API Configuration

**API_HOST**
- API server host
- Default: `0.0.0.0` (all interfaces)

**API_PORT**
- API server port
- Default: `8000`

**API_RELOAD**
- Enable auto-reload for development
- Default: `true`

### Logging Configuration

**LOG_LEVEL**
- Logging level
- Options: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- Default: `INFO`

**LOG_FORMAT**
- Log format
- Options: `json` (production) or `console` (development)
- Default: `json`

### Agent Configuration

**MAX_RETRIES**
- Maximum retry attempts for failed agent operations
- Default: `3`

**RETRY_DELAY**
- Initial retry delay in seconds
- Default: `1.0`

**AGENT_TIMEOUT**
- Agent execution timeout in seconds
- Default: `300` (5 minutes)

### RAG Configuration

**RAG_TOP_K**
- Number of top results to retrieve from RAG
- Default: `5`

**RAG_SIMILARITY_THRESHOLD**
- Minimum similarity score for RAG results (0.0 to 1.0)
- Default: `0.7`

**EMBEDDING_MODEL**
- Embedding model name
- Default: `text-embedding-004`

## Example .env File

```bash
# LLM Configuration
GEMINI_API_KEY=AIzaSyYourActualApiKeyHere123456789
GEMINI_MODEL=gemini-pro

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agent_platform
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20

# Chroma Configuration
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION_KNOWLEDGE=knowledge_base
CHROMA_COLLECTION_MEMORY=project_memory
CHROMA_COLLECTION_VERSION=approval_version

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Agent Configuration
MAX_RETRIES=3
RETRY_DELAY=1.0
AGENT_TIMEOUT=300

# RAG Configuration
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.7
EMBEDDING_MODEL=text-embedding-004
```

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env` file to version control
- The `.env` file is already in `.gitignore`
- Keep your API keys secure
- Use environment variables or secret management in production

## Docker Compose Override

If using Docker Compose, you can also set environment variables in `docker-compose.yml`:

```yaml
services:
  api:
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
```

The `.env` file will be automatically loaded by Docker Compose.

