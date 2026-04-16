const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataFile = path.join(__dirname, '../dati/subscribers.json');
const keyFile = path.join(__dirname, '../dati/db_key.txt');
const algorithm = 'aes-256-cbc';

function getEncryptionKey() {
    if (fs.existsSync(keyFile)) {
        return Buffer.from(fs.readFileSync(keyFile, 'utf8'), 'hex');
    }
    const newKey = crypto.randomBytes(32);
    fs.writeFileSync(keyFile, newKey.toString('hex'), 'utf8');
    return newKey;
}

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    try {
        const parts = text.split(':');
        if (parts.length !== 2) return null;
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = parts.join(':');
        const decipher = crypto.createDecipheriv(algorithm, getEncryptionKey(), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch(e) {
        return null;
    }
}

function readData() {
    if (!fs.existsSync(dataFile)) return {};
    
    const rawData = fs.readFileSync(dataFile, 'utf8');
    if (!rawData.trim()) return {};
    
    // Prova a decrittografare (Nuovo formato blindato)
    const decryptedText = decrypt(rawData);
    if (decryptedText) {
        try { return JSON.parse(decryptedText); } catch(e) { return {}; }
    }
    
    // Fallback: se fallisce, il file era nella vecchia versione in chiaro
    try { 
        return JSON.parse(rawData); 
    } catch(e) { 
        return {}; 
    }
}

function writeData(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const encryptedData = encrypt(jsonString);
    fs.writeFileSync(dataFile, encryptedData, 'utf8');
}

/**
 * Ritorna tutti gli iscritti
 */
function getAllSubscribers() {
    return readData();
}

/**
 * Aggiunge o imposta a true un subscriber
 */
function addSubscriber(chatId) {
    const data = readData();
    data[chatId] = {
        active: true,
        addedAt: data[chatId]?.addedAt || new Date().toISOString()
    };
    writeData(data);
    return data[chatId];
}

/**
 * Imposta a false (disiscritto) un subscriber
 */
function disableSubscriber(chatId) {
    const data = readData();
    if (data[chatId]) {
        data[chatId].active = false;
        writeData(data);
    }
}

/**
 * Elimina definitivamente un subscriber
 */
function removeSubscriber(chatId) {
    const data = readData();
    if (data[chatId]) {
        delete data[chatId];
        writeData(data);
    }
}

/**
 * Ritorna la lista di ID che devono ricevere il messaggio 
 */
function getActiveSubscribers() {
    const data = readData();
    return Object.keys(data).filter(chatId => data[chatId].active === true);
}

module.exports = {
    getAllSubscribers,
    addSubscriber,
    disableSubscriber,
    removeSubscriber,
    getActiveSubscribers
};
