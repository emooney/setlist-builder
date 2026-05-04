$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
  param(
    [string]$Name,
    [string]$InstallHint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required. $InstallHint"
  }
}

function Convert-Version {
  param([string]$RawVersion)
  return [version]($RawVersion.Trim().TrimStart("v"))
}

Write-Step "Checking prerequisites"
Assert-Command "node" "Install Node 22 LTS from https://nodejs.org/ or use nvm-windows."
Assert-Command "npm" "Install npm with Node.js."

$nodeVersion = Convert-Version (node --version)
if ($nodeVersion.Major -lt 22 -or $nodeVersion.Major -ge 25) {
  throw "Node $nodeVersion is installed, but this app expects Node >=22 and <25. Run nvm use 22 or install Node 22 LTS."
}

$npmVersion = Convert-Version (npm --version)
if ($npmVersion.Major -lt 10) {
  throw "npm $npmVersion is installed, but this app expects npm >=10."
}

Write-Host "Node $nodeVersion"
Write-Host "npm $npmVersion"

Write-Step "Installing dependencies"
npm install

Write-Step "Preparing environment file"
if (-not (Test-Path ".env.local")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env.local"
    Write-Host "Created .env.local from .env.example."
  } else {
    @"
DATABASE_URL="file:./dev.db"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"
"@ | Set-Content ".env.local"
    Write-Host "Created .env.local."
  }
} else {
  Write-Host ".env.local already exists; leaving it unchanged."
}

Write-Step "Initializing Prisma"
npx prisma generate

try {
  npx prisma migrate dev --name init
} catch {
  Write-Host "Prisma migrate failed; trying prisma db push instead." -ForegroundColor Yellow
  npx prisma db push
}

$envContent = Get-Content ".env.local" -Raw
if ($envContent -match 'GOOGLE_CLIENT_ID=""' -or $envContent -match 'GOOGLE_CLIENT_SECRET=""') {
  Write-Host ""
  Write-Host "Google Drive export needs credentials in .env.local before Connect Drive will work:" -ForegroundColor Yellow
  Write-Host "  GOOGLE_CLIENT_ID"
  Write-Host "  GOOGLE_CLIENT_SECRET"
  Write-Host "  GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback"
}

Write-Step "Starting Setlist Builder"
Write-Host "Open http://localhost:3000 after the dev server starts."
npm run dev
