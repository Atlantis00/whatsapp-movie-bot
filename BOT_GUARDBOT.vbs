Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' --- CONTROLLO ISTANZA SINGOLA (Anti-Conflitto) ---
Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")
Set colItems = objWMIService.ExecQuery("Select * from Win32_Process Where Name = 'wscript.exe'")
count = 0
For Each objItem in colItems
    ' Controlla se la riga di comando contiene il nome di questo script
    If InStr(LCase(objItem.CommandLine), "bot_guardbot.vbs") > 0 Then
        count = count + 1
    End If
Next

' Se è già in esecuzione un altro GuardBot, esci silenziosamente
If count > 1 Then
    WScript.Quit
End If

' --- AVVIO INIZIALE ---
' Ottiene il percorso della cartella dello script
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = """" & scriptDir & "\AVVIA_BOT.bat"""

' Apre la Dashboard SOLO UNA VOLTA all'avvio del Guardiano
' In questo modo i riavvii automatici non apriranno altre schede
WshShell.Run "http://localhost:3000", 1, False

' --- CICLO DI MONITORAGGIO PERMANENTE ---
Do
    ' Esegue il file batch in una finestra normale (1)
    ' True indica di attendere la fine del processo prima di continuare
    exitCode = WshShell.Run(batPath, 1, True)
    
    ' Se l'exit code è 99 (Stop volontario dalla Dashboard), il Guardiano si ferma
    If exitCode = 99 Then
        Exit Do
    End If
    
    ' In ogni altro caso (X premuta, crash, errori), il Guardiano riapre il bot dopo 5 secondi
    WScript.Sleep 5000
Loop

Set WshShell = Nothing
Set fso = Nothing
