@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Case Clicker — Build + GitHub Release
echo ========================================
echo.

cd /d "%~dp0"

:: Read current version
for /f "tokens=2 delims=:, " %%a in ('findstr "\"version\"" package.json') do set RAW_VERSION=%%a
set OLD_VERSION=%RAW_VERSION:"=%
echo Current version: %OLD_VERSION%

:: Parse major.minor.patch
for /f "tokens=1,2,3 delims=." %%a in ("%OLD_VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

:: Bump patch version
set /a PATCH=%PATCH%+1
set NEW_VERSION=%MAJOR%.%MINOR%.%PATCH%
echo Bumping to: %NEW_VERSION%
echo.

:: Update version in package.json
powershell -Command "(Get-Content package.json) -replace '\"version\": \"%OLD_VERSION%\"', '\"version\": \"%NEW_VERSION%\"' | Set-Content package.json"

:: Also bump client version
powershell -Command "(Get-Content client\package.json) -replace '\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"', '\"version\": \"%NEW_VERSION%\"' | Set-Content client\package.json"

:: Step 1: Install deps
echo [1/5] Installing dependencies...
call npm install
if errorlevel 1 goto :error

:: Step 2: Build client
echo.
echo [2/5] Building React client...
cd client
call npm install
call npm run build
cd ..
if errorlevel 1 goto :error

:: Step 3: Install electron deps and build exe
echo.
echo [3/5] Installing Electron...
call npm install --save-dev electron electron-builder
if errorlevel 1 goto :error

echo.
echo [4/5] Packaging portable EXE...
call npx electron-builder --win portable
if errorlevel 1 goto :error

:: Find the exe
set EXE_PATH=release\CaseClicker.exe
if not exist "%EXE_PATH%" (
    echo ERROR: CaseClicker.exe not found in release folder
    goto :error
)

echo.
echo [5/5] Pushing to GitHub + Creating Release...

:: Commit, tag, push
git add -A
git commit -m "release: v%NEW_VERSION%"
git tag -f "v%NEW_VERSION%"
git push origin main
git push origin --tags -f

:: Create GitHub release
gh release create "v%NEW_VERSION%" "%EXE_PATH%" ^
  --repo ktdtech223dev/csgocasesim ^
  --title "Case Clicker v%NEW_VERSION%" ^
  --notes "## Case Clicker v%NEW_VERSION%

Download **CaseClicker.exe** below — portable, no install needed.

Double-click to launch. Pick your player and start clicking.

### Changes
- Auto-bumped from v%OLD_VERSION%

### Features
- 50 CS:GO cases, 491 skins, 20 knife types, 7 glove types
- Clicker with upgrades, case opening with animated reel
- Coinflip, Crash, Roulette gambling
- Inventory, Trade-ups, Market, Name Tags
- N Games crew integration" ^
  --latest

if errorlevel 1 (
    echo.
    echo WARNING: gh release may have failed. Check output above.
    echo You can manually upload: release\CaseClicker.exe
    goto :done
)

echo.
echo ========================================
echo  SUCCESS! v%NEW_VERSION% released
echo  Repo: github.com/ktdtech223dev/csgocasesim
echo  EXE:  release\CaseClicker.exe
echo ========================================
goto :done

:error
echo.
echo BUILD FAILED — check errors above
pause
exit /b 1

:done
pause
exit /b 0
