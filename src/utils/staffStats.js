const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'staff_stats.json');

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

function recordResponse(guildId, staffId, responseTimeMs) {
    const db = load();
    if (!db[guildId]) db[guildId] = {};
    if (!db[guildId][staffId]) {
        db[guildId][staffId] = {
            ticketsResolved: 0,
            totalResponseTime: 0,
            totalRatings: 0,
            ratingCount: 0
        };
    }

    const staff = db[guildId][staffId];
    staff.ticketsResolved++;
    staff.totalResponseTime += responseTimeMs;
    save(db);
}

function addRating(guildId, staffId, rating) {
    const db = load();
    if (db[guildId]?.[staffId]) {
        db[guildId][staffId].totalRatings += rating;
        db[guildId][staffId].ratingCount++;
        save(db);
    }
}

function getStaffStats(guildId, staffId) {
    const db = load();
    const stats = db[guildId]?.[staffId];
    if (!stats) return null;

    return {
        ...stats,
        avgResponseTime: Math.round(stats.totalResponseTime / stats.ticketsResolved / 1000 / 60), // in minutes
        avgRating: stats.ratingCount > 0 ? (stats.totalRatings / stats.ratingCount).toFixed(1) : "N/A"
    };
}

module.exports = { recordResponse, addRating, getStaffStats, load };
