$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$apiBaseUrl = $env:VITE_API_BASE_URL
if ([string]::IsNullOrWhiteSpace($apiBaseUrl) -or $apiBaseUrl -notmatch '^https://' -or $apiBaseUrl -match '^https?://(localhost|127\.0\.0\.1)(:\d+)?/?$') {
    throw "Set VITE_API_BASE_URL to the production HTTPS API hostname before creating production frontend assets."
}

Write-Host "Building backend and frontend release artifacts..." -ForegroundColor Cyan
& (Join-Path $root "build-release.ps1")

Push-Location (Join-Path $root "estateflow-frontend")
try {
    & npm run lint
    if ($LASTEXITCODE -ne 0) { throw "Frontend lint failed." }

    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
}
finally {
    Pop-Location
}

$frontendSource = Join-Path $root "estateflow-frontend\dist"
$frontendTarget = Join-Path $root "release\frontend"
if (-not (Test-Path -LiteralPath $frontendSource)) {
    throw "Frontend build output was not created."
}
if (Test-Path -LiteralPath $frontendTarget) {
    Remove-Item -LiteralPath $frontendTarget -Recurse -Force
}
New-Item -ItemType Directory -Path $frontendTarget | Out-Null
Copy-Item -Path (Join-Path $frontendSource "*") -Destination $frontendTarget -Recurse

Write-Host "Release ready at $((Join-Path $root 'release'))" -ForegroundColor Green
Get-ChildItem -LiteralPath (Join-Path $root "release") -Recurse -File |
    ForEach-Object {
        $relative = $_.FullName.Substring((Join-Path $root "release").Length + 1)
        Write-Host ("  {0,-48} {1,8:N0} KB" -f $relative, ($_.Length / 1KB))
    }
Write-Host "Deploy release/backend to the VPS. Deploy release/frontend through the linked Vercel project." -ForegroundColor Yellow
