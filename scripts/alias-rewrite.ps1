$ErrorActionPreference = 'Stop'

$files = Get-ChildItem -Recurse -File -Include *.ts -Path 'src'
$updated = 0

foreach ($f in $files) {
  $c = Get-Content -Raw $f.FullName
  $orig = $c

  # Replace relative imports to core aliases
  $c = $c -replace 'from\s+["''](\.\./)+types["'']', "from '@types'"
  $c = $c -replace 'from\s+["''](\.\./)+shared/([^"'';]+)["'']', "from '@shared/$2'"
  $c = $c -replace 'from\s+["''](\.\./)+state/([^"'';]+)["'']', "from '@state/$2'"
  $c = $c -replace 'from\s+["''](\.\./)+domain/([^"'';]+)["'']', "from '@domain/$2'"

  if ($c -ne $orig) {
    Set-Content -NoNewline -Encoding UTF8 $f.FullName $c
    $updated++
  }
}

Write-Host "Rewrote" $updated "files."
