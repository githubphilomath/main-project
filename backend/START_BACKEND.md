# How to Start the Backend Server

## The Problem

If you see this error:
```
uvicorn : The term 'uvicorn' is not recognized
```

It means:
1. Python virtual environment is not activated, OR
2. Dependencies are not installed

## Solution 1: Use the Startup Script (Easiest) ✅

### Windows PowerShell:
```powershell
cd backend
.\start_backend.ps1
```

### Windows Command Prompt:
```cmd
cd backend
start_backend.bat
```

The script will:
- ✅ Create virtual environment if needed
- ✅ Activate it automatically
- ✅ Install dependencies if needed
- ✅ Start the server

## Solution 2: Manual Steps

### Step 1: Navigate to Backend
```powershell
cd backend
```

### Step 2: Create Virtual Environment (if needed)
```powershell
python -m venv venv
```

### Step 3: Activate Virtual Environment

**PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

**Command Prompt:**
```cmd
venv\Scripts\activate.bat
```

**Git Bash:**
```bash
source venv/Scripts/activate
```

You should see `(venv)` in your prompt.

### Step 4: Install Dependencies
```powershell
pip install -r requirements.txt
```

### Step 5: Start Server
```powershell
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

## Verify It's Working

1. **Check terminal output:**
   ```
   INFO:     Uvicorn running on http://0.0.0.0:8000
   INFO:     Application startup complete.
   ```

2. **Test in browser:**
   - http://localhost:8000/health
   - Should show: `{"status":"healthy"}`

3. **API Documentation:**
   - http://localhost:8000/docs

## Common Issues

### "python: command not found"
- Install Python 3.10+ from python.org
- Make sure Python is in your PATH

### "Permission denied" (PowerShell)
- Run PowerShell as Administrator
- Or set execution policy:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### "Module not found" errors
- Make sure virtual environment is activated
- Run `pip install -r requirements.txt` again

### Port 8000 already in use
- Stop other applications using port 8000
- Or change port: `--port 8001`

## Quick Reference

**Activate venv:**
```powershell
.\venv\Scripts\Activate.ps1
```

**Install dependencies:**
```powershell
pip install -r requirements.txt
```

**Start server:**
```powershell
uvicorn api.main:app --reload
```

**Deactivate venv:**
```powershell
deactivate
```

