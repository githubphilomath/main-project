# Quick Start Guide

## Why Can't I See the Frontend?

If you can't see the frontend, follow these steps:

### Step 1: Install Dependencies ✅ (Already Done)

Dependencies have been installed. You should see a `node_modules` folder.

### Step 2: Start the Development Server

Open a terminal in the `frontend` directory and run:

```bash
cd frontend
npm run dev
```

You should see output like:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Step 3: Open in Browser

Open your browser and go to:
**http://localhost:3000**

### Step 4: Make Sure Backend is Running

The frontend needs the backend API to be running. In another terminal:

```bash
cd backend
uvicorn api.main:app --reload
```

The backend should be available at `http://localhost:8000`

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, Vite will automatically use the next available port (3001, 3002, etc.). Check the terminal output for the actual URL.

### Cannot Connect to Backend

1. Make sure backend is running on `http://localhost:8000`
2. Check `frontend/.env` file has correct `VITE_API_URL`
3. Check browser console for CORS errors

### Blank Page

1. Check browser console for errors (F12)
2. Make sure all dependencies are installed: `npm install`
3. Try clearing browser cache
4. Check that `src/main.tsx` and `src/App.tsx` exist

### Build Errors

If you see TypeScript or build errors:

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Common Issues

### "Cannot find module"
- Run `npm install` again
- Delete `node_modules` and reinstall

### "Port 3000 already in use"
- Stop other applications using port 3000
- Or change port in `vite.config.ts`

### "Network Error" or "CORS Error"
- Make sure backend is running
- Check backend CORS settings allow `http://localhost:3000`
- Verify `VITE_API_URL` in `.env` file

## Verify Installation

Check these files exist:
- ✅ `frontend/package.json`
- ✅ `frontend/src/main.tsx`
- ✅ `frontend/src/App.tsx`
- ✅ `frontend/index.html`
- ✅ `frontend/node_modules` (folder)

## Next Steps

Once the frontend is running:

1. Open http://localhost:3000
2. You should see the three-panel layout
3. Type a project idea in the chat panel (left)
4. Watch the agents work in the right panel
5. See generated files in the center panel

## Need Help?

Check:
- Browser console (F12) for errors
- Terminal output for build errors
- Backend logs for API errors
- Network tab in browser DevTools

