$tsFiles = Get-ChildItem -Path .\src -Recurse -Filter *.ts -File -ErrorAction SilentlyContinue
$tsxFiles = Get-ChildItem -Path .\src -Recurse -Filter *.tsx -File -ErrorAction SilentlyContinue
$cssFiles = Get-ChildItem -Path .\src -Recurse -Filter *.css -File -ErrorAction SilentlyContinue
$jsonFiles = Get-ChildItem -Path . -Filter *.json -File -ErrorAction SilentlyContinue

$tsLines = 0
foreach ($f in $tsFiles) {
    $tsLines += (Get-Content $f.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
}

$tsxLines = 0
foreach ($f in $tsxFiles) {
    $tsxLines += (Get-Content $f.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
}

$cssLines = 0
foreach ($f in $cssFiles) {
    $cssLines += (Get-Content $f.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
}

$jsonLines = 0
foreach ($f in $jsonFiles) {
    $jsonLines += (Get-Content $f.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
}

Write-Host "=== Source Code Line Count ==="
Write-Host ".ts files: $($tsFiles.Count) files, $tsLines lines"
Write-Host ".tsx files: $($tsxFiles.Count) files, $tsxLines lines"
Write-Host ".css files: $($cssFiles.Count) files, $cssLines lines"
Write-Host ".json files: $($jsonFiles.Count) files, $jsonLines lines"
$totalLines = $tsLines + $tsxLines + $cssLines + $jsonLines
Write-Host "Total: $($tsFiles.Count + $tsxFiles.Count + $cssFiles.Count + $jsonFiles.Count) files, $totalLines lines"
