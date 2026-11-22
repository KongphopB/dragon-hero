@echo off
rem Dragon Hero classroom server: double-click, keep the window open during the lesson.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed. Download the LTS version from https://nodejs.org
  echo   then double-click this file again.
  echo.
  pause
  exit /b 1
)
start "" http://localhost:8080/classroom/host.html
node server\index.js
pause
