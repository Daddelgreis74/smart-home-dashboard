# Neo Deck - Smart Home Dashboard Windows Installer 🏠👻
#
# Aufruf über:
# irm https://raw.githubusercontent.com/Daddelgreis74/smart-home-dashboard/main/install.ps1 | iex

$ErrorActionPreference = "Stop"
$UTF8 = [System.Text.Encoding]::UTF8

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   Neo Deck Smart Home Dashboard - Windows Setup   " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Hilfsfunktionen
function Check-Command ($cmd) {
    return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
}

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# 2. Abhängigkeiten prüfen (Git & Node.js)
$needsNode = -not (Check-Command "node")
$needsGit = -not (Check-Command "git")

if ($needsNode -or $needsGit) {
    Write-Host "[INFO] Es fehlen noch benötigte Programme auf diesem System." -ForegroundColor Yellow
    
    # Prüfen, ob winget verfügbar ist
    if (-not (Check-Command "winget")) {
        Write-Host "[FEHLER] 'winget' (Windows Package Manager) wurde nicht gefunden." -ForegroundColor Red
        Write-Host "Bitte installiere Node.js (https://nodejs.org) und Git (https://git-scm.com) manuell."
        Write-Host "Starte danach diese Konsole neu und führe das Skript erneut aus."
        Exit
    }

    if ($needsGit) {
        Write-Host "[INSTALL] Installiere Git..." -ForegroundColor Cyan
        Start-Process winget -ArgumentList "install --id Git.Git --silent --accept-package-agreements --accept-source-agreements" -Wait -NoNewWindow
        Write-Host "[OK] Git erfolgreich installiert!" -ForegroundColor Green
    }

    if ($needsNode) {
        Write-Host "[INSTALL] Installiere Node.js..." -ForegroundColor Cyan
        Start-Process winget -ArgumentList "install --id OpenJS.NodeJS --silent --accept-package-agreements --accept-source-agreements" -Wait -NoNewWindow
        Write-Host "[OK] Node.js erfolgreich installiert!" -ForegroundColor Green
    }

    Write-Host "[INFO] Aktualisiere System-Pfade..." -ForegroundColor Yellow
    Refresh-Path
    
    # Erneute Prüfung nach Installation
    if (-not (Check-Command "node") -or -not (Check-Command "git")) {
        Write-Host "[INFO] Installationen abgeschlossen. Bitte starte diese PowerShell-Konsole neu" -ForegroundColor Yellow
        Write-Host "und führe den Installationsbefehl erneut aus, damit die neuen Pfade geladen werden."
        Exit
    }
} else {
    Write-Host "[OK] Git und Node.js sind bereits installiert!" -ForegroundColor Green
}

# 3. Installationsordner abfragen
$defaultPath = Join-Path $HOME "Documents\smart-home-dashboard"
Write-Host ""
Write-Host "Wohin soll das Dashboard installiert werden?" -ForegroundColor White
Write-Host "Standardpfad: $defaultPath" -ForegroundColor Gray
$userPath = Read-Host "Pfad eingeben (oder Enter für Standard)"

if ([string]::IsNullOrWhiteSpace($userPath)) {
    $installPath = $defaultPath
} else {
    $installPath = Resolve-Path $userPath -ErrorAction SilentlyContinue
    if (-not $installPath) {
        $installPath = $userPath
    }
}

# Ordner erstellen, falls nicht vorhanden
if (-not (Test-Path $installPath)) {
    Write-Host "[INFO] Erstelle Installationsverzeichnis: $installPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $installPath | Out-Null
}

# 4. Repository klonen
Write-Host ""
Write-Host "[INFO] Klone Quellcode von GitHub..." -ForegroundColor Cyan
Set-Location $installPath

# Prüfen, ob der Ordner leer ist oder bereits ein Git-Repo enthält
if (Test-Path (Join-Path $installPath ".git")) {
    Write-Host "[INFO] Repository existiert bereits. Führe Update aus..." -ForegroundColor Yellow
    git pull
} else {
    if ((Get-ChildItem $installPath).Count -gt 0) {
        Write-Host "[WARNUNG] Der Zielordner ist nicht leer. Der Quellcode wird hineinkopiert." -ForegroundColor Yellow
    }
    git clone https://github.com/Daddelgreis74/smart-home-dashboard.git .
}

# 5. npm-Abhängigkeiten installieren
Write-Host ""
Write-Host "[INFO] Installiere benötigte JavaScript-Bibliotheken (npm install)..." -ForegroundColor Cyan
npm install

# 6. Desktop-Verknüpfung erstellen
Write-Host ""
$createShortcut = Read-Host "Möchtest du eine Verknüpfung auf dem Desktop erstellen? (J/N)"
if ($createShortcut -match "^[jJ]") {
    try {
        $wshShell = New-Object -ComObject WScript.Shell
        $desktopPath = [System.Environment]::GetFolderPath("Desktop")
        $shortcut = $wshShell.CreateShortcut((Join-Path $desktopPath "Neo Deck Dashboard.lnk"))
        $shortcut.TargetPath = Join-Path $installPath "start-dashboard.bat"
        $shortcut.WorkingDirectory = $installPath
        $shortcut.IconLocation = Join-Path $installPath "dashboard.ico"
        $shortcut.Save()
        Write-Host "[OK] Desktop-Verknüpfung wurde erstellt!" -ForegroundColor Green
    } catch {
        Write-Host "[WARNUNG] Erstellung der Desktop-Verknüpfung fehlgeschlagen." -ForegroundColor Yellow
    }
}

# 7. Fertigstellung & Start
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "   INSTALLATION ERFOLGREICH ABGESCHLOSSEN! 🎉       " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Das Smart Home Dashboard wurde unter $installPath eingerichtet."
Write-Host "Du kannst das Dashboard jederzeit über die Datei 'start-dashboard.bat'"
Write-Host "oder die Desktop-Verknüpfung starten."
Write-Host ""

$startNow = Read-Host "Möchtest du das Dashboard jetzt direkt starten? (J/N)"
if ($startNow -match "^[jJ]") {
    Write-Host "[INFO] Starte Dashboard..." -ForegroundColor Cyan
    Start-Process (Join-Path $installPath "start-dashboard.bat") -WorkingDirectory $installPath
}
