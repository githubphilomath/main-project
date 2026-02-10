# Quick Start Guide - Complete Setup

## ✅ What's Been Fixed

1. ✅ Virtual environment created
2. ✅ Dependencies installed (including uvicorn)
3. ✅ Backend server starting
4. ✅ Frontend `.env` file created

## 🚀 How to Start Everything

### Option 1: Use Startup Scripts (Easiest)

**Backend:**
```powershell
cd backend
.\start_backend.ps1
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## ✅ Verify Everything is Working

1. **Backend Health Check:**
   - Open: http://localhost:8000/health
   - Should show: `{"status":"healthy"}`

2. **Backend API Docs:**
   - Open: http://localhost:8000/docs
   - Should show Swagger UI

3. **Frontend:**
   - Open: http://localhost:3000
   - Should show the three-panel interface

## 🔧 If Backend Won't Start

### Check Virtual Environment is Activated

You should see `(venv)` in your terminal prompt. If not:

**PowerShell:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
```

**Command Prompt:**
```cmd
cd backend
venv\Scripts\activate.bat
```

### Check Dependencies

If uvicorn still not found:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Check .env File

Make sure backend has `.env` file:
```powershell
cd backend
if (-not (Test-Path .env)) {
    Copy-Item env.example .env
    Write-Host "Created .env - please add your GEMINI_API_KEY"
}
```

## 📝 Complete Startup Checklist

- [ ] Backend virtual environment activated (`(venv)` in prompt)
- [ ] Backend dependencies installed
- [ ] Backend `.env` file exists with `GEMINI_API_KEY`
- [ ] Backend server running (http://localhost:8000/health works)
- [ ] Frontend dependencies installed (`npm install` done)
- [ ] Frontend `.env` file exists
- [ ] Frontend dev server running (http://localhost:3000 works)

## 🎯 Next Steps

1. **Start Backend:**
   ```powershell
   cd backend
   .\start_backend.ps1
   ```

2. **Start Frontend** (in new terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open Browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs

4. **Test the Application:**
   - Type a project idea in the chat panel
   - Watch agents work in the right panel
   - See generated files in the center panel

## 🆘 Still Having Issues?

See:
- `backend/START_BACKEND.md` - Backend troubleshooting
- `frontend/NETWORK_ERROR_FIX.md` - Network error fixes
- `frontend/QUICK_START.md` - Frontend quick start

