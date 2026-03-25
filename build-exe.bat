@echo off
echo ========================================
echo  Case Clicker — Building Portable EXE
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Installing dependencies...
call npm install
if errorlevel 1 goto :error

echo.
echo [2/4] Installing Electron + Builder...
call npm install --save-dev electron electron-builder
if errorlevel 1 goto :error

echo.
echo [3/4] Building React client...
cd client
call npm install
call npm run build
cd ..
if errorlevel 1 goto :error

echo.
echo [4/4] Packaging portable EXE...
call npx electron-builder --win portable
if errorlevel 1 goto :error

echo.
echo ========================================
echo  SUCCESS! EXE is in the /release folder
echo ========================================
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo  BUILD FAILED — check errors above
echo ========================================
pause
exit /b 1
