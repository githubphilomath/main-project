# Live Preview Environment

A production-like full-stack deployment for validating feature completeness and usability.

## What's Included

| Component      | Technology         | Purpose                          |
|----------------|--------------------|----------------------------------|
| **Frontend**   | React + Vite + Nginx | UI, chat, project creation       |
| **Backend API**| FastAPI            | REST API, workflow orchestration  |
| **PostgreSQL** | Postgres 15        | Project metadata, state          |
| **ChromaDB**   | Chroma             | RAG vector store, embeddings     |
| **AI**         | Azure OpenAI / Gemini | LLM for agents (branch-dependent) |

## Quick Start

### Prerequisites

- **Docker Desktop** running
- **backend/.env** with valid API keys:
  - **mariena-openai**: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_CHAT_DEPLOYMENT`
  - **mariena-new**: `GEMINI_API_KEY` or `GEMINI_API_KEYS`

### Start Live Preview

**PowerShell:**
```powershell
cd main-project
.\start_live_preview.ps1
```

**Command Prompt:**
```cmd
cd main-project
start_live_preview.bat
```

**Or manually:**
```bash
cd main-project
docker-compose up -d --build
```

### Access Points

| URL | Description |
|-----|-------------|
| **http://localhost:3000** | Frontend (main entry point) |
| **http://localhost:8000** | API (direct access) |
| **http://localhost:8000/health** | Health check |
| **http://localhost:8000/docs** | API documentation (Swagger) |

## Features Available

- **Create projects** – Name, description, requirements
- **Execute AI workflow** – Multi-agent pipeline (orchestrator → requirements → architecture → coding → debugging → testing → documentation → deployment)
- **Real-time progress** – SSE events for agent status, step completion
- **View outputs** – Code, tests, documentation artifacts
- **Stop workflow** – Cancel stuck runs from the header
- **Full App Preview** – Run the complete generated application in-browser. After workflow completes, select the **Full App** view mode and click **Launch Full App Preview** to serve all generated files (HTML, CSS, JS, etc.) as a working app you can interact with

## Architecture

```
Browser (localhost:3000)
    │
    └── Nginx (frontend container)
            │
            ├── /           → Static React app
            └── /api/*      → Proxy to backend:8000
                                    │
                                    ├── PostgreSQL (project state)
                                    ├── ChromaDB (RAG)
                                    └── Azure OpenAI / Gemini (LLM)
```

## Troubleshooting

### "Network error" in frontend

1. Ensure all containers are running: `docker ps`
2. Check API health: open http://localhost:8000/health
3. Restart: `docker-compose down && docker-compose up -d`

### Containers exit immediately

1. Check logs: `docker-compose logs api`
2. Verify **backend/.env** exists and has correct keys
3. Rebuild: `docker-compose up -d --build --force-recreate`

### AI / workflow errors

- **mariena-openai**: Check `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` in backend/.env
- **mariena-new**: Check `GEMINI_API_KEY` or `GEMINI_API_KEYS`
- Quota issues: Add more keys or wait for reset

### Stop preview

```bash
docker-compose down
```

## Development vs Live Preview

| Mode | Command | Use case |
|------|---------|----------|
| **Live preview** | `docker-compose up -d` (from root) | Full stack in Docker, production-like |
| **Backend only** | `cd backend && docker-compose up -d` | API + DB + Chroma, frontend via `npm run dev` |
| **Frontend dev** | `cd frontend && npm run dev` | Hot reload, proxies to backend on 8000 |
