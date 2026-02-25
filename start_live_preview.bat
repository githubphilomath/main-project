@echo off
REM Live Preview - Full-Stack Application
REM Starts frontend, backend API, PostgreSQL, ChromaDB in production-like Docker setup.

cd /d "%~dp0"

echo === Multi-Agent Platform - Live Preview ===
echo.

docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Start Docker Desktop and try again.
    exit /b 1
)

echo Building and starting all services...
docker-compose up -d --build

if errorlevel 1 (
    echo Failed to start services.
    exit /b 1
)

echo.
echo === Live Preview Ready ===
echo.
echo   Frontend:    http://localhost:3000
echo   API:         http://localhost:8000
echo   API Health:  http://localhost:8000/health
echo.
echo All features available: create project, execute AI workflow, view outputs.
echo Ensure backend/.env has AZURE_OPENAI_API_KEY ^(mariena-openai^) or GEMINI keys ^(mariena-new^).
echo.
echo Stop: docker-compose down
