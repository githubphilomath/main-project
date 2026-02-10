# Setup Guide

## Prerequisites

- Python 3.10 or higher
- Docker and Docker Compose
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

## Installation Steps

### 1. Clone and Setup Environment

```bash
# Clone the repository (if applicable)
cd Agent_Mariena

# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cd backend
cp env.example .env
```

Edit `.env` and set:
- `GEMINI_API_KEY`: Your Google Gemini API key
- `DATABASE_URL`: PostgreSQL connection string (default works with Docker)
- Other settings as needed

### 3. Start Infrastructure Services

Start PostgreSQL and ChromaDB:

```bash
# From backend directory
docker-compose up -d postgres chroma

# Or from root directory
docker-compose up -d postgres chroma
```

Wait for services to be healthy (check with `docker-compose ps`).

### 4. Initialize Database

```bash
cd backend
python -m scripts.init_db
```

This creates the necessary database tables.

### 5. Start the API Server

```bash
cd backend

# Development mode
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Or using Docker Compose (from backend directory)
docker-compose up
```

### 6. Verify Installation

```bash
# Health check
curl http://localhost:8000/health

# API docs
open http://localhost:8000/docs
```

### 7. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 8. Full Stack Development

To run both backend and frontend:

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn api.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Or use Docker Compose from root:
```bash
docker-compose up
```

## Usage Example

### Create a Project

```bash
curl -X POST "http://localhost:8000/api/v1/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Todo App",
    "description": "A simple todo application",
    "requirements": "Create a web-based todo app with CRUD operations"
  }'
```

### Execute Workflow

```bash
# Replace {project_id} with the ID from the create response
curl -X POST "http://localhost:8000/api/v1/projects/{project_id}/execute"
```

### Check Status

```bash
curl "http://localhost:8000/api/v1/projects/{project_id}/status"
```

### Stream Execution

```bash
curl "http://localhost:8000/api/v1/projects/{project_id}/stream"
```

## Troubleshooting

### ChromaDB Connection Issues

- Ensure ChromaDB is running: `docker-compose ps`
- Check ChromaDB logs: `docker-compose logs chroma`
- Verify `CHROMA_HOST` and `CHROMA_PORT` in `.env`

### Database Connection Issues

- Ensure PostgreSQL is running: `docker-compose ps`
- Check PostgreSQL logs: `docker-compose logs postgres`
- Verify `DATABASE_URL` in `.env`
- Try reinitializing: `python -m scripts.init_db`

### Gemini API Issues

- Verify your API key is correct
- Check API quota/limits
- Ensure `GEMINI_API_KEY` is set in `.env`

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

