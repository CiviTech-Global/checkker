# Wrapper for the Node.js deployment wizard on Windows native PowerShell.
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..")

Set-Location $RootDir

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Get it from https://nodejs.org" -ForegroundColor Red
    exit 1
}

& node (Join-Path $ScriptDir "deploy-wizard.mjs") @args
