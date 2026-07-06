$ErrorActionPreference = "Stop"
$source = "c:\Users\dadde\Documents\GitHub\smart-home-dashboard"
$destDir = "D:\Projekt Smarthome"
$date = Get-Date -Format "yyyyMMdd"

if (-not (Test-Path $destDir)) {
    Write-Error "Netzlaufwerk-Zielverzeichnis $destDir wurde nicht gefunden! Ist das Netzlaufwerk D: verbunden?"
}

# 1. Dashboard Backup
$projectDest = Join-Path $destDir "smart-home-dashboard_backup_$date.zip"
$tempDir = Join-Path $env:TEMP "dashboard_backup_temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "Kopiere Projektdateien (ohne node_modules und .git)..." -ForegroundColor Cyan
# Robocopy nutzen, um node_modules und .git auszuschließen
# exit code von robocopy < 8 bedeutet erfolgreiches kopieren
$process = Start-Process robocopy -ArgumentList "`"$source`" `"$tempDir`" /XD node_modules .git /S /R:1 /W:1 /NFL /NDL /NJH /NJS" -Wait -NoNewWindow -PassThru
if ($process.ExitCode -ge 8) {
    Write-Error "Robocopy ist mit Fehlercode $($process.ExitCode) fehlgeschlagen."
}

Write-Host "Erstelle Projekt-ZIP unter $projectDest..." -ForegroundColor Cyan
Compress-Archive -Path "$tempDir\*" -DestinationPath $projectDest -Force
Remove-Item $tempDir -Recurse -Force
Write-Host "[OK] Projekt erfolgreich gesichert!" -ForegroundColor Green

# 2. KI-Gedächtnis Backup (Dynamische Erkennung des neuesten/aktiven Gedächtnisses)
$brainParent = "C:\Users\dadde\.gemini\antigravity\brain"
$latestBrain = Get-ChildItem $brainParent -Force | Where-Object { $_.PSIsContainer -and $_.Name -ne "tempmediaStorage" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($latestBrain) {
    $brainSource = $latestBrain.FullName
    $brainDest = Join-Path $destDir "antigravity_brain_backup_$date.zip"
    $tempBrainDir = Join-Path $env:TEMP "brain_backup_temp"
    if (Test-Path $tempBrainDir) { Remove-Item $tempBrainDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempBrainDir -Force | Out-Null
    
    Write-Host "Kopiere KI-Gedächtnis-Dateien ($($latestBrain.Name))..." -ForegroundColor Cyan
    $process = Start-Process robocopy -ArgumentList "`"$brainSource`" `"$tempBrainDir`" /S /R:1 /W:1 /NFL /NDL /NJH /NJS" -Wait -NoNewWindow -PassThru
    
    # Entferne das Hidden-Attribut im Temp-Ordner für Compress-Archive
    Get-ChildItem $tempBrainDir -Recurse -Force | ForEach-Object {
        if ($_.Attributes -match "Hidden") {
            $_.Attributes = $_.Attributes -bxor [System.IO.FileAttributes]::Hidden
        }
    }

    Write-Host "Erstelle KI-Gedächtnis-ZIP unter $brainDest..." -ForegroundColor Cyan
    Compress-Archive -Path "$tempBrainDir\*" -DestinationPath $brainDest -Force
    Remove-Item $tempBrainDir -Recurse -Force
    Write-Host "[OK] KI-Gedächtnis erfolgreich gesichert!" -ForegroundColor Green
} else {
    Write-Host "[WARNUNG] Kein KI-Gedächtnis-Ordner unter $brainParent gefunden! Überspringe..." -ForegroundColor Yellow
}

Write-Host "`nBackup-Vorgang abgeschlossen! 🎉" -ForegroundColor Green
