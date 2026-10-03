param(
  [Parameter(Mandatory = $true)]
  [string]$SourceImage,
  [string]$OutputDirectory = "dist/assets",
  [string]$MasterOutputDirectory = "brand-assets"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path -LiteralPath $SourceImage).Path
$outputPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null
$masterOutputPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $MasterOutputDirectory))
[System.IO.Directory]::CreateDirectory($masterOutputPath) | Out-Null

$source = [System.Drawing.Image]::FromFile($sourcePath)

function New-Canvas {
  param(
    [int]$Size,
    [bool]$Opaque = $false,
    [double]$Padding = 0.0
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bitmap.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  if ($Opaque) {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#061722"))
  } else {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  }

  $inset = [int][Math]::Round($Size * $Padding)
  $drawSize = $Size - (2 * $inset)
  $graphics.DrawImage($source, [System.Drawing.Rectangle]::new($inset, $inset, $drawSize, $drawSize))
  $graphics.Dispose()
  return $bitmap
}

function Save-Png {
  param([System.Drawing.Bitmap]$Bitmap, [string]$Name)
  $target = Join-Path $outputPath $Name
  $Bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  $Bitmap.Dispose()
}

Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $masterOutputPath "redscore-radar-master.png") -Force

Save-Png (New-Canvas -Size 512 -Padding 0.025) "redscore-logo.png"
Save-Png (New-Canvas -Size 32 -Padding 0.04) "favicon-32x32.png"
Save-Png (New-Canvas -Size 180 -Opaque $true -Padding 0.08) "app-icon-180.png"
Save-Png (New-Canvas -Size 192 -Opaque $true -Padding 0.08) "app-icon-192.png"
Save-Png (New-Canvas -Size 512 -Opaque $true -Padding 0.08) "app-icon-512.png"
Save-Png (New-Canvas -Size 192 -Opaque $true -Padding 0.16) "app-icon-maskable-192.png"
Save-Png (New-Canvas -Size 512 -Opaque $true -Padding 0.16) "app-icon-maskable-512.png"

# PNG-compressed single-image favicon. Modern browsers support a PNG payload in ICO.
$faviconPng = [System.IO.File]::ReadAllBytes((Join-Path $outputPath "favicon-32x32.png"))
$iconStream = [System.IO.MemoryStream]::new()
$writer = [System.IO.BinaryWriter]::new($iconStream)
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]1)
$writer.Write([byte]32)
$writer.Write([byte]32)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([uint16]1)
$writer.Write([uint16]32)
$writer.Write([uint32]$faviconPng.Length)
$writer.Write([uint32]22)
$writer.Write($faviconPng)
$writer.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $outputPath "favicon.ico"), $iconStream.ToArray())
$writer.Dispose()
$iconStream.Dispose()

# Communication/social preview with the same radar mark and current RedScore claim.
$social = [System.Drawing.Bitmap]::new(1200, 630, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$social.SetResolution(96, 96)
$g = [System.Drawing.Graphics]::FromImage($social)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  [System.Drawing.Rectangle]::new(0, 0, 1200, 630),
  [System.Drawing.ColorTranslator]::FromHtml("#03111a"),
  [System.Drawing.ColorTranslator]::FromHtml("#0b2635"),
  20
)
$g.FillRectangle($background, 0, 0, 1200, 630)
$background.Dispose()

$redGlow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(42, 255, 31, 46))
$g.FillEllipse($redGlow, 8, 45, 540, 540)
$redGlow.Dispose()
$g.DrawImage($source, [System.Drawing.Rectangle]::new(50, 85, 460, 460))

$fontFamily = "Segoe UI"
$brandFont = [System.Drawing.Font]::new($fontFamily, 82, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$claimFont = [System.Drawing.Font]::new($fontFamily, 24, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$detailFont = [System.Drawing.Font]::new($fontFamily, 22, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$red = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#ff2838"))
$white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$muted = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#c9d6df"))
$g.DrawString("Red", $brandFont, $red, 535, 210)
$redWidth = $g.MeasureString("Red", $brandFont).Width
$g.DrawString("Score", $brandFont, $white, 535 + $redWidth - 8, 210)
$g.DrawString("Weil der Ernstfall nicht fragt, ob du bereit bist.", $claimFont, $white, 542, 320)
$g.DrawString("Wissen · Planen · Sicher leben", $detailFont, $muted, 542, 372)

$linePen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#ff2838"), 5)
$g.DrawLine($linePen, 542, 420, 760, 420)
$linePen.Dispose()
$brandFont.Dispose()
$claimFont.Dispose()
$detailFont.Dispose()
$red.Dispose()
$white.Dispose()
$muted.Dispose()
$g.Dispose()
$social.Save((Join-Path $outputPath "redscore-logo-full.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$social.Dispose()
$source.Dispose()

Write-Output "RedScore radar assets generated in $outputPath"
