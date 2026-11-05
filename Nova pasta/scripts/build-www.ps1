# Copia o jogo para www/ (pasta web do Capacitor).
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-www.ps1
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$www = Join-Path $root "www"

if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Path $www | Out-Null
New-Item -ItemType Directory -Path (Join-Path $www "src") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $www "icons") | Out-Null

Copy-Item (Join-Path $root "index.html") $www
Copy-Item (Join-Path $root "styles.css") $www
Copy-Item (Join-Path $root "manifest.webmanifest") $www
Copy-Item (Join-Path $root "sw.js") $www
Copy-Item (Join-Path $root "src\*.js") (Join-Path $www "src")
Copy-Item (Join-Path $root "icons\*.png") (Join-Path $www "icons")

Write-Host "www/ pronto:"
Get-ChildItem $www -Recurse -File | Select-Object -ExpandProperty FullName
