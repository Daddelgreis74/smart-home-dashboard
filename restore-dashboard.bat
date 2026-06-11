@echo off
title Neo Deck Smart Home Dashboard - Restore 🔄
echo ===================================================
echo   Neo Deck Smart Home Dashboard - Restore-Assistent
echo ===================================================
echo.
echo Dieses Skript stellt das Projekt und seine Konfigurationen
echo sowie das Gedaechtnis des KI-Assistenten von TrueNAS wieder her.
echo.

:: 1. Pfade definieren
set "BACKUP_DIR=D:\Projekt Smarthome"
set "PROJECT_ZIP=%BACKUP_DIR%\smart-home-dashboard_backup_20260611.zip"
set "BRAIN_ZIP=%BACKUP_DIR%\antigravity_brain_backup_20260611.zip"
set "RESTORE_DIR=%~dp0"
set "BRAIN_DIR=C:\Users\dadde\.gemini\antigravity\brain\f05b501e-0e65-473a-9f24-b7e5d1b1f3fc"

:: Prüfen, ob Backups existieren
if not exist "%PROJECT_ZIP%" (
    echo [FEHLER] Projekt-Backup nicht gefunden unter:
    echo %PROJECT_ZIP%
    echo.
    pause
    exit /b 1
)

echo [INFO] Wiederherstellung wird gestartet...
echo [INFO] Projekt-Ziel: %RESTORE_DIR%
echo.

:: 2. Projekt entpacken via PowerShell
echo [INFO] Entpacke Projekt-Dateien...
powershell -Command "Expand-Archive -Path '%PROJECT_ZIP%' -DestinationPath '%RESTORE_DIR%' -Force"
if %errorlevel% neq 0 (
    echo [FEHLER] Entpacken des Projekts fehlgeschlagen!
    pause
    exit /b 1
)
echo [INFO] Projekt-Dateien erfolgreich entpackt.
echo.

:: 3. Brain entpacken via PowerShell
if exist "%BRAIN_ZIP%" (
    echo [INFO] Entpacke KI-Gedaechtnis...
    powershell -Command "Expand-Archive -Path '%BRAIN_ZIP%' -DestinationPath '%BRAIN_DIR%' -Force"
    if %errorlevel% neq 0 (
        echo [WARNUNG] KI-Gedaechtnis konnte nicht vollständig wiederhergestellt werden.
        echo (Das ist unkritisch fuer den Betrieb des Dashboards.)
    ) else (
        echo [INFO] KI-Gedaechtnis erfolgreich entpackt.
    )
) else (
    echo [INFO] Kein KI-Gedaechtnis-Backup gefunden. Überspringe...
)
echo.

:: 4. Node.js & npm Pfade pruefen
where node >nul 2>nul
if %errorlevel% equ 0 goto node_ok

if exist "C:\Program Files\nodejs\node.exe" set "PATH=%PATH%;C:\Program Files\nodejs" & goto node_ok
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=%PATH%;C:\Program Files (x86)\nodejs" & goto node_ok

echo [FEHLER] Node.js nicht gefunden. Bitte installiere Node.js: https://nodejs.org/
pause
exit /b 1

:node_ok

:: 5. Installiere Abhängigkeiten (node_modules)
echo [INFO] Installiere Projekt-Abhaengigkeiten (npm install)...
echo.
cd /d "%RESTORE_DIR%"
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] npm install fehlgeschlagen!
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo   Wiederherstellung erfolgreich abgeschlossen!
echo ===================================================
echo.
echo Das Dashboard kann nun wie gewohnt ueber
echo 'start-dashboard.bat' gestartet werden.
echo.
pause
