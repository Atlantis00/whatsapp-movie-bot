const InnoSetup = require("innosetup-compiler");
const path = require("path");
const fs = require("fs");

console.log("⚙️  Avvio generazione dell'Installer in corso...");
console.log("Attendere, la compilazione puo' richiedere qualche istante...");

const issPath = path.join(__dirname, "installer.iss");

if (!fs.existsSync(issPath)) {
    console.error("❌ ERRORE: File installer.iss non trovato.");
    process.exit(1);
}

InnoSetup(issPath, { gui: false }, function (error) {
    if (error) {
        console.error("❌ ERRORE durante la compilazione dell'installer:");
        console.error(error);
    } else {
        console.log("\n✅ COMPILAZIONE COMPLETATA CON SUCCESSO!");
        console.log("👉 Troverai il file 'CinemaBot_Installer_v1.exe' in questa cartella.");
        console.log("Puoi passarlo su qualsiasi PC Windows per installare il bot!");
    }
});
