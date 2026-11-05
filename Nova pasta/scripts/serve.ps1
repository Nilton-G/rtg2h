# Servidor estático mínimo para desenvolvimento (TcpListener + pool de runspaces).
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/serve.ps1 -Port 5173
param([int]$Port = 5173)

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Set-Content -Path (Join-Path $root ".server.pid") -Value $PID -NoNewline
Write-Host "Nebula Vanguard servindo $root em http://localhost:$Port (PID $PID)"

# Cada conexão roda em um runspace próprio: conexões ociosas do Chrome não travam o servidor.
$handler = {
  param($client, $root)

  $mime = @{
    ".html"        = "text/html; charset=utf-8"
    ".js"          = "text/javascript; charset=utf-8"
    ".css"         = "text/css; charset=utf-8"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".svg"         = "image/svg+xml"
    ".ico"         = "image/x-icon"
    ".json"        = "application/json"
    ".webmanifest" = "application/manifest+json"
  }

  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 3000
    $stream.WriteTimeout = 8000
    $buffer = New-Object byte[] 8192
    $read = $stream.Read($buffer, 0, $buffer.Length)
    if ($read -gt 0) {
      $req = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
      $line = ($req -split "`r`n")[0]
      $parts = $line.Split(' ')
      $method = if ($parts.Length -ge 1) { $parts[0] } else { "GET" }
      $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
      $rawPath = ($rawPath -split '\?')[0]
      $rawPath = [System.Uri]::UnescapeDataString($rawPath)
      if ($rawPath -eq "/") { $rawPath = "/index.html" }

      $rel = $rawPath.TrimStart('/').Replace('/', '\')
      $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      $isInside = $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)

      $headers = "Cache-Control: no-store`r`nConnection: close`r`n"
      if (-not $isInside -or -not (Test-Path $full -PathType Leaf)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("404 - nao encontrado")
        $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`n$headers`r`n"
      } else {
        $body = [System.IO.File]::ReadAllBytes($full)
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $ct = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($body.Length)`r`n$headers`r`n"
      }
      $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($hb, 0, $hb.Length)
      if ($method -ne "HEAD" -and $body.Length -gt 0) {
        $stream.Write($body, 0, $body.Length)
      }
      $stream.Flush()
    }
  } catch {
    # conexão interrompida: ignora
  } finally {
    try { $client.Close() } catch { }
  }
}

$pool = [runspacefactory]::CreateRunspacePool(1, 16)
$pool.Open()

while ($true) {
  try {
    $client = $listener.AcceptTcpClient()
    $ps = [powershell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($handler.ToString()).AddArgument($client).AddArgument($root)
    [void]$ps.BeginInvoke()
  } catch {
    # segue aceitando conexões
  }
}
