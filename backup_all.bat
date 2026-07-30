@echo off
title Smart Home - Komplett-Backup-Assistent 🔄
echo ===================================================
echo   Smart Home - Komplett-Backup-Assistent
echo ===================================================
echo.
echo Dieses Skript sichert ALLE Projekte und das gesamte
echo KI-Gedaechtnis auf D:\Projekt Smarthome.
echo.
pause
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup_all.ps1"
echo.
pause
