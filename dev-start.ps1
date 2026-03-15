<#
.SYNOPSIS
    Launches the Voice Grocery List App backend and frontend for local development.

.DESCRIPTION
    Starts both the backend (Express API on port 3001) and frontend (Vite on port 5173)
    in separate terminal windows. Checks for prerequisites (Node.js, pnpm, .env files)
    before launching.

.EXAMPLE
    .\dev-start.ps1              # Start both backend and frontend
    .\dev-start.ps1 -BackendOnly # Start only the backend
    .\dev-start.ps1 -FrontendOnly # Start only the frontend
    .\dev-start.ps1 -Install     # Run pnpm install first, then start
#>

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$OcrOnly,
    [switch]$Install
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$OcrDir = Join-Path $ProjectRoot "ocr-service"

# --- Colors ---
function Write-Step($msg)    { Write-Host "▶ $msg" -ForegroundColor Cyan }
function Write-Ok($msg)      { Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info($msg)    { Write-Host "   $msg" -ForegroundColor Gray }

# --- Prerequisite checks ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Voice Grocery List - Dev Launcher" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Check Node.js
Write-Step "Checking Node.js..."
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Err "Node.js not found in PATH."
    Write-Info "Install from https://nodejs.org/ or via 'winget install OpenJS.NodeJS.LTS'"
    exit 1
}
$nodeVersion = & node --version 2>$null
Write-Ok "Node.js $nodeVersion found at $($nodePath.Source)"

# Check pnpm
Write-Step "Checking pnpm..."
$pnpmPath = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmPath) {
    Write-Warn "pnpm not found. Attempting to install via npm..."
    & npm install -g pnpm
    $pnpmPath = Get-Command pnpm -ErrorAction SilentlyContinue
    if (-not $pnpmPath) {
        Write-Err "Failed to install pnpm. Install manually: npm install -g pnpm"
        exit 1
    }
}
$pnpmVersion = & pnpm --version 2>$null
Write-Ok "pnpm v$pnpmVersion found"

# Check Python (for OCR Service)
Write-Step "Checking Python..."
$pythonPath = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonPath) {
    # Try python3
    $pythonPath = Get-Command python3 -ErrorAction SilentlyContinue
    if (-not $pythonPath) {
        Write-Warn "Python not found in PATH. OCR Service will not start."
        $global:HasPython = $false
    } else {
        Set-Alias python python3
        $global:HasPython = $true
    }
} else {
    $global:HasPython = $true
}

if ($global:HasPython) {
    $pythonVersion = & python --version 2>&1
    Write-Ok "Python found: $pythonVersion"
}

# --- Check .env files ---
Write-Step "Checking environment files..."

$backendEnv = Join-Path $BackendDir ".env"
if (Test-Path $backendEnv) {
    Write-Ok "Backend .env found"

    # Check critical env vars
    $envContent = Get-Content $backendEnv -Raw
    if ($envContent -notmatch "MONGODB_URI") {
        Write-Warn "MONGODB_URI not found in backend/.env — backend will fail to connect"
    }
    if ($envContent -match "OPENAI_API_KEY") {
        Write-Ok "OPENAI_API_KEY configured — Receipt AI features enabled"
    } else {
        Write-Warn "OPENAI_API_KEY not set — Receipt AI / RAG features will be disabled"
    }
} else {
    Write-Warn "No backend/.env file found!"
    Write-Info "Copy backend/.env.example to backend/.env and fill in your values."
    Write-Info "At minimum you need: MONGODB_URI"
}

$frontendEnv = Join-Path $ProjectRoot ".env"
if (Test-Path $frontendEnv) {
    Write-Ok "Frontend .env found"
} else {
    Write-Warn "No root .env file found — frontend will use default API URL (http://localhost:3001/api)"
}

# --- Install dependencies if requested ---
if ($Install) {
    Write-Host ""
    Write-Step "Installing dependencies..."

    Write-Info "Installing root (frontend) dependencies..."
    Push-Location $ProjectRoot
    & pnpm install
    Pop-Location

    Write-Info "Installing backend dependencies..."
    Push-Location $BackendDir
    & pnpm install
    Pop-Location

    if ($global:HasPython) {
        Write-Info "Installing OCR Service dependencies..."
        Push-Location $OcrDir
        & python -m pip install -r requirements.txt
        Pop-Location
    }

    Write-Ok "All dependencies installed"
}

# --- Check if node_modules exist ---
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Warn "Frontend node_modules not found. Run with -Install flag or run 'pnpm install' first."
}
if (-not (Test-Path (Join-Path $BackendDir "node_modules"))) {
    Write-Warn "Backend node_modules not found. Run with -Install flag or run 'cd backend && pnpm install' first."
}

# --- DNS connectivity check for MongoDB Atlas ---
$dnsFixNeeded = $false
Write-Step "Testing MongoDB Atlas DNS resolution..."
try {
    $srvTest = & node -e "const dns = require('dns'); dns.resolveSrv('_mongodb._tcp.cluster0.jjgjrts.mongodb.net', (err, addrs) => { if(err) { console.log('FAIL'); process.exit(1); } else { console.log('OK'); } })" 2>$null
    if ($srvTest -match "OK") {
        Write-Ok "MongoDB SRV DNS resolves with default DNS"
    } else {
        throw "SRV failed"
    }
} catch {
    Write-Warn "Router DNS can't resolve MongoDB SRV records. Trying Google DNS (8.8.8.8)..."
    $googleTest = & node -e "const dns = require('dns'); dns.setServers(['8.8.8.8','8.8.4.4']); dns.resolveSrv('_mongodb._tcp.cluster0.jjgjrts.mongodb.net', (err, addrs) => { if(err) { console.log('FAIL'); process.exit(1); } else { console.log('OK'); } })" 2>$null
    if ($googleTest -match "OK") {
        Write-Ok "Google DNS works — will inject DNS fix for backend"
        $dnsFixNeeded = $true

        # Create a preload script that sets DNS to Google before anything runs
        $dnsFixScript = Join-Path $BackendDir "_dns-fix.cjs"
        Set-Content -Path $dnsFixScript -Value "const dns = require('dns'); dns.setServers(['8.8.8.8', '8.8.4.4']);"
        Write-Info "Created $dnsFixScript"
    } else {
        Write-Err "Cannot resolve MongoDB Atlas DNS even with Google DNS."
        Write-Info "Check your internet connection and MongoDB Atlas cluster status."
    }
}

# --- Launch services ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Starting Services" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

if (-not $FrontendOnly -and -not $OcrOnly) {
    Write-Step "Starting Backend (Express API on port 3001)..."
    
    # Needs to be a string that successfully passes the absolute path of dnsFixScript using single quotes
    if ($dnsFixNeeded -and $null -ne $dnsFixScript) {
        $nodeOpts = "`$env:NODE_OPTIONS='--require `"$dnsFixScript`"'; "
    } else {
        $nodeOpts = ""
    }
    $backendCmd = "cd '$BackendDir'; ${nodeOpts}Write-Host ''; Write-Host '=== BACKEND (port 3001) ===' -ForegroundColor Cyan; Write-Host ''; pnpm dev"
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal
    Write-Ok "Backend launched in new terminal"
    Write-Info "API: http://localhost:3001/api/health"
    if ($dnsFixNeeded) {
        Write-Info "DNS fix applied: using Google DNS (8.8.8.8)"
    }
}

if (-not $BackendOnly -and -not $OcrOnly) {
    # Small delay so backend starts first
    if (-not $FrontendOnly -and -not $OcrOnly) {
        Start-Sleep -Seconds 2
    }

    Write-Step "Starting Frontend (Vite on port 5173)..."
    $frontendCmd = "cd '$ProjectRoot'; Write-Host ''; Write-Host '=== FRONTEND (port 5173) ===' -ForegroundColor Green; Write-Host ''; pnpm dev"
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal
    Write-Ok "Frontend launched in new terminal"
    Write-Info "App: http://localhost:5173"
}

if ($global:HasPython -and (-not $BackendOnly) -and (-not $FrontendOnly)) {
    Write-Step "Starting OCR Service (Port 8000)..."
    
    # Check if backend/.env has GOOGLE_CLOUD_API_KEY
    $hasVisionKey = $false
    if (Test-Path $backendEnv) {
        if ((Get-Content $backendEnv -Raw) -match "GOOGLE_CLOUD_API_KEY|GOOGLE_APPLICATION_CREDENTIALS") {
            $hasVisionKey = $true
        }
    }
    
    if (-not $hasVisionKey) {
        Write-Warn "⚠️ The OCR service requires Google Cloud Vision credentials."
        Write-Warn "Please add GOOGLE_CLOUD_API_KEY or GOOGLE_APPLICATION_CREDENTIALS to backend/.env"
    }

    # Load environment variables into the current session so Start-Process inherits them
    if (Test-Path $backendEnv) {
        Get-Content $backendEnv | Where-Object { $_ -match '^([^#]+?)=(.*)$' } | ForEach-Object {
            $name = $matches[1].Trim()
            $val = $matches[2].Trim()
            if ($val.StartsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
            elseif ($val.StartsWith("'")) { $val = $val.Substring(1, $val.Length - 2) }
            [Environment]::SetEnvironmentVariable($name, $val)
        }
    }

    $ocrCmd = "cd '$OcrDir'; Write-Host ''; Write-Host '=== OCR SERVICE (port 8000) ===' -ForegroundColor Yellow; Write-Host ''; python app.py"
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", $ocrCmd -WindowStyle Normal
    Write-Ok "OCR Service launched in new terminal"
    Write-Info "OCR: http://localhost:8000/health"
} else {
    if (-not $global:HasPython) {
        Write-Warn "Skipping OCR Service: Python not found."
    }
}

# --- Summary ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  All Services Launched!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
if (-not $FrontendOnly -and -not $OcrOnly) {
    Write-Host "  Backend API:  " -NoNewline; Write-Host "http://localhost:3001/api/health" -ForegroundColor Yellow
}
if (-not $BackendOnly -and -not $OcrOnly) {
    Write-Host "  Frontend App: " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Yellow
}
if ($global:HasPython -and (-not $BackendOnly) -and (-not $FrontendOnly)) {
    Write-Host "  OCR Service:  " -NoNewline; Write-Host "http://localhost:8000/health" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Close the terminal windows to stop the servers." -ForegroundColor Gray
Write-Host ""

# --- Debug tips ---
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host "  Debug Tips" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Test RAG query locally:" -ForegroundColor Gray
Write-Host '  cd backend' -ForegroundColor DarkYellow
Write-Host '  node scripts/localRagQuery.js -u <USER_ID> -q "How much did I spend on dairy?"' -ForegroundColor DarkYellow
Write-Host ""
Write-Host "  Re-run receipt embedding:" -ForegroundColor Gray
Write-Host '  cd backend' -ForegroundColor DarkYellow
Write-Host '  pnpm ingest:receipts' -ForegroundColor DarkYellow
Write-Host ""
Write-Host "  Run tests:" -ForegroundColor Gray
Write-Host '  cd backend' -ForegroundColor DarkYellow
Write-Host '  pnpm test' -ForegroundColor DarkYellow
Write-Host ""
