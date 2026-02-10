# Network Error Troubleshooting Guide

## Common Causes of Network Errors

### 1. Backend Not Running ⚠️ (Most Common)

The frontend needs the backend API to be running. Check:

```bash
# In a separate terminal, start the backend:
cd backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify backend is running:**
- Open http://localhost:8000/health in your browser
- Should return: `{"status":"healthy"}`

### 2. Wrong API URL Configuration

Check your `.env` file in the `frontend` directory:

```bash
cd frontend
cat .env
```

Should contain:
```
VITE_API_URL=http://localhost:8000/api/v1
```

If missing or wrong, create/update it:
```bash
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env
```

**Important:** After changing `.env`, restart the dev server!

### 3. Port Conflicts

**Backend Port (8000):**
- Check if something else is using port 8000
- Windows: `netstat -ano | findstr :8000`
- Change backend port in `backend/.env` if needed

**Frontend Port (3000):**
- Vite will auto-use next available port (3001, 3002, etc.)
- Check terminal output for actual port

### 4. CORS Issues

The backend has CORS configured to allow all origins (`allow_origins=["*"]`), so this shouldn't be an issue. But if you see CORS errors:

1. Make sure backend is running
2. Check browser console for specific CORS error
3. Verify backend CORS settings in `backend/api/main.py`

### 5. Database Not Initialized

If backend fails to start due to database:

```bash
cd backend
python -m scripts.init_db
```

### 6. Environment Variables Missing

Backend needs `.env` file:

```bash
cd backend
cp env.example .env
# Edit .env and add your GEMINI_API_KEY
```

## Quick Fix Steps

### Step 1: Check Backend Status
```bash
# Test backend health endpoint
curl http://localhost:8000/health
```

If this fails, backend is not running.

### Step 2: Start Backend
```bash
cd backend

# Make sure database is initialized
python -m scripts.init_db

# Start backend server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 3: Verify Frontend Config
```bash
cd frontend

# Check .env file
cat .env

# Should show:
# VITE_API_URL=http://localhost:8000/api/v1
```

### Step 4: Restart Frontend
```bash
cd frontend
npm run dev
```

## Browser Console Errors

Open browser DevTools (F12) and check Console tab:

### "Failed to fetch" or "Network Error"
- Backend not running
- Wrong API URL
- Port mismatch

### "CORS policy" error
- Backend CORS not configured
- Backend not running
- Wrong origin

### "404 Not Found"
- Wrong API endpoint URL
- Backend routes not matching

### "500 Internal Server Error"
- Backend error (check backend logs)
- Database connection issue
- Missing environment variables

## Testing API Connection

Test the API directly in browser:

1. **Health Check:**
   ```
   http://localhost:8000/health
   ```

2. **API Docs:**
   ```
   http://localhost:8000/docs
   ```

3. **Test Project Creation (in browser console):**
   ```javascript
   fetch('http://localhost:8000/api/v1/projects', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       name: 'Test',
       description: 'Test project',
       requirements: 'Test requirements'
     })
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error)
   ```

## Complete Startup Sequence

**Terminal 1 - Backend:**
```bash
cd backend
# Start database services (if using Docker)
docker-compose up -d postgres chroma

# Initialize database
python -m scripts.init_db

# Start API
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Browser:**
- Open http://localhost:3000
- Check browser console (F12) for errors
- Check Network tab to see API calls

## Still Having Issues?

1. **Check all services are running:**
   - Backend API: http://localhost:8000/health
   - Frontend: http://localhost:3000
   - Database: Check Docker containers

2. **Check logs:**
   - Backend terminal output
   - Browser console (F12)
   - Network tab in DevTools

3. **Verify file paths:**
   - `backend/api/main.py` exists
   - `frontend/src/services/api.ts` exists
   - `.env` files in both directories

4. **Common Windows Issues:**
   - Firewall blocking ports
   - Antivirus blocking connections
   - Port already in use

## Need More Help?

Share:
1. Browser console errors (F12 → Console)
2. Network tab errors (F12 → Network)
3. Backend terminal output
4. Frontend terminal output

