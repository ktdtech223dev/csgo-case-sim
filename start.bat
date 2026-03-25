@echo off
echo Starting CS:GO Case Simulator...
cd /d "%~dp0"
call npx concurrently "node server/index.js" "cd client && npx vite"
