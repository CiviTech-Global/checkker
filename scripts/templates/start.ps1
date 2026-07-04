<#
.SYNOPSIS
  Starts the Checkker game server.
.DESCRIPTION
  Loads .env from the same directory (if present), then starts the
  bundled server. Supports --port and --web-dist CLI overrides.

  Usage:
    .\start.ps1                    # uses .env or defaults (port 3001)
    .\start.ps1 --port 8080
    .\start.ps1 --web-dist C:\my-checkker\web
    .\start.ps1 --port 8080 --web-dist ./web
#>

param(
  [int]$port = 0,
  [string]$webDist = ""
)

$ScriptDir = Split-Path -Parent $PSCommandPath
Set-Location $ScriptDir

# Load .env if present
$envFile = Join-Path $ScriptDir ".env"
if (Test-Path $envFile) {
  Write-Host "[env] Loading $envFile"
  Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*([^#=]+)=(.*)" -and $matches[1] -ne "") {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim().Trim('"', "'")
      [Environment]::SetEnvironmentVariable($name, $value)
    }
  }
}

# Build CLI args
$argsList = @()
if ($port -gt 0) { $argsList += "--port", $port }
if ($webDist -ne "") { $argsList += "--web-dist", $webDist }

$bundlePath = Join-Path $ScriptDir "server.bundle.js"
if (-not (Test-Path $bundlePath)) {
  Write-Host "ERROR: server.bundle.js not found in $ScriptDir" -ForegroundColor Red
  Write-Host "Run scripts/deploy-server.ps1 first to build the deployment package."
  exit 1
}

Write-Host "Starting Checkker server..." -ForegroundColor Cyan
Write-Host "  Working directory: $ScriptDir"
Write-Host "  Args: $($argsList -join ' ')"
Write-Host "`nServer output:" -ForegroundColor Yellow

# Start the server as a foreground process
& node $bundlePath @argsList
