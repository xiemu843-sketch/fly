@echo off
setlocal
cd /d "%~dp0"

node server.js --no-open

pause
