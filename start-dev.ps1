# ParkPlaza Development Environment Starter
Write-Host "Starting ParkPlaza Development Environment..." -ForegroundColor Green
Write-Host ""

Write-Host "Opening 2 terminals for Backend and Frontend..." -ForegroundColor Yellow
Write-Host "Backend will run on http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend will run on http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

# Start backend in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait a moment
Start-Sleep -Seconds 3

# Start frontend in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host ""
Write-Host "Both services are starting..." -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
