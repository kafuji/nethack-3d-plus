$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or
    -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Write-Error 'Node.js and npm are required. Install them before starting the game.'
    exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules/vite/bin/vite.js'))) {
    Write-Error 'Dependencies are missing. Run npm install in the project folder first.'
    exit 1
}

Push-Location $PSScriptRoot
try {
    Write-Host 'Starting NetHack 3D at http://127.0.0.1:5173/ (Ctrl+C to stop).'
    & npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
