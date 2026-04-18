@echo off
TITLE WTE Rotterdam Dashboard

REM ── Step 1: Copy .env if missing ─────────────────────────────────────────
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo [INFO] Created backend\.env from example. Edit it if your data path differs.
)

REM ── Step 2: Install backend deps ─────────────────────────────────────────
echo [INFO] Installing Python dependencies...
cd backend
pip install -r requirements.txt -q
cd ..

REM ── Step 3: Install frontend deps ────────────────────────────────────────
echo [INFO] Installing Node dependencies...
cd frontend
call npm install --silent
cd ..

REM ── Step 4: Start backend in background ──────────────────────────────────
echo [INFO] Starting FastAPI backend on http://localhost:8000 ...
start "WTE Backend" cmd /k "cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM ── Step 5: Wait for backend to be ready ─────────────────────────────────
timeout /t 4 /nobreak >nul

REM ── Step 6: Start frontend ───────────────────────────────────────────────
echo [INFO] Starting React frontend on http://localhost:5173 ...
start "WTE Frontend" cmd /k "cd frontend && npm run dev"

REM ── Step 7: Open browser ─────────────────────────────────────────────────
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ====================================================
echo  WTE Rotterdam Dashboard is running!
echo  Frontend : http://localhost:5173
echo  API docs : http://localhost:8000/docs
echo  WebSocket: ws://localhost:8000/ws/live
echo ====================================================
