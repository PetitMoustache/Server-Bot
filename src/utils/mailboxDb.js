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

function addMessage(userId, guildId, type, content, senderId = 'System', subject = 'No Subject') {
    const db = load();
    if (!db[userId]) db[userId] = {};
    if (!db[userId][guildId]) db[userId][guildId] = [];
    
    db[userId][guildId].push({
        id: Math.random().toString(36).substr(2, 9),
        senderId,
        subject,
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

function deleteMessage(userId, guildId, messageId) {
    const db = load();
    if (db[userId]?.[guildId]) {
        db[userId][guildId] = db[userId][guildId].filter(m => m.id !== messageId);
        save(db);
    }
}

function getMessageById(userId, guildId, messageId) {
    const db = load();
    return db[userId]?.[guildId]?.find(m => m.id === messageId);
}

function markAsRead(userId, guildId, messageId) {
    const db = load();
    if (db[userId]?.[guildId]) {
        const message = db[userId][guildId].find(m => m.id === messageId);
        if (message) {
            message.status = 'read';
            save(db);
        }
    }
}

module.exports = { addMessage, getMessages, markAllAsRead, clearMailbox, deleteMessage, getMessageById, markAsRead };
