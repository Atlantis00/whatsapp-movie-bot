[Setup]
AppName=WhatsApp Movie Bot
AppVersion=1.0
DefaultDirName=C:\WhatsAppMovieBot
DefaultGroupName=WhatsApp Movie Bot
OutputDir=.
OutputBaseFilename=CinemaBot_Installer_v1
Compression=lzma2
SolidCompression=yes
SetupIconFile=compiler:SetupClassicIcon.ico
UninstallDisplayIcon=compiler:SetupClassicIcon.ico
PrivilegesRequired=admin
DisableWelcomePage=no

[Files]
; Copia tutti i file necessari escludendo node_modules e script privati
Source: "AVVIA_BOT.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "BOT_GUARDBOT.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".env.example"; DestDir: "{app}"; DestName: ".env"; Flags: ignoreversion
Source: "install_deps.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "dati\config.default.json"; DestDir: "{app}\dati"; DestName: "config.json"; Flags: ignoreversion
Source: "dati\*"; DestDir: "{app}\dati"; Excludes: "subscribers.json,config.json"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Crea una scorciatoia sul desktop
Name: "{commondesktop}\WhatsApp Movie Bot"; Filename: "{app}\BOT_GUARDBOT.vbs"; IconFilename: "cmd.exe"; Comment: "Avvia il Bot di WhatsApp"

[Run]
; Esegui lo script che installa node.js in background e fa npm install
Filename: "{app}\install_deps.bat"; Description: "Installazione Dipendenze e Librerie Bot"; Flags: postinstall waituntilterminated

[UninstallDelete]
; Rimuovi forzatamente node_modules e file generati a runtime (cartella dati, .env) alla disinstallazione
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\dati"
Type: files; Name: "{app}\.env"
Type: dirifempty; Name: "{app}"
