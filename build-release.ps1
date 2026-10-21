# =====================================================================
#  EstateFlow — build the production release package (BACKEND ONLY)
#
#  Deployment topology:
#    - Backend (Spring Boot JAR + PostgreSQL) → your VPS via Docker
#    - Frontend (React)                       → Vercel
#
#  The VPS therefore receives ONLY backend artifacts:
#
#    release/
#      backend/app.jar         compiled executable JAR (all deps inside)
#      backend/Dockerfile      JRE 17 runtime, no Maven, no source
#      docker-compose.prod.yml db + api (+ optional Caddy for HTTPS)
#      Caddyfile.example       HTTPS reverse-proxy template
#      .env.example
#
#  No source code (src/, pom.xml) ever leaves this machine, and the
#  frontend is NOT staged here — Vercel builds it from the GitHub repo.
#
#  Usage (PowerShell, from the project root):
#
#    .\build-release.ps1
# =====================================================================

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host ""
Write-Host "=== EstateFlow backend release build ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------
# 1. Backend — compile the executable Spring Boot JAR
# ---------------------------------------------------------------------

Write-Host ">>> [1/3] Packaging the Spring Boot JAR (tests skipped)..." -ForegroundColor Yellow

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
# 2. Stage the backend-only release package
# ---------------------------------------------------------------------

Write-Host ">>> [2/3] Staging the release package..." -ForegroundColor Yellow

$release = Join-Path $root "release"

if (Test-Path $release) {
    Remove-Item $release -Recurse -Force
}

New-Item -ItemType Directory -Path (Join-Path $release "backend") | Out-Null

# Compiled executable JAR + its runtime-only Dockerfile
Copy-Item $jar.FullName (Join-Path $release "backend\app.jar")
Copy-Item (Join-Path $root "docker\backend-jar.Dockerfile") (Join-Path $release "backend\Dockerfile")

# Orchestration + configuration templates
Copy-Item (Join-Path $root "docker-compose.prod.yml") $release
Copy-Item (Join-Path $root "Caddyfile.example") $release
Copy-Item (Join-Path $root ".env.example") $release

# ---------------------------------------------------------------------
# 3. Summary
# ---------------------------------------------------------------------

Write-Host ">>> [3/3] Release package ready:" -ForegroundColor Yellow

Get-ChildItem $release -Recurse -File |
    ForEach-Object {
        $relative = $_.FullName.Substring($release.Length + 1)
        Write-Host ("    {0,-40} {1,8:N0} KB" -f $relative, ($_.Length / 1KB))
    }

Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Copy the backend package to the VPS:"
Write-Host "       scp -r release/* root@<SERVER_IP>:/opt/estateflow/"
Write-Host ""
Write-Host "  2. On the server:"
Write-Host "       cd /opt/estateflow"
Write-Host "       cp .env.example .env     # DB_PASSWORD, JWT_SECRET,"
Write-Host "                                # CORS_ALLOWED_ORIGINS=<vercel URL>"
Write-Host "       docker compose -f docker-compose.prod.yml up -d"
Write-Host ""
Write-Host "  3. Deploy the frontend on Vercel (repo import, root directory:"
Write-Host "     estateflow-frontend, VITE_API_BASE_URL=<API address>)"
Write-Host ""
Write-Host "NOTE: browsers block HTTP APIs called from the HTTPS Vercel site." -ForegroundColor Magenta
Write-Host "      Serve the API over HTTPS (Caddy + a domain) before going live." -ForegroundColor Magenta
Write-Host ""
