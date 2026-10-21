# =====================================================================
#  EstateFlow — build the production release package
#
#  Produces a  release/  folder that contains ONLY deployable
#  artifacts (compiled Spring Boot JAR, built frontend bundle,
#  compose file, .env template). Copy that folder to the server —
#  no source code (src/, pom.xml, package.json) leaves this machine.
#
#  Usage (PowerShell, from the project root):
#
#    .\build-release.ps1 -ApiBaseUrl "http://<SERVER_IP>:8081"
#
#  -ApiBaseUrl is baked into the frontend bundle at build time and
#  must be the address users' browsers will call (same value as
#  VITE_API_BASE_URL in the server's .env).
# =====================================================================

param(
    [Parameter(Mandatory = $false)]
    [string]$ApiBaseUrl = "http://localhost:8081"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host ""
Write-Host "=== EstateFlow release build ===" -ForegroundColor Cyan
Write-Host "Frontend API base URL: $ApiBaseUrl"
Write-Host ""

# ---------------------------------------------------------------------
# 1. Backend — compile the executable Spring Boot JAR
# ---------------------------------------------------------------------

Write-Host ">>> [1/4] Packaging the Spring Boot JAR (tests skipped)..." -ForegroundColor Yellow

& .\mvnw.cmd -q -DskipTests package

if ($LASTEXITCODE -ne 0) {
    throw "Maven package failed. Fix the build errors and re-run."
}

$jar = Get-ChildItem -Path "target" -Filter "*.jar" |
    Where-Object { $_.Name -notlike "*original*" } |
    Select-Object -First 1

if (-not $jar) {
    throw "No executable JAR found in target/ after packaging."
}

Write-Host "    JAR: $($jar.Name) ($([math]::Round($jar.Length / 1MB, 1)) MB)" -ForegroundColor Green

# ---------------------------------------------------------------------
# 2. Frontend — build the static bundle (Vite inlines the API URL)
# ---------------------------------------------------------------------

Write-Host ">>> [2/4] Building the React bundle..." -ForegroundColor Yellow

Push-Location "estateflow-frontend"

$env:VITE_API_BASE_URL = $ApiBaseUrl

& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    Pop-Location
    throw "Frontend build failed. Fix the build errors and re-run."
}

Pop-Location

Write-Host "    dist/ built with VITE_API_BASE_URL=$ApiBaseUrl" -ForegroundColor Green

# ---------------------------------------------------------------------
# 3. Stage the release package
# ---------------------------------------------------------------------

Write-Host ">>> [3/4] Staging the release package..." -ForegroundColor Yellow

$release = Join-Path $root "release"

if (Test-Path $release) {
    Remove-Item $release -Recurse -Force
}

New-Item -ItemType Directory -Path (Join-Path $release "backend") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $release "frontend") | Out-Null

# Backend: executable JAR + its Dockerfile (runtime only)
Copy-Item $jar.FullName (Join-Path $release "backend\app.jar")
Copy-Item (Join-Path $root "docker\backend-jar.Dockerfile") (Join-Path $release "backend\Dockerfile")

# Frontend: built bundle + nginx config + its Dockerfile
Copy-Item (Join-Path $root "docker\frontend-dist.Dockerfile") (Join-Path $release "frontend\Dockerfile")
Copy-Item (Join-Path $root "estateflow-frontend\nginx.conf") (Join-Path $release "frontend\nginx.conf")
Copy-Item (Join-Path $root "estateflow-frontend\dist") (Join-Path $release "frontend\dist") -Recurse

# Orchestration + configuration template
Copy-Item (Join-Path $root "docker-compose.prod.yml") $release
Copy-Item (Join-Path $root ".env.example") $release

# ---------------------------------------------------------------------
# 4. Summary
# ---------------------------------------------------------------------

Write-Host ">>> [4/4] Release package ready:" -ForegroundColor Yellow

Get-ChildItem $release -Recurse -File |
    ForEach-Object {
        $relative = $_.FullName.Substring($release.Length + 1)
        Write-Host ("    {0,-45} {1,8:N0} KB" -f $relative, ($_.Length / 1KB))
    }

Write-Host ""
Write-Host "=== NEXT STEPS (copy the release/ folder to the server) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  scp -r release/* root@<SERVER_IP>:/opt/estateflow/"
Write-Host ""
Write-Host "  Then on the server:"
Write-Host "    cd /opt/estateflow"
Write-Host "    cp .env.example .env      # then edit: DB_PASSWORD, JWT_SECRET,"
Write-Host "                              # VITE_API_BASE_URL=$ApiBaseUrl, CORS_ALLOWED_ORIGINS"
Write-Host "    docker compose -f docker-compose.prod.yml up -d"
Write-Host ""
Write-Host "NOTE: if the server .env value differs from the -ApiBaseUrl used here,"
Write-Host "      re-run this script so the bundle and .env agree." -ForegroundColor Magenta
Write-Host ""
