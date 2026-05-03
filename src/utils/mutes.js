const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'mutes.json');

function load() {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
    try {
        return JSON.parse(fs.readFileSync(file));
    } catch (e) {
        return [];
    }
}

function save(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function addMute(userId, guildId, expiresAt) {
    const mutes = load();
    mutes.push({ userId, guildId, expiresAt });
    save(mutes);
}

function removeMute(userId, guildId) {
    let mutes = load();
    mutes = mutes.filter(m => !(m.userId === userId && m.guildId === guildId));
    save(mutes);
}

module.exports = { load, addMute, removeMute };
