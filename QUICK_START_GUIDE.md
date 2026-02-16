# Quick Start Guide

Multi-Agent Autonomous Software Development Platform.
Branch: `mariena-new`

---

## Prerequisites

| Tool                  | Minimum version | Check with                                            |
| --------------------- | --------------- | ----------------------------------------------------- |
| Docker Desktop        | 20+             | `docker --version`                                  |
| Docker Compose        | 2.x             | `docker compose version`                            |
| Node.js               | 18+             | `node -v`                                           |
| npm                   | 9+              | `npm -v`                                            |
| Google Gemini API key | --              | [Get one here](https://makersuite.google.com/app/apikey) |

> **Python is NOT required locally.** The backend runs entirely inside Docker (Python 3.11).

---

## Step 0 -- Clone the repo ignore if you already have it. but checkout mariena-new anyways

```bash
git clone https://github.com/githubphilomath/main-project.git
cd main-project
git checkout mariena-new
```

---

## Step 1 -- Backend environment file

```bash
cd backend
cp env.example .env
```

Open `backend/.env` and replace the placeholder API key:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Leave everything else at the defaults. The key settings are:

| Variable           | Default                                                          | Notes                                             |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------- |
| `GEMINI_API_KEY` | (you must set this)                                              | Google AI Studio API key                          |
| `GEMINI_MODEL`   | `gemini-2.5-flash`                                             | Can also use `gemini-2.5-pro` (slower, smarter) |
| `DATABASE_URL`   | `postgresql://postgres:postgres@localhost:5432/agent_platform` | Used by local scripts only; Docker overrides this |
| `CHROMA_PORT`    | `8010`                                                         | Host port for ChromaDB (8000 is used by the API)  |

---

## Step 2 -- Start the backend (Docker)

From the project root:

```bash
./run-backend.sh
```

Or manually:

```bash
cd backend
docker compose up -d postgres chroma api
```

This starts three containers:

| Container                   | Port | What it does           |
| --------------------------- | ---- | ---------------------- |
| `agent_platform_postgres` | 5432 | PostgreSQL 15 database |
| `agent_platform_chroma`   | 8010 | ChromaDB vector store  |
| `agent_platform_api`      | 8000 | FastAPI backend        |

**First run** takes 2-3 minutes (Docker builds the image and installs Python packages).
Subsequent starts take ~10 seconds.

### Verify the backend is running

Wait 30 seconds, then:

```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy"}
```

Or open http://localhost:8000/docs in a browser to see the Swagger UI.

---

## Step 3 -- Start the frontend

```bash
cd frontend
npm install          # first time only
cp .env.example .env # first time only
npm run dev
```

The frontend starts at **http://localhost:3000**.

---

## Step 4 -- Use the app

1. Open http://localhost:3000
2. Type a project description in the chat panel, e.g.:`create a tic tac toe game in python`
3. Press Enter (or click Send)
4. Watch the agents work in real-time:
   - **Left panel**: Chat with live "thinking" indicators and agent summaries
   - **Center panel**: Generated code files (click a file to view)
   - **Right panel**: Agent execution status with progress bar

A full run takes 3-8 minutes depending on project complexity and Gemini API latency.

---

## Stopping everything

```bash
# Stop all containers (keeps data)
cd backend
docker compose stop

# Stop and remove containers + volumes (clean slate)
cd backend
docker compose down -v
```

To stop the frontend, press `Ctrl+C` in the terminal running `npm run dev`.

---

## Troubleshooting

### Backend won't start / API unhealthy

**Check container status:**

```bash
cd backend
docker compose ps
```

All three containers should show `Up`. If `agent_platform_api` shows `Restarting` or `Exited`:

```bash
docker compose logs api --tail 50
```

**Common causes:**

| Symptom                      | Cause                    | Fix                                                                                    |
| ---------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `ModuleNotFoundError`      | Image not built          | `docker compose build api` then `docker compose up -d api`                         |
| `GEMINI_API_KEY` error     | Missing or invalid key   | Check `backend/.env` has a valid key                                                 |
| `port 5432 already in use` | Local PostgreSQL running | Stop it:`brew services stop postgresql` or change the port in `docker-compose.yml` |
| `port 8000 already in use` | Another process on 8000  | `lsof -i :8000` to find it, then kill or change port                                 |

### "Orchestrator stuck" / workflow never progresses

**Check API logs:**

```bash
cd backend
docker compose logs api --tail 100
```

| Log message                               | Cause                    | Fix                                                                                                                 |
| ----------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `404 models/gemini-pro is not found`    | Outdated model name      | Set `GEMINI_MODEL=gemini-2.5-flash` in `backend/.env`, then `docker compose restart api`                      |
| `404 models/embedding-001 is not found` | Outdated embedding model | Already fixed in code (`gemini-embedding-001`). If still appearing: `docker compose up -d --force-recreate api` |
| `Recursion limit of 25 reached`         | Graph never terminated   | Already fixed (limit raised to 50, routing reordered). Rebuild:`docker compose up -d --force-recreate api`        |
| `Expecting value: line 1 column 1`      | JSON parsing failure     | Already fixed (`parse_json_response` strips markdown fences). Rebuild if needed.                                  |

### .env changes not taking effect

Docker Compose caches environment variables. A simple `restart` does NOT reload `.env`:

```bash
# WRONG -- does not reload .env
docker compose restart api

# CORRECT -- recreates the container with fresh env
docker compose up -d --force-recreate api
```

### Frontend shows "No project output yet" even after completion

The frontend needs both `projectStatus` and `workflowState` to display output. If the status panel shows "completed" but the center is empty:

1. **Hard refresh** the browser: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)
2. The state poll may need a moment -- wait 5 seconds after completion
3. Check browser console for errors (`F12` > Console)

### Testing agent error: `'dict' object has no attribute 'file_path'`

This was a bug in the testing agent that accessed code artifacts as objects instead of dicts. It is fixed in the current code. If you still see it:

```bash
docker compose up -d --force-recreate api
```

### Code viewer shows black/unreadable text

Fixed in the current frontend code. Hard refresh the browser if you still see it.

### Gemini API rate limits / 429 errors

The free tier of the Gemini API has rate limits. If you see `429 Resource Exhausted`:

- Wait 60 seconds and try again
- Use `gemini-2.5-flash` (higher rate limits than `gemini-2.5-pro`)
- Check your usage at https://console.cloud.google.com/apis/dashboard

---

## API Endpoints Reference

Base URL: `http://localhost:8000/api/v1`

| Method   | Endpoint                   | Description                                      |
| -------- | -------------------------- | ------------------------------------------------ |
| `POST` | `/projects`              | Create a new project                             |
| `GET`  | `/projects/{id}`         | Get project details                              |
| `POST` | `/projects/{id}/execute` | Start workflow (returns 202, runs in background) |
| `GET`  | `/projects/{id}/status`  | Get project status + progress                    |
| `GET`  | `/projects/{id}/state`   | Get full state with all artifacts                |
| `GET`  | `/projects/{id}/events`  | SSE stream of real-time agent events             |
| `GET`  | `/health`                | Health check                                     |

Full Swagger docs: http://localhost:8000/docs

---

## Architecture Overview

```
Browser (localhost:3000)
  |
  |  REST + SSE
  v
FastAPI (localhost:8000)          Docker container: agent_platform_api
  |         |
  |         +---> LangGraph workflow
  |                 |
  |                 +---> OrchestratorAgent
  |                 +---> RequirementAnalysisAgent  \
  |                 +---> ArchitectureAgent           |  each calls
  |                 +---> CodingAgent                 |  Gemini API
  |                 +---> DebuggingAgent              |  via LangChain
  |                 +---> TestingAgent                |
  |                 +---> DocumentationAgent          |
  |                 +---> DeploymentAgent           /
  |
  +---> PostgreSQL (localhost:5432)    Docker container: agent_platform_postgres
  |       stores projects, state, artifacts
  |
  +---> ChromaDB (localhost:8010)      Docker container: agent_platform_chroma
          vector store for RAG (knowledge base, project memory)
```

---

## File Structure

```
mainproject/
  backend/
    api/              FastAPI app + routes
    agents/           All 8 agent implementations
    core/             LangGraph workflow (graph.py, state.py)
    config/           Settings (settings.py)
    models/           DB models + Pydantic schemas
    rag/              ChromaDB RAG implementations
    services/         Business logic (project_service, workflow_service)
    scripts/          DB init script
    docker/           Dockerfile + entrypoint
    docker-compose.yml
    .env              Your local config (gitignored)
    env.example       Template for .env
    requirements.txt  Python dependencies
  frontend/
    src/
      components/     React components (chat, output, agents)
      hooks/          Custom hooks (useWorkflowStream)
      layouts/        Main three-panel layout
      services/       API client (api.ts)
      store/          Zustand global state
      types/          TypeScript type definitions
    .env              Frontend config (gitignored)
    .env.example      Template
  run-backend.sh      One-command backend startup
```
