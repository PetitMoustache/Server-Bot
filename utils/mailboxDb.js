const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'mailbox.json');

function load() {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
    try {
        return JSON.parse(fs.readFileSync(file));
    } catch (e) {
        return {};
    }
}

function save(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function addMessage(userId, guildId, type, content) {
    const db = load();
    if (!db[userId]) db[userId] = {};
    if (!db[userId][guildId]) db[userId][guildId] = [];
    
    db[userId][guildId].push({
        id: Date.now().toString(),
        type,
        content,
        timestamp: Date.now(),
        status: 'unread'
    });
    save(db);
}

function getMessages(userId, guildId) {
    const db = load();
    return db[userId]?.[guildId] || [];
}

function markAllAsRead(userId, guildId) {
    const db = load();
    if (db[userId]?.[guildId]) {
        db[userId][guildId].forEach(m => m.status = 'read');
        save(db);
    }
}

function clearMailbox(userId, guildId) {
    const db = load();
    if (db[userId]?.[guildId]) {
        db[userId][guildId] = [];
        save(db);
    }
}

module.exports = { addMessage, getMessages, markAllAsRead, clearMailbox };
