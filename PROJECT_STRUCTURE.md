# Project Structure

## Overview

The project is organized into `backend/` and `frontend/` directories for clear separation of concerns.

```
Agent_Mariena/
├── backend/                    # Backend API and services
│   ├── agents/                 # AI agent modules
│   │   ├── __init__.py
│   │   ├── base.py            # Base agent class
│   │   ├── orchestrator.py    # Orchestrator agent
│   │   ├── requirement_analysis.py
│   │   ├── architecture.py
│   │   ├── coding.py
│   │   ├── debugging.py
│   │   ├── testing.py
│   │   ├── documentation.py
│   │   └── deployment.py
│   ├── api/                    # FastAPI application
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app entry point
│   │   └── routes/            # API routes
│   │       ├── __init__.py
│   │       └── projects.py
│   ├── core/                   # Core orchestration
│   │   ├── __init__.py
│   │   ├── state.py           # LangGraph state model
│   │   └── graph.py           # LangGraph workflow
│   ├── rag/                    # RAG systems
│   │   ├── __init__.py
│   │   ├── base.py            # Base RAG class
│   │   ├── knowledge_base.py
│   │   ├── project_memory.py
│   │   └── version_control.py
│   ├── services/              # Business logic
│   │   ├── __init__.py
│   │   ├── project_service.py
│   │   └── workflow_service.py
│   ├── models/                # Data models
│   │   ├── __init__.py
│   │   ├── database.py        # SQLAlchemy models
│   │   └── schemas.py         # Pydantic schemas
│   ├── config/                 # Configuration
│   │   ├── __init__.py
│   │   └── settings.py        # Settings management
│   ├── utils/                  # Utilities
│   │   ├── __init__.py
│   │   └── logging.py         # Logging setup
│   ├── scripts/                # Utility scripts
│   │   ├── __init__.py
│   │   ├── init_db.py         # Database initialization
│   │   └── populate_knowledge_base.py
│   ├── tests/                  # Tests
│   │   ├── __init__.py
│   │   └── test_agents.py
│   ├── docker/                 # Docker files
│   │   └── Dockerfile
│   ├── .env                    # Environment variables (gitignored)
│   ├── env.example             # Environment template
│   ├── requirements.txt        # Python dependencies
│   ├── docker-compose.yml      # Backend services
│   ├── .dockerignore
│   └── README.md               # Backend documentation
│
├── frontend/                   # Frontend application
│   └── README.md              # Frontend documentation
│
├── docker-compose.yml          # Root orchestration
├── .gitignore
├── README.md                   # Main project README
├── ARCHITECTURE.md             # Architecture documentation
├── DESIGN_DECISIONS.md          # Design rationale
├── SETUP.md                     # Setup instructions
├── CONTRIBUTING.md              # Development guidelines
├── ENV_SETUP.md                # Environment variables guide
├── COMPLETION_CHECKLIST.md     # Completion status
└── PROJECT_STRUCTURE.md        # This file
```

## Backend Structure

The backend follows a clean architecture pattern:

- **agents/**: Individual agent implementations
- **api/**: FastAPI application and routes
- **core/**: Core business logic (state, workflow)
- **rag/**: RAG system implementations
- **services/**: Service layer for business operations
- **models/**: Data models (database and API schemas)
- **config/**: Configuration management
- **utils/**: Shared utilities
- **scripts/**: Setup and utility scripts
- **tests/**: Test files

## Frontend Structure

Frontend structure will be defined when frontend development begins.

## Running Commands

### Backend Commands

All backend commands should be run from the `backend/` directory:

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python -m scripts.init_db

# Start API server
uvicorn api.main:app --reload

# Run tests
pytest
```

### Docker Commands

From root directory:
```bash
# Start all services
docker-compose up -d

# Start only backend services
docker-compose -f backend/docker-compose.yml up -d
```

## Import Paths

All Python imports use relative paths within the backend directory:

```python
# Example imports
from agents.base import BaseAgent
from core.state import AgentState
from rag.knowledge_base import KnowledgeBaseRAG
from services.project_service import ProjectService
```

These work because Python's import system resolves paths relative to the current working directory and Python path.

