# Quick Start Guide

Multi-Agent Autonomous Software Development Platform.
Branch: `mariena-openai`

---

## Prerequisites

| Tool           | Minimum version | Check with             |
| -------------- | --------------- | ---------------------- |
| Docker Desktop | 20+             | `docker --version`     |
| Docker Compose | 2.x             | `docker compose version` |
| Node.js        | 18+             | `node -v`              |
| npm            | 9+              | `npm -v`               |

> **Python is NOT required locally.** The backend runs entirely inside Docker (Python 3.11).

### API keys you need

| Key | What it's for | Where to get it |
| --- | ------------- | --------------- |
| Azure OpenAI API key | Chat / code generation (GPT-4) | Azure Portal > your OpenAI resource > Keys |
| Azure OpenAI Endpoint | API endpoint URL | Azure Portal > your OpenAI resource > Overview |
| Gemini API key | Embeddings only (RAG vector search) | [Google AI Studio](https://makersuite.google.com/app/apikey) |

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/githubphilomath/main-project.git
cd main-project
git checkout mariena-openai
```

---

## Step 2 — Create the backend `.env` file

```bash
cd backend
cp env.example .env
```

Open `backend/.env` in any text editor and fill in your keys:

```env
# Azure OpenAI (for chat/code generation)
AZURE_OPENAI_API_KEY=paste_your_azure_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4

# Gemini (for embeddings/RAG only)
GEMINI_API_KEY=paste_your_gemini_key_here
EMBEDDING_MODEL=text-embedding-004
```

Leave everything else at the defaults.

> **Important:** If your brother/sister shares the `.env` file with you, just drop it into `backend/.env` and skip the editing. All keys are pre-filled.

---

## Step 3 — Start the backend (Docker)

Make sure Docker Desktop is running, then from the **project root**:

```bash
cd backend
docker compose up -d --build
```

This starts three containers:

| Container                 | Port | What it does           |
| ------------------------- | ---- | ---------------------- |
| `agent_platform_postgres` | 5432 | PostgreSQL 15 database |
| `agent_platform_chroma`   | 8010 | ChromaDB vector store  |
| `agent_platform_api`      | 8000 | FastAPI backend        |

**First run takes 3-5 minutes** (Docker builds the image and installs Python packages).
Subsequent starts take ~10 seconds.

### Verify the backend

Wait 30 seconds after the command finishes, then:

```bash
curl http://localhost:8000/health
```

You should see:
```json
{"status":"healthy"}
```

If it doesn't respond yet, wait another 15 seconds and try again.

---

## Step 4 — Start the frontend

Open a **new terminal** (keep the backend terminal open):

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The frontend starts at **http://localhost:3000**.

> `npm install` only needs to run the first time (or after pulling new changes).

---

## Step 5 — Use the app

1. Open **http://localhost:3000** in your browser
2. Type a project description, e.g.: `create a product management app` or `build a tic tac toe game`
3. Press Enter
4. Watch the agents work in real-time:
   - **Left panel** — Chat with live thinking indicators and agent progress
   - **Center panel** — Generated code files, docs, and full app preview
   - **Right panel** — Agent execution status with progress bar
5. When complete, click **"Full App"** to preview, or **"Download All"** to get a zip

A full run takes **2-8 minutes** depending on project complexity.

---

## Stopping everything

```bash
# Stop backend containers (keeps data)
cd backend
docker compose stop

# Stop and remove containers + data (clean slate)
cd backend
docker compose down -v
```

Stop the frontend by pressing `Ctrl+C` in the terminal running `npm run dev`.

---

## Restarting after a break

```bash
# Terminal 1: Start backend
cd backend
docker compose up -d

# Terminal 2: Start frontend
cd frontend
npm run dev
```

No need to rebuild or reinstall unless you pulled new code.

---

## Troubleshooting

### Docker not running

If you see `Cannot connect to the Docker daemon`:
- Open **Docker Desktop** and wait until it shows "Running"
- Then retry the `docker compose` commands

### Backend won't start / API unhealthy

```bash
cd backend
docker compose ps        # Check container status
docker compose logs api --tail 50   # Check API logs
```

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| Container keeps restarting | Bad `.env` or missing key | Check `backend/.env` has valid keys |
| `port 5432 already in use` | Local PostgreSQL running | `brew services stop postgresql` or change port |
| `port 8000 already in use` | Something else on 8000 | `lsof -i :8000` then kill the process |

### "Content filter" or empty code files

Azure OpenAI's content filter sometimes blocks requests. The code has a built-in fallback that sanitizes the prompt and retries. If it still fails:
- Check `docker compose logs api --tail 50` for `content_filter` errors
- Try a simpler project description (e.g., "todo list app" instead of complex apps)

### `.env` changes not taking effect

Docker caches environment variables. `restart` does NOT reload `.env`:

```bash
# WRONG
docker compose restart api

# CORRECT — recreates with fresh env
docker compose up -d --force-recreate api
```

### Frontend shows "No project output yet"

- **Hard refresh** the browser: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)
- Wait 5 seconds after workflow completes for state to sync
- Check browser console (`F12` > Console) for errors

### npm install fails

```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
```

---

## Quick reference

| What | Command |
| ---- | ------- |
| Start backend | `cd backend && docker compose up -d` |
| Rebuild backend after code changes | `cd backend && docker compose up -d --build api` |
| Start frontend | `cd frontend && npm run dev` |
| Check backend health | `curl http://localhost:8000/health` |
| View backend logs | `cd backend && docker compose logs api --tail 50` |
| Stop everything | Backend: `docker compose stop` / Frontend: `Ctrl+C` |
| Clean restart | `cd backend && docker compose down -v && docker compose up -d --build` |

---

## Architecture Overview

```
Browser (localhost:3000)
  │
  │  REST + SSE (Server-Sent Events)
  ▼
FastAPI (localhost:8000)          Docker: agent_platform_api
  │         │
  │         └──→ LangGraph workflow
  │                 │
  │                 ├──→ OrchestratorAgent
  │                 ├──→ RequirementAnalysisAgent  ╲
  │                 ├──→ ArchitectureAgent           │  each calls
  │                 ├──→ CodingAgent                 │  Azure OpenAI (GPT-4)
  │                 ├──→ DebuggingAgent              │
  │                 ├──→ TestingAgent                │
  │                 ├──→ DocumentationAgent          │
  │                 └──→ DeploymentAgent           ╱
  │
  ├──→ PostgreSQL (localhost:5432)    Docker: agent_platform_postgres
  │       stores projects, state, chat history
  │
  └──→ ChromaDB (localhost:8010)      Docker: agent_platform_chroma
          vector store for RAG (uses Gemini embeddings)
```
