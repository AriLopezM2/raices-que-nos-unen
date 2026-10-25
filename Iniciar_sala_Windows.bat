@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo No se encontro Node.js en este equipo.
  echo Instala Node.js LTS desde https://nodejs.org/
  pause
  exit /b 1
)
echo Iniciando Raices que nos unen...
node server.js
echo.
echo El servidor se ha cerrado.
pause
