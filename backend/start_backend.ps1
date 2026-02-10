# PowerShell script to start the backend server
# Run this script: .\start_backend.ps1

Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Navigate to backend directory
Set-Location $PSScriptRoot

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Check if dependencies are installed
if (-not (Test-Path "venv\Scripts\uvicorn.exe")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Copy env.example to .env and add your GEMINI_API_KEY" -ForegroundColor Yellow
    Write-Host ""
}

# Start the server
Write-Host "Starting uvicorn server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

