@echo off
title RESENHAPG
echo Iniciando RESENHAPG Offline...
start /b npm run dev
timeout /t 3 /nobreak >nul
start msedge --app=http://localhost:8080
