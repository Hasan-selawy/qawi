[CmdletBinding()]
param(
    [switch]$Detached
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop is not installed or docker.exe is not on PATH."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is installed but is not running. Start Docker Desktop, wait until it is ready, then run this script again."
}

if (-not (Test-Path -LiteralPath ".env")) {
    Copy-Item -LiteralPath ".env.example" -Destination ".env"
    Write-Host "Created .env from .env.example"
}

$arguments = @("compose", "up", "--build")
if ($Detached) {
    $arguments += "--detach"
}

& docker @arguments
if ($LASTEXITCODE -ne 0) {
    throw "Qawi failed to start. Review the Docker output above."
}

if ($Detached) {
    Write-Host "Qawi is starting: http://localhost:5000"
    Write-Host "API health:       http://localhost:9000/actuator/health"
}
