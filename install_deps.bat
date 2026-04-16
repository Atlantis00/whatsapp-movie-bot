@echo off
setlocal
color 0B
title Installazione WhatsApp Movie Bot
echo ========================================================
echo   CONFIGURAZIONE INIZIALE WHATSAPP MOVIE BOT
echo ========================================================
echo.
echo [1] Verifica presenza di Node.js...
node -v >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js e' gia' installato!
    goto install_npm
)

echo [!] Node.js non trovato. Avvio download automatico...
powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi' -OutFile 'node_installer.msi'"
if exist "node_installer.msi" (
    echo [INFO] Installazione di Node.js in corso (attendi...^).
    msiexec /i node_installer.msi /quiet /norestart
    del node_installer.msi
    echo [OK] Node.js installato correttamente in background.
) else (
    echo [ERRORE] Impossibile scaricare Node.js.
    echo Per favore, scarica e installa Node.js manualmente da https://nodejs.org/
    pause
    exit /b 1
)

:install_npm
echo.
echo [2] Installazione delle librerie del Bot (npm install^)...
echo Questo passaggio puo' richiedere alcuni minuti, non chiudere.

:: Cerca npm nei percorsi noti se l'environment non si è aggiornato
if exist "C:\Program Files\nodejs\npm.cmd" (
    call "C:\Program Files\nodejs\npm.cmd" install --no-fund --no-audit
) else (
    call npm install --no-fund --no-audit
)

echo.
echo ========================================================
echo   INSTALLAZIONE COMPLETATA!
echo ========================================================
echo Ora puoi avviare il bot dal collegamento "WhatsApp Movie Bot"
echo che trovi sul Desktop.
echo.
pause
exit /b 0
