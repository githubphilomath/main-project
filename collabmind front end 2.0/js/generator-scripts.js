/**
 * Generator for Automation Scripts (Batch/Shell)
 */
window.ScriptGenerator = {
    generate: (config) => {
        const files = {};

        // 1. Windows Batch Script
        files['run_windows.bat'] = `@echo off
title ${config.name} - Automated Launcher
echo ===================================================
echo   Starting ${config.name} Automation
echo ===================================================
echo.

cd backend

:: Check if venv exists
if not exist "venv" (
    echo [1/3] Creating Python Virtual Environment...
    python -m venv venv
) else (
    echo [1/3] Virtual Environment found.
)

:: Activate venv
call venv\\Scripts\\activate

:: Install dependencies
echo [2/3] Installing Dependencies (this may take a moment)...
pip install -r requirements.txt > nul 2>&1
if %errorlevel% neq 0 (
    echo Error installing dependencies. Please check Python installation.
    pause
    exit
)

:: Start Backend in Background
echo [3/3] Launching System...
echo.
echo    Backend: http://localhost:8000
echo    Frontend: Launching in browser...
echo.

:: Start Uvicorn in a separate window
start "Backend Server" cmd /k "venv\\Scripts\\activate && uvicorn main:app --reload"

:: Wait a moment for server to spin up
timeout /t 5 > nul

:: Open Frontend (Served by Backend)
start http://localhost:8000/
start http://localhost:8000/docs

echo Done! You can close this window, but keep the Backend Server window open.
pause
`;

        // 2. Mac/Linux Shell Script
        files['run_mac_linux.sh'] = `#!/bin/bash
echo "==================================================="
echo "  Starting ${config.name} Automation"
echo "==================================================="
echo

cd backend

# Check/Create venv
if [ ! -d "venv" ]; then
    echo "[1/3] Creating Python Virtual Environment..."
    python3 -m venv venv
else
    echo "[1/3] Virtual Environment found."
fi

# Activate
source venv/bin/activate

# Install
echo "[2/3] Installing Dependencies..."
pip install -r requirements.txt > /dev/null

# Start Backend
echo "[3/3] Launching System..."

# Run uvicorn in background
uvicorn main:app --reload &
BACKEND_PID=$!

sleep 3

# Open Frontend
cd ../frontend
if [[ "$OSTYPE" == "darwin"* ]]; then
    open index.html
else
    xdg-open index.html
fi

echo "Backend running (PID: $BACKEND_PID)."
echo "Press Ctrl+C to stop."
wait $BACKEND_PID
`;

        return files;
    }
};
