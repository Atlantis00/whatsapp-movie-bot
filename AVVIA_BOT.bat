@echo off
title 🍿 WHATSAPP MOVIE BOT - CINEMA FAMIGLIA
color 0B

:start
cls
echo ========================================================
echo   ⚙️  SISTEMA DI CONTROLLO BOT - GUARDBOT ATTIVO 🛡️
echo            [ Sviluppato da Gabriele Zarantonello ]
echo ========================================================
echo.
echo   [!] AVVISO IMPORTANTE PER IL CINEMA:
echo   ------------------------------------------------------
echo   1. NON CHIUDERE QUESTA FINESTRA CON LA "X" in alto!
echo      Se la chiudi, il bot smette di funzionare.
echo.
echo   2. Per nascondere questa finestra, clicca su "-" 
echo      (Riduci a icona). Il bot restera' attivo.
echo.
echo   3. Per spegnere il bot correttamente, usa il tasto 
echo      "Arresta" nella Dashboard Web.
echo   ------------------------------------------------------

:loop
:: CONTROLLO AGGIORNAMENTI REMOTI
if exist "update.zip" (
    echo.
    echo ------------------------------------------------------
    echo [PROCESSO] Rilevato aggiornamento del codice!
    echo [%time%] Estrazione file in corso...
    powershell -Command "Expand-Archive -Path 'update.zip' -DestinationPath '.' -Force"
    del "update.zip"
    echo [SUCCESS] Aggiornamento installato con successo.
    echo ------------------------------------------------------
    timeout /t 2 >nul
)

echo.
echo [%time%] [INFO] Avvio del processo Node.js...
node src/index.js

:: LOGICA DI RIAVVIO AUTOMATICO PERMANENTE
:: Riavvia con QUALSIASI codice tranne il 99 (Stop dalla Dashboard)
if %errorlevel% neq 99 (
    echo.
    echo ------------------------------------------------------
    echo [ALERT] Rilevato arresto imprevisto o crash.
    echo [%time%] Il sistema ripartira' tra 5 secondi...
    echo ------------------------------------------------------
    timeout /t 5
    goto loop
)

echo [OK] Spegnimento ordinato confermato dalla Dashboard.
exit 99
