@echo off
title Minecraft Multiplayer Server
echo.
echo ================================================
echo   Minecraft Beta Game - Starting Servers
echo ================================================
echo.

REM Start the multiplayer server in a new window
echo [1/2] Starting multiplayer server...
start "Multiplayer Server" cmd /k "cd /d %~dp0 && C:/Users/Admin/Documents/.venv/Scripts/python.exe multiplayer_server.py"
timeout /t 2 /nobreak >nul

REM Start the HTTP server
echo [2/2] Starting HTTP server...
echo.
echo ================================================
echo   Both servers are running!
echo ================================================
echo.
echo - Multiplayer Server: ws://localhost:8765
echo - HTTP Server:        http://localhost:8080
echo.
echo Open your browser and go to:
echo http://localhost:8080/vanilla.html
echo.
echo Press Ctrl+C to stop the HTTP server
echo (Close other window to stop multiplayer server)
echo ================================================
echo.

python -m http.server 8080
