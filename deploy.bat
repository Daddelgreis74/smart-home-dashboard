@echo off
title Debian Server Update 🚀
echo ===================================================
echo   Debian Smart Home Dashboard - Live-Update
echo ===================================================
echo.
echo [INFO] Verbinde mit Debian-Server unter 192.168.178.101...
echo [INFO] Bitte gib gleich dein root-Passwort ein, wenn du dazu aufgefordert wirst.
echo.

:: Führt SSH-Befehl aus, um in den Ordner zu wechseln und git pull auszuführen
ssh root@192.168.178.101 "cd /root/.openclaw/workspace/smart-home-dashboard && echo [Debian] Führe git pull aus... && git pull"

echo.
echo ===================================================
echo [INFO] Update-Prozess beendet!
echo [INFO] Die Dateien auf deinem Debian-Server sind nun aktuell.
echo ===================================================
echo.
pause
