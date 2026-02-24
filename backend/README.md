# Backend - Multi-Agent Autonomous Software Development Platform

Backend API and agent orchestration system.

## Quick Start

1. **Setup Environment**:
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT
   ```

2. **Start Services**:
   ```bash
   docker-compose up -d postgres chroma
   ```

3. **Initialize Database**:
   ```bash
   python -m scripts.init_db
   ```

4. **Run API**:
   ```bash
   uvicorn api.main:app --reload
   ```

## Project Structure

```
backend/
├── agents/          # 8 agent modules
├── api/             # FastAPI endpoints
├── core/            # State and graph orchestration
├── rag/             # RAG systems
├── services/        # Business logic
├── models/          # Database and API schemas
├── config/          # Configuration
├── utils/           # Utilities
├── scripts/          # Setup scripts
├── tests/           # Tests
└── docker/          # Docker files
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

See `ENV_SETUP.md` for detailed configuration.

