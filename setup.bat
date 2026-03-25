@echo off
echo ================================
echo CS:GO Case Simulator Setup
echo ================================
echo.
echo Installing root dependencies...
cd /d "%~dp0"
call npm install
echo.
echo Installing client dependencies...
cd client
call npm install
echo.
echo ================================
echo Setup complete! Run: npm run dev
echo ================================
pause
