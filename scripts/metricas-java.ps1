param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$excludeDirs = @(
  'node_modules', 'target', 'dist', 'build', '.git', '.idea', '.vscode',
  'coverage', 'uploads', 'logs'
)

$codeExtensions = @('.java', '.tsx', '.ts', '.js', '.css', '.html', '.properties')

$files = Get-ChildItem -LiteralPath $Root -Recurse -File | Where-Object {
  $relative = $_.FullName.Substring($Root.Length + 1)
  $parts = $relative -split '[\\/]'
  $excluded = $parts | Where-Object { $excludeDirs -contains $_ }
  (-not $excluded) -and ($codeExtensions -contains $_.Extension.ToLowerInvariant())
}

function Get-FileStats {
  param([System.IO.FileInfo[]]$FileSet)

  $lineCount = 0
  $byteCount = 0

  foreach ($file in $FileSet) {
    $byteCount += $file.Length
    if ($file.Length -lt 2MB) {
      $lineCount += (Get-Content -LiteralPath $file.FullName | Where-Object { $_.Trim() -ne '' }).Count
    }
  }

  [pscustomobject]@{
    Files = $FileSet.Count
    Lines = $lineCount
    Bytes = $byteCount
  }
}

$javaFiles = @($files | Where-Object { $_.Extension -ieq '.java' })
$java = Get-FileStats -FileSet $javaFiles
$total = Get-FileStats -FileSet $files

function Get-Percent {
  param([double]$Part, [double]$Whole)
  if ($Whole -le 0) { return 0 }
  return [math]::Round(($Part / $Whole) * 100, 2)
}

function Get-AddOnlyGap {
  param([double]$Part, [double]$Whole)
  return [math]::Max(0, [math]::Ceiling($Whole - (2 * $Part)))
}

$javaLinePercent = Get-Percent -Part $java.Lines -Whole $total.Lines
$javaBytePercent = Get-Percent -Part $java.Bytes -Whole $total.Bytes
$javaFilePercent = Get-Percent -Part $java.Files -Whole $total.Files

$addJavaLines = Get-AddOnlyGap -Part $java.Lines -Whole $total.Lines
$addJavaBytes = Get-AddOnlyGap -Part $java.Bytes -Whole $total.Bytes
$moveLines = [math]::Ceiling($addJavaLines / 2)
$moveBytes = [math]::Ceiling($addJavaBytes / 2)

Write-Host ''
Write-Host '=== Metricas de Java del proyecto ===' -ForegroundColor Cyan
Write-Host "Ruta: $Root"
Write-Host 'Se excluyen: node_modules, target, dist, build, .git, .idea, .vscode, coverage, uploads y logs.'
Write-Host ''
Write-Host ("Archivos:      {0,8:N0} Java / {1,8:N0} total   -> {2,5:N2} %" -f $java.Files, $total.Files, $javaFilePercent)
Write-Host ("Lineas no vacias: {0,8:N0} Java / {1,8:N0} total   -> {2,5:N2} %" -f $java.Lines, $total.Lines, $javaLinePercent)
Write-Host ("Bytes:         {0,8:N0} Java / {1,8:N0} total   -> {2,5:N2} %" -f $java.Bytes, $total.Bytes, $javaBytePercent)
Write-Host ''

if ($javaBytePercent -ge 50 -and $javaLinePercent -ge 50) {
  Write-Host 'Objetivo cumplido: Java supera el 50 % por bytes y por lineas.' -ForegroundColor Green
} else {
  Write-Host 'Objetivo pendiente para superar el 50 %:' -ForegroundColor Yellow
  if ($javaBytePercent -lt 50) {
    Write-Host ("  - Bytes:  agregar {0:N0} B de Java o mover ~{1:N0} B de frontend a Java." -f $addJavaBytes, $moveBytes)
  }
  if ($javaLinePercent -lt 50) {
    Write-Host ("  - Lineas: agregar {0:N0} lineas de Java o mover ~{1:N0} lineas de frontend a Java." -f $addJavaLines, $moveLines)
  }
}

Write-Host ''
Write-Host 'Nota: GitHub Linguist usa bytes, no cantidad de archivos ni lineas.' -ForegroundColor DarkGray
