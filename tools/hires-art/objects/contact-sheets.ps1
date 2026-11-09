param([string]$InputJson, [string]$OutDir, [string]$Mode = 'refs')
Add-Type -AssemblyName System.Drawing
$rows = @(Get-Content -LiteralPath $InputJson -Raw | ConvertFrom-Json)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$font = [System.Drawing.Font]::new('Segoe UI', 9)
$title = [System.Drawing.Font]::new('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
$white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230,234,240))
$muted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(160,172,188))
$dark = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(38,43,51))
$light = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(220,223,229))
$perPage = 20
for ($page = 0; $page * $perPage -lt $rows.Count; $page++) {
  $end = [Math]::Min(($page + 1) * $perPage, $rows.Count)
  $height = 60 + 210 * [Math]::Ceiling(($end - $page * $perPage) / 4)
  $bitmap = [System.Drawing.Bitmap]::new(1000, [int]$height)
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.Clear([System.Drawing.Color]::FromArgb(22,26,32))
  $g.DrawString("Object icons - $Mode - page $($page + 1)", $title, $white, 15, 12)
  for ($n = $page * $perPage; $n -lt $end; $n++) {
    $item = $rows[$n]
    $local = $n - $page * $perPage
    $x = 10 + ($local % 4) * 250
    $y = 55 + [Math]::Floor($local / 4) * 210
    $g.DrawString($item.name, $font, $white, [System.Drawing.RectangleF]::new($x, $y, 240, 38))
    if ($Mode -eq 'refs') {
      $im = [System.Drawing.Image]::FromFile($item.refs[0])
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
      $g.FillRectangle($dark, ($x + 10), ($y + 40), 150, 150)
      $g.DrawImage($im, [System.Drawing.Rectangle]::new(($x + 10), ($y + 40), 150, 150))
      $im.Dispose()
    } else {
      $im = [System.Drawing.Image]::FromFile($item.path)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.FillRectangle($dark, $x, ($y + 40), 150, 150)
      $g.DrawImage($im, [System.Drawing.Rectangle]::new($x, ($y + 40), 150, 150))
      $g.FillRectangle($dark, ($x + 170), ($y + 45), 48, 48)
      $g.DrawImage($im, [System.Drawing.Rectangle]::new(($x + 170), ($y + 45), 48, 48))
      $g.FillRectangle($light, ($x + 170), ($y + 115), 48, 48)
      $g.DrawImage($im, [System.Drawing.Rectangle]::new(($x + 170), ($y + 115), 48, 48))
      $im.Dispose()
    }
  }
  $file = Join-Path $OutDir ('{0}-{1:d2}.png' -f $Mode, ($page + 1))
  $bitmap.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bitmap.Dispose()
  Write-Output $file
}
$font.Dispose(); $title.Dispose(); $white.Dispose(); $muted.Dispose(); $dark.Dispose(); $light.Dispose()
