$ErrorActionPreference = "Stop"
$destDir = "D:\Projekt Smarthome"
$date = Get-Date -Format "yyyyMMdd"

if (-not (Test-Path $destDir)) {
    Write-Error "Zielverzeichnis $destDir wurde nicht gefunden! Ist das Laufwerk D: verbunden?"
}

Write-Host "===================================================" -ForegroundColor Green
Write-Host "   Starte Backup aller Projekte & des KI-Gedächtnisses" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host "Datum: $date`n" -ForegroundColor Gray

# Funktion für sicheren Projekt-Backup via Robocopy + Compress-Archive
function Backup-Project {
    param (
        [string]$ProjectName,
        [string]$SourcePath,
        [string[]]$ExcludeDirs
    )

    if (-not (Test-Path $SourcePath)) {
        Write-Host "[WARNUNG] Projektpfad $SourcePath existiert nicht. Überspringe..." -ForegroundColor Yellow
        return
    }

    $projectZip = Join-Path $destDir "$($ProjectName)_backup_$date.zip"
    $tempDir = Join-Path $env:TEMP "$($ProjectName)_backup_temp"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    Write-Host "Sichere Projekt: $ProjectName..." -ForegroundColor Cyan
    Write-Host "Kopiere Dateien von $SourcePath nach Temp..." -ForegroundColor Gray
    
    $excludeArg = ""
    if ($ExcludeDirs.Count -gt 0) {
        $excludeArg = "/XD " + ($ExcludeDirs -join " ")
    }

    # Robocopy nutzen
    $argsList = "`"$SourcePath`" `"$tempDir`" /S /R:1 /W:1 /NFL /NDL /NJH /NJS"
    if ($excludeArg -ne "") {
        $argsList += " $excludeArg"
    }

    $process = Start-Process robocopy -ArgumentList $argsList -Wait -NoNewWindow -PassThru
    # exit code < 8 ist bei robocopy erfolgreich (bedeutet kopiert, keine schwerwiegenden Fehler)
    if ($process.ExitCode -ge 8) {
        Write-Warning "Robocopy für $ProjectName meldete Exit-Code $($process.ExitCode)."
    }

    Write-Host "Erstelle ZIP-Archiv unter $projectZip..." -ForegroundColor Gray
    Compress-Archive -Path "$tempDir\*" -DestinationPath $projectZip -Force
    Remove-Item $tempDir -Recurse -Force
    Write-Host "[OK] $ProjectName erfolgreich gesichert!`n" -ForegroundColor Green
}

# 1. Backup: smart-home-dashboard
Backup-Project -ProjectName "smart-home-dashboard" -SourcePath "C:\Users\dadde\Documents\GitHub\smart-home-dashboard" -ExcludeDirs @("node_modules", ".git")

# 2. Backup: indoor-temp-sensor
Backup-Project -ProjectName "indoor-temp-sensor" -SourcePath "C:\Users\dadde\Documents\GitHub\indoor-temp-sensor" -ExcludeDirs @(".pio", ".git")

# 3. Backup: cardputer-dht22
Backup-Project -ProjectName "cardputer-dht22" -SourcePath "C:\Users\dadde\Documents\GitHub\cardputer-dht22" -ExcludeDirs @(".pio", ".git")

# 4. Backup: Aktives KI-Gedächtnis (Einzelnes Brain - Kompatibel mit restore-dashboard.bat)
$brainParent = "C:\Users\dadde\.gemini\antigravity\brain"
$latestBrain = Get-ChildItem $brainParent -Force | Where-Object { $_.PSIsContainer -and $_.Name -ne "tempmediaStorage" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($latestBrain) {
    $brainSource = $latestBrain.FullName
    $brainDest = Join-Path $destDir "antigravity_brain_backup_$date.zip"
    $tempBrainDir = Join-Path $env:TEMP "brain_backup_temp"
    if (Test-Path $tempBrainDir) { Remove-Item $tempBrainDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempBrainDir -Force | Out-Null
    
    Write-Host "Sichere aktives KI-Gedächtnis ($($latestBrain.Name))..." -ForegroundColor Cyan
    # Kopiere mit robocopy, toleriere belegte Dateien
    $process = Start-Process robocopy -ArgumentList "`"$brainSource`" `"$tempBrainDir`" /S /R:0 /W:0 /NFL /NDL /NJH /NJS" -Wait -NoNewWindow -PassThru
    
    # Entferne das Hidden-Attribut im Temp-Ordner für Compress-Archive
    Get-ChildItem $tempBrainDir -Recurse -Force | ForEach-Object {
        if ($_.Attributes -match "Hidden") {
            $_.Attributes = $_.Attributes -bxor [System.IO.FileAttributes]::Hidden
        }
    }

    Write-Host "Erstelle ZIP-Archiv unter $brainDest..." -ForegroundColor Gray
    Compress-Archive -Path "$tempBrainDir\*" -DestinationPath $brainDest -Force
    Remove-Item $tempBrainDir -Recurse -Force
    Write-Host "[OK] Aktives KI-Gedächtnis erfolgreich gesichert!`n" -ForegroundColor Green
} else {
    Write-Host "[WARNUNG] Kein aktives KI-Gedächtnis-Verzeichnis gefunden!`n" -ForegroundColor Yellow
}

# 5. Backup: Gesamter Antigravity-Ordner (Alle Brains, Einstellungen, Verläufe)
$antigravitySource = "C:\Users\dadde\.gemini\antigravity"
$fullBrainDest = Join-Path $destDir "antigravity_full_backup_$date.zip"
$tempFullBrainDir = Join-Path $env:TEMP "antigravity_full_backup_temp"
if (Test-Path $tempFullBrainDir) { Remove-Item $tempFullBrainDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempFullBrainDir -Force | Out-Null

Write-Host "Sichere komplettes KI-Gedächtnis & Konfigurationen..." -ForegroundColor Cyan
# Robocopy nutzen, um Kopie zu machen, sperrende Lock-Dateien ignorieren (/R:0 /W:0)
$process = Start-Process robocopy -ArgumentList "`"$antigravitySource`" `"$tempFullBrainDir`" /S /R:0 /W:0 /NFL /NDL /NJH /NJS" -Wait -NoNewWindow -PassThru

# Entferne das Hidden-Attribut im Temp-Ordner
Get-ChildItem $tempFullBrainDir -Recurse -Force | ForEach-Object {
    if ($_.Attributes -match "Hidden") {
        $_.Attributes = $_.Attributes -bxor [System.IO.FileAttributes]::Hidden
    }
}

Write-Host "Erstelle ZIP-Archiv unter $fullBrainDest (dies kann einen Moment dauern)..." -ForegroundColor Gray
Compress-Archive -Path "$tempFullBrainDir\*" -DestinationPath $fullBrainDest -Force
Remove-Item $tempFullBrainDir -Recurse -Force
Write-Host "[OK] Komplettes Antigravity-Gedächtnis erfolgreich gesichert!`n" -ForegroundColor Green

Write-Host "===================================================" -ForegroundColor Green
Write-Host " Backup-Vorgang erfolgreich beendet! 🎉" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
