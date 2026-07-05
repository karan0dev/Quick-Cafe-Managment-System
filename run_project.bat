@echo off
title QuickCafe Auto Run
echo ===================================================
echo   ☕ QuickCafe Setup & Run Script
echo ===================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    echo After installing, restart this script.
    pause
    exit /b
)
echo [OK] Node.js is installed.

:: 2. Check and copy .env
if not exist .env (
    echo [INFO] .env file not found. Copying .env.example to .env...
    copy .env.example .env >nul
    echo [WARNING] A new .env file has been created.
    echo Please make sure your MONGODB_URI in the .env file is correct.
) else (
    echo [OK] .env file found.
)

:: 3. Check and install dependencies
if not exist node_modules (
    echo [INFO] Installing dependencies (npm install)...
    call npm install
) else (
    echo [OK] Dependencies already installed.
)

:: 4. Seed Database
echo.
choice /M "Do you want to seed the database with demo data (clears current database first)?" /T 5 /D Y
if %errorlevel% equ 1 (
    echo [INFO] Seeding database (npm run seed)...
    call npm run seed
)
echo.

:: 5. Open browser and Start Server
echo [INFO] Starting QuickCafe server...
start http://localhost:3000/
call npm start

pause
