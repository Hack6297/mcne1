@echo off
title Minecraft - Single Player
echo.
echo ================================================
echo   Minecraft Beta Game - Single Player
echo ================================================
echo.
echo Starting HTTP server...
echo.
echo Server: http://localhost:8080
echo.
echo Open your browser and go to:
echo http://localhost:8080/vanilla.html
echo.
echo Press Ctrl+C to stop the server
echo ================================================
echo.

python -m http.server 8080
