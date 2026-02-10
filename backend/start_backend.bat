@echo off
REM Batch script to start the backend server
REM Double-click this file or run: start_backend.bat

echo Starting Backend Server...
echo.

REM Navigate to backend directory
cd /d "%~dp0"

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if dependencies are installed
if not exist "venv\Scripts\uvicorn.exe" (
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Check if .env exists
if not exist ".env" (
    echo Warning: .env file not found!
    echo Copy env.example to .env and add your GEMINI_API_KEY
    echo.
)

REM Start the server
echo Starting uvicorn server on http://localhost:8000
echo Press Ctrl+C to stop
echo.

uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

pause

