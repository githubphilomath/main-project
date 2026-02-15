#!/bin/bash
# Start full backend (Postgres + Chroma + API) with Docker.
# API will be at http://localhost:8000
# Ensure backend/.env exists with GEMINI_API_KEY.
set -e
cd "$(dirname "$0")/backend"
docker-compose up -d postgres chroma api
echo ""
echo "Backend starting. Wait ~30s then check:"
echo "  Health: http://localhost:8000/health"
echo "  Docs:   http://localhost:8000/docs"
echo ""
echo "Frontend: cd frontend && npm install && npm run dev  → http://localhost:3000"
