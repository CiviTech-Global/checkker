<#
.SYNOPSIS
  Builds and assembles the Checkker server deployment package.
.DESCRIPTION
  This script:
    1. Builds the web client export (npm run export:web -w apps/mobile)
    2. Bundles the server with esbuild (npm run bundle -w apps/server)
    3. Assembles everything into deploy/ directory

  After running, the deploy/ directory is a self-contained package.
  Copy it to the target server and run start.ps1 (Windows) or start.sh (Linux).
#>

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$DeployDir = Join-Path $RepoRoot "deploy"

Write-Host "=== Checkker Server Deployment Builder ===" -ForegroundColor Cyan

# Step 1: Build web client
Write-Host "`n[1/3] Building web client..." -ForegroundColor Yellow
Push-Location $RepoRoot
try {
  npm run export:web -w apps/mobile
  if ($LASTEXITCODE -ne 0) { throw "Web export failed" }
} finally {
  Pop-Location
}

$WebSrc = Join-Path $RepoRoot "apps\mobile\dist"
if (-not (Test-Path (Join-Path $WebSrc "index.html"))) {
  throw "Web client build did not produce index.html at apps/mobile/dist/"
}

# Step 2: Bundle server
Write-Host "`n[2/3] Bundling server..." -ForegroundColor Yellow
Push-Location $RepoRoot
try {
  npm run bundle -w apps/server
  if ($LASTEXITCODE -ne 0) { throw "Server bundle failed" }
} finally {
  Pop-Location
}

$BundleSrc = Join-Path $RepoRoot "apps\server\dist\server.bundle.js"
if (-not (Test-Path $BundleSrc)) {
  throw "Server bundle not found at apps/server/dist/server.bundle.js"
}

# Step 3: Assemble deploy package
Write-Host "`n[3/3] Assembling deploy package..." -ForegroundColor Yellow

# Template start scripts (tracked in git)
$StartPs1 = Get-Content (Join-Path $RepoRoot "scripts\templates\start.ps1") -Raw
$StartSh = Get-Content (Join-Path $RepoRoot "scripts\templates\start.sh") -Raw

# Clean and recreate deploy directory
if (Test-Path $DeployDir) {
  Remove-Item -Recurse -Force $DeployDir
}
New-Item -ItemType Directory -Path $DeployDir | Out-Null

# Copy server bundle
Copy-Item $BundleSrc (Join-Path $DeployDir "server.bundle.js")

# Copy web client
$WebDest = Join-Path $DeployDir "web"
New-Item -ItemType Directory -Path $WebDest | Out-Null
Copy-Item -Recurse "$WebSrc\*" $WebDest

# Write start scripts (from memory, since deploy dir was just cleaned)
Set-Content -Path (Join-Path $DeployDir "start.ps1") -Value $StartPs1
Set-Content -Path (Join-Path $DeployDir "start.sh") -Value $StartSh

# Copy .env.example
Copy-Item (Join-Path $RepoRoot ".env.example") (Join-Path $DeployDir ".env.example")

# Verify
$BundleSize = (Get-Item (Join-Path $DeployDir "server.bundle.js")).Length / 1MB
$WebFiles = (Get-ChildItem -Recurse (Join-Path $DeployDir "web") | Measure-Object).Count

Write-Host "`n=== Deployment package ready at: $DeployDir ===" -ForegroundColor Green
Write-Host "  Server bundle:     $([math]::Round($BundleSize, 1)) MB"
Write-Host "  Web client files:  $WebFiles"
Write-Host "  Start (Windows):   .\start.ps1"
Write-Host "  Start (Linux):     ./start.sh"
Write-Host "  Config:            Copy .env.example to .env and edit"
