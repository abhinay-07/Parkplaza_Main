@echo off
echo Starting ParkPlaza Development Environment...
echo.

echo Opening 2 terminals for Backend and Frontend...
echo Backend will run on http://localhost:5000
echo Frontend will run on http://localhost:3000
echo.

REM Open backend terminal
start "ParkPlaza Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment
timeout /t 3 /nobreak > nul

REM Open frontend terminal
start "ParkPlaza Frontend" cmd /k "cd frontend && npm start"

echo.
echo Both services are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause
