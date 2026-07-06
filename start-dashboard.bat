@echo off
:: Neo Deck - Smart Home Dashboard Windows Bootstrapper
::

:: Aktiviert ANSI Escape Codes in CMD
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"

set "GREEN=%ESC%[1;32m"
set "CYAN=%ESC%[1;36m"
set "YELLOW=%ESC%[1;33m"
set "RED=%ESC%[1;31m"
set "PURPLE=%ESC%[1;35m"
set "BLUE=%ESC%[1;34m"
set "WHITE=%ESC%[1;37m"
set "NC=%ESC%[0m"
set "BOLD=%ESC%[1m"

:: Status-Labels
set "INFO=%CYAN%[ INFO ]%NC%"
set "SUCCESS=%GREEN%[  OK  ]%NC%"
set "WARNING=%YELLOW%[ WARN ]%NC%"
set "ERROR=%RED%[ FEHL ]%NC%"
set "PROMPT=%PURPLE%[ EING ]%NC%"

title Neo Deck Smart Home Dashboard

cls
echo %CYAN%ÚÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¿%NC%
echo %CYAN%³%NC%  %WHITE%%BOLD% _  _ ____ ____    ___  ____ ____ _  _              %NC%%CYAN%³%NC%
echo %CYAN%³%NC%  %WHITE%%BOLD% ^|\ ^| ^|___ ^|  ^|    ^|  \ ^|___ ^|    ^|_/               %NC%%CYAN%³%NC%
echo %CYAN%³%NC%  %WHITE%%BOLD% ^| \ ^| ^|___ ^|__^|    ^|__/ ^|___ ^|___ ^| \               %NC%%CYAN%³%NC%
echo %CYAN%³%NC%                                                        %CYAN%³%NC%
echo %CYAN%³%NC%        %GREEN%Smart Home Dashboard - Start-Assistent%NC%          %CYAN%³%NC%
echo %CYAN%ÀÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÙ%NC%
echo.

:: Phase 1: Node.js & npm Prfung
echo %BLUE%%BOLD%=== Phase 1: System-Prfung ===%NC%
echo %INFO% Analysiere Systemkomponenten...

where node >nul 2>nul
if %errorlevel% equ 0 goto node_ok

if exist "C:\Program Files\nodejs\node.exe" goto node_standard
if exist "C:\Program Files (x86)\nodejs\node.exe" goto node_x86
if exist "%LOCALAPPDATA%\Programs\node\nodejs\node.exe" goto node_local_programs
if exist "%LOCALAPPDATA%\nodejs\node.exe" goto node_local

:: Node.js nicht gefunden - Install-Angebot per winget
echo   ^>  Node.js:  %YELLOW%Fehlt [!]%NC%
echo.
echo %WARNING% Node.js konnte auf diesem PC nicht gefunden werden!
echo.
echo %PROMPT% M”chtest du Node.js automatisch ber den Windows Package Manager (winget) installieren?
set /p install_choice="      Installieren? (J/N, Standard: J): "
if /i "%install_choice%"=="n" goto no_node

echo.
echo %INFO% Installiere Node.js via winget...
winget install --id OpenJS.NodeJS --silent --accept-package-agreements --accept-source-agreements
if %errorlevel% neq 0 (
    echo.
    echo %ERROR% Automatische Installation fehlgeschlagen!
    goto no_node
)
echo %SUCCESS% Node.js wurde erfolgreich installiert!
echo %INFO% Aktualisiere System-Pfade fr diese Sitzung...

:: Pfade neu laden (fr die aktuelle Session)
set "PATH=%PATH%;C:\Program Files\nodejs;%LOCALAPPDATA%\Programs\node\nodejs"
where node >nul 2>nul
if %errorlevel% equ 0 goto node_ok

:no_node
echo.
echo %ERROR% Node.js ist zwingend erforderlich, um das Dashboard auszufhren!
echo         Bitte installiere Node.js manuell von: https://nodejs.org/
echo.
pause
exit /b 1

:node_standard
echo [INFO] Node.js im Standardverzeichnis gefunden.
set "PATH=%PATH%;C:\Program Files\nodejs"
goto node_ok

:node_x86
echo [INFO] Node.js im Standardverzeichnis (x86) gefunden.
set "PATH=%PATH%;C:\Program Files (x86)\nodejs"
goto node_ok

:node_local_programs
echo [INFO] Node.js im Benutzerverzeichnis (Programs) gefunden.
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\node\nodejs"
goto node_ok

:node_local
echo [INFO] Node.js im Benutzerverzeichnis gefunden.
set "PATH=%PATH%;%LOCALAPPDATA%\nodejs"
goto node_ok

:node_ok
echo   ^>  Node.js:  %GREEN%Installiert [OK]%NC%

:: 2. Prfen, ob npm erreichbar ist
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo %ERROR% Der Paketmanager 'npm' konnte nicht gefunden werden!
    echo         Bitte installiere Node.js erneut.
    echo.
    pause
    exit /b 1
)
echo   ^>  npm:      %GREEN%Installiert [OK]%NC%
echo.

:: Phase 2: Abh„ngigkeiten prfen (npm install)
echo %BLUE%%BOLD%=== Phase 2: Abh„ngigkeiten ===%NC%
if exist node_modules goto start_server

echo %INFO% "node_modules" wurde nicht gefunden.
echo %INFO% Installiere ben”tigte JavaScript-Bibliotheken (npm install)...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo %ERROR% npm install ist fehlgeschlagen!
    echo.
    pause
    exit /b %errorlevel%
)
echo.
echo %SUCCESS% Bibliotheken erfolgreich installiert!
echo.

:start_server
echo %BLUE%%BOLD%=== Phase 3: Start ===%NC%
echo %INFO% Starte Webserver auf Port 8443...
echo %INFO% ™ffne Browser: %CYAN%https://localhost:8443%NC%
echo.

:: Startet den Webbrowser verz”gert (um dem Server Zeit zum Booten zu geben)
start "" cmd /c "timeout /t 2 >nul && start https://localhost:8443"

set PORT=8443
call npm start

if %errorlevel% neq 0 (
    echo.
    echo %ERROR% Server konnte nicht gestartet werden!
    pause
)\n