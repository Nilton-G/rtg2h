# Gera os ícones PNG do app (192, 512, maskable e 1024 para a Play Store)
# usando System.Drawing do Windows. Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\icons"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function New-NebulaIcon {
  param([int]$Size, [string]$Path, [bool]$Maskable = $false)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(5, 3, 15))

  # fundo: gradiente radial simulado com elipses
  $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(60, 30, 130),
    [System.Drawing.Color]::FromArgb(3, 2, 10),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
  $g.FillRectangle($bgBrush, $rect)

  # halo roxo (elipse com alpha)
  for ($i = 6; $i -ge 1; $i--) {
    $rad = $Size * 0.42 * $i / 6.0
    $alpha = [int](8 + (6 - $i) * 3)
    $col = [System.Drawing.Color]::FromArgb([Math]::Min(90, $alpha * 4), 140, 70, 255)
    $brush = New-Object System.Drawing.SolidBrush($col)
    $x = $Size / 2 - $rad
    $y = $Size * 0.52 - $rad
    $g.FillEllipse($brush, [single]$x, [single]$y, [single]($rad * 2), [single]($rad * 2))
    $brush.Dispose()
  }

  # estrelas
  $rand = New-Object System.Random(7)
  for ($i = 0; $i -lt 60; $i++) {
    $a = $rand.Next(40, 220)
    $s = $rand.Next(1, [Math]::Max(2, [int]($Size / 220)))
    $col = [System.Drawing.Color]::FromArgb($a, 220, 235, 255)
    $b = New-Object System.Drawing.SolidBrush($col)
    $g.FillEllipse($b, $rand.Next(0, $Size), $rand.Next(0, $Size), $s, $s)
    $b.Dispose()
  }

  # glow atrás da nave
  $cx = $Size / 2.0
  $cy = $Size * 0.52
  for ($i = 12; $i -ge 1; $i--) {
    $rad = $Size * 0.30 * $i / 12.0
    $col = [System.Drawing.Color]::FromArgb([int](4 + (12 - $i) * 2), 55, 208, 255)
    $b = New-Object System.Drawing.SolidBrush($col)
    $g.FillEllipse($b, [single]($cx - $rad), [single]($cy - $rad), [single]($rad * 2), [single]($rad * 2))
    $b.Dispose()
  }

  # nave (escala relativa)
  $u = $Size / 100.0
  $pts = @(
    (New-Object System.Drawing.PointF([single]($cx), [single]($cy - 26 * $u))),
    (New-Object System.Drawing.PointF([single]($cx + 10 * $u), [single]($cy - 3 * $u))),
    (New-Object System.Drawing.PointF([single]($cx + 24 * $u), [single]($cy + 10 * $u))),
    (New-Object System.Drawing.PointF([single]($cx + 19 * $u), [single]($cy + 15 * $u))),
    (New-Object System.Drawing.PointF([single]($cx + 6 * $u), [single]($cy + 10 * $u))),
    (New-Object System.Drawing.PointF([single]($cx), [single]($cy + 16 * $u))),
    (New-Object System.Drawing.PointF([single]($cx - 6 * $u), [single]($cy + 10 * $u))),
    (New-Object System.Drawing.PointF([single]($cx - 19 * $u), [single]($cy + 15 * $u))),
    (New-Object System.Drawing.PointF([single]($cx - 24 * $u), [single]($cy + 10 * $u))),
    (New-Object System.Drawing.PointF([single]($cx - 10 * $u), [single]($cy - 3 * $u)))
  )
  $shipBody = New-Object System.Drawing.Drawing2D.GraphicsPath
  $shipBody.AddPolygon($pts)

  $shipBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.RectangleF([single]($cx - 30 * $u), [single]($cy - 30 * $u), [single](60 * $u), [single](60 * $u))),
    [System.Drawing.Color]::FromArgb(255, 235, 250, 255),
    [System.Drawing.Color]::FromArgb(255, 40, 200, 255),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
  $g.FillPath($shipBrush, $shipBody)

  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 110, 230, 255), [single](1.6 * $u))
  $g.DrawPath($pen, $shipBody)

  # cockpit
  $cockpit = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
  $g.FillEllipse($cockpit, [single]($cx - 3.4 * $u), [single]($cy - 14 * $u), [single](6.8 * $u), [single](13 * $u))

  # chama
  $flamePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $flamePath.AddPolygon(@(
    (New-Object System.Drawing.PointF([single]($cx - 6 * $u), [single]($cy + 12 * $u))),
    (New-Object System.Drawing.PointF([single]($cx), [single]($cy + 34 * $u))),
    (New-Object System.Drawing.PointF([single]($cx + 6 * $u), [single]($cy + 12 * $u)))
  ))
  $flameBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210, 255, 90, 200))
  $g.FillPath($flameBrush, $flamePath)

  # moldura maskable: mantém a arte no círculo seguro
  if ($Maskable) {
    $pad = [int]($Size * 0.16)
    $safe = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(20, 255, 255, 255), 1)
    $g.DrawEllipse($safe, $pad, $pad, $Size - 2 * $pad, $Size - 2 * $pad)
  }

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Host "gerado $Path"
}

New-NebulaIcon -Size 192 -Path (Join-Path $outDir "icon-192.png")
New-NebulaIcon -Size 512 -Path (Join-Path $outDir "icon-512.png")
New-NebulaIcon -Size 512 -Path (Join-Path $outDir "icon-maskable-512.png") -Maskable $true
New-NebulaIcon -Size 1024 -Path (Join-Path $outDir "icon-1024.png")
