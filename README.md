# Multi-Agent Autonomous Software Development Platform

A production-grade AI system that autonomously generates full working applications through specialized agents using LangGraph, FastAPI, and RAG systems.

## 🏗️ Project Structure

```
Agent_Mariena/
├── backend/          # Backend API and agent orchestration
│   ├── agents/       # 8 specialized AI agents
│   ├── api/          # FastAPI endpoints
│   ├── core/         # LangGraph workflow
│   ├── rag/          # RAG systems
│   └── ...
├── frontend/         # React frontend application
└── docker-compose.yml # Root orchestration
```

## ✨ Features

- 🤖 8 Specialized AI Agents for complete software development lifecycle
- 🔄 LangGraph-based workflow orchestration
- 📚 Triple RAG System (Knowledge Base, Project Memory, Version Control)
- 🚀 FastAPI REST API
- 💻 Modern React Frontend with real-time updates
- 🗄️ PostgreSQL + ChromaDB for persistent storage
- 🔍 Comprehensive logging and monitoring
- 🐳 Docker support

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Docker and Docker Compose
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

### Backend Setup

1. **Navigate to backend**:
   ```bash
   cd backend
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

3. **Start services**:
   ```bash
   docker-compose up -d postgres chroma
   ```

4. **Initialize database**:
   ```bash
   python -m scripts.init_db
   ```

5. **Start API**:
   ```bash
   uvicorn api.main:app --reload
   ```

### Frontend Setup

1. **Navigate to frontend**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Update VITE_API_URL if needed
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

   Frontend will be available at `http://localhost:3000`

### Using Root Docker Compose

From root directory:
```bash
docker-compose up -d
```

This starts both backend and frontend services.

## 📖 Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [Design Decisions](DESIGN_DECISIONS.md)
- [Setup Guide](SETUP.md)
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)

## 🔌 API Usage

### Create a Project

```bash
POST /api/v1/projects
{
  "name": "Todo App",
  "description": "A simple todo application",
  "requirements": "Create a web-based todo app with CRUD operations"
}
```

### Execute Workflow

```bash
POST /api/v1/projects/{project_id}/execute
```

### Check Status

```bash
GET /api/v1/projects/{project_id}/status
```

### API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧪 Testing

```bash
cd backend
pytest
```

## 📝 Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 🏛️ Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system design.

## 📄 License

MIT
