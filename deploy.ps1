# ParkPlaza Production Deployment Script for Windows PowerShell

Write-Host "🚀 ParkPlaza Production Deployment" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Check if required tools are installed
Write-Host "🔍 Checking required tools..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 16+" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

# Backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
npm ci --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend dependency installation failed" -ForegroundColor Red
    exit 1
}

# Frontend dependencies and build
Write-Host "Installing frontend dependencies and building..." -ForegroundColor Cyan
Set-Location ..\frontend
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
    exit 1
}

# Build frontend
Write-Host "Building frontend for production..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1
}

# Return to root directory
Set-Location ..

Write-Host ""
Write-Host "🔧 Environment Configuration Check..." -ForegroundColor Yellow

# Check if production environment files exist
$backendEnv = "backend\.env.production"
$frontendEnv = "frontend\.env.production"

if (!(Test-Path $backendEnv)) {
    Write-Host "⚠️  Warning: $backendEnv not found. Please create it with production settings." -ForegroundColor Yellow
}

if (!(Test-Path $frontendEnv)) {
    Write-Host "⚠️  Warning: $frontendEnv not found. Please create it with production settings." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧪 Running tests..." -ForegroundColor Yellow

# Run backend tests (if available)
if (Test-Path "backend\package.json") {
    Write-Host "Running backend tests..." -ForegroundColor Cyan
    Set-Location backend
    npm test --if-present
    Set-Location ..
}

# Run frontend tests (if available)
if (Test-Path "frontend\package.json") {
    Write-Host "Running frontend tests..." -ForegroundColor Cyan
    Set-Location frontend
    $env:CI = "true"
    npm test --if-present --watchAll=false
    Set-Location ..
}

Write-Host ""
Write-Host "✅ Deployment preparation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps for production deployment:" -ForegroundColor Yellow
Write-Host "1. Configure production environment variables" -ForegroundColor White
Write-Host "2. Set up MongoDB connection" -ForegroundColor White
Write-Host "3. Configure payment gateways (Stripe/Razorpay)" -ForegroundColor White
Write-Host "4. Set up Cloudinary for image hosting" -ForegroundColor White
Write-Host "5. Configure email service" -ForegroundColor White
Write-Host "6. Deploy to your hosting platform (AWS, Azure, GCP, etc.)" -ForegroundColor White
Write-Host ""
Write-Host "🌐 For local production testing:" -ForegroundColor Cyan
Write-Host "1. Backend: cd backend && npm start" -ForegroundColor White
Write-Host "2. Frontend: Serve the build folder using a web server" -ForegroundColor White
Write-Host ""

# Create production start script
$productionScript = @"
# Production start script
Write-Host "Starting ParkPlaza in production mode..." -ForegroundColor Green

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; `$env:NODE_ENV='production'; npm start"

Write-Host "Backend started on http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend build is ready to be served by a web server" -ForegroundColor Cyan
"@

$productionScript | Out-File -FilePath "start-production.ps1" -Encoding UTF8

Write-Host "📝 Created start-production.ps1 script" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Ready for production deployment!" -ForegroundColor Green
