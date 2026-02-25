# Live Preview - Full-Stack Application
# Starts frontend, backend API, PostgreSQL, ChromaDB in production-like Docker setup.
# Requires: Docker Desktop running

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== Multi-Agent Platform - Live Preview ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker
try {
    docker info | Out-Null
} catch {
    Write-Host "ERROR: Docker is not running. Start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "Building and starting all services..." -ForegroundColor Yellow
docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start services." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Live Preview Ready ===" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  API:         http://localhost:8000" -ForegroundColor White
Write-Host "  API Health:  http://localhost:8000/health" -ForegroundColor White
Write-Host ""
Write-Host "All features available: create project, execute AI workflow, view outputs." -ForegroundColor Gray
Write-Host "Ensure backend/.env has AZURE_OPENAI_API_KEY (mariena-openai) or GEMINI keys (mariena-new)." -ForegroundColor Gray
Write-Host ""
Write-Host "Stop: docker-compose down" -ForegroundColor Gray
