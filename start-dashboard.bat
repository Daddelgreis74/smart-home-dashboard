@echo off
title Neo Deck Smart Home Dashboard 🏠👻
echo ===================================================
echo   Neo Deck Smart Home Dashboard - Start-Konsole
echo ===================================================
echo.

:: 1. Überprüfen, ob Node.js im PATH ist, andernfalls Standardpfade prüfen
where node >nul 2>nul
if %errorlevel% equ 0 goto node_ok

if exist "C:\Program Files\nodejs\node.exe" goto node_standard
if exist "C:\Program Files (x86)\nodejs\node.exe" goto node_x86

echo [FEHLER] Node.js konnte auf diesem PC nicht gefunden werden!
echo.
echo Bitte installiere Node.js von: https://nodejs.org/
echo Wenn du es gerade installiert hast, starte deinen PC einmal neu.
echo.
pause
exit /b 1

:node_standard
echo [INFO] Node.js im Standardverzeichnis gefunden.
echo [INFO] Richte Pfad temporaer ein...
set "PATH=%PATH%;C:\Program Files\nodejs"
goto node_ok

:node_x86
echo [INFO] Node.js im Standardverzeichnis (x86) gefunden.
echo [INFO] Richte Pfad temporaer ein...
set "PATH=%PATH%;C:\Program Files (x86)\nodejs"
goto node_ok

:node_ok

:: 2. Zur Sicherheit auch prüfen, ob npm jetzt erreichbar ist
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] Der Paketmanager 'npm' konnte nicht gefunden werden!
    echo Bitte installiere Node.js erneut.
    echo.
    pause
    exit /b 1
)

:: 3. Prüfen, ob node_modules Ordner existiert, falls nicht -> npm install ausführen
if exist node_modules goto start_server

echo [INFO] "node_modules" wurde nicht gefunden.
echo [INFO] Installiere benoetigte Bibliotheken (npm install)...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] npm install ist fehlgeschlagen!
    echo.
    pause
    exit /b %errorlevel%
)
echo.
echo [INFO] Bibliotheken erfolgreich installiert!
echo.

:start_server
echo [INFO] Oeffne Dashboard im Webbrowser...
:: Öffnet das Dashboard im Standard-Webbrowser des PCs
start http://localhost:8443

echo [INFO] Starte Server...
echo.
call npm start

if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] Server konnte nicht gestartet werden!
    pause
)
