const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'memory.json');

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

function updateMemory(userId, guildId, isStaff = false) {
    const db = load();
    if (!db[guildId]) db[guildId] = {};
    if (!db[guildId][userId]) {
        db[guildId][userId] = {
            lastInteraction: Date.now(),
            mentionCount: 0,
            isStaff: isStaff,
            interactionCount: 0
        };
    }

    const user = db[guildId][userId];
    const prevInteraction = user.lastInteraction;
    user.lastInteraction = Date.now();
    user.interactionCount++;
    user.isStaff = isStaff;

    save(db);

    return { 
        prevInteraction, 
        interactionCount: user.interactionCount,
        timeSinceLast: Date.now() - prevInteraction
    };
}

function incrementMention(userId, guildId) {
    const db = load();
    if (!db[guildId]?.[userId]) return;
    db[guildId][userId].mentionCount++;
    save(db);
}

function getMemory(userId, guildId) {
    const db = load();
    return db[guildId]?.[userId];
}

module.exports = { updateMemory, incrementMention, getMemory };
