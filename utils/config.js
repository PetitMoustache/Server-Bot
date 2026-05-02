const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "data", "tickets.json");

// Ensure data directory exists
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

function load() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (e) {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function createTicket(guildId, ticketId, data) {
  const db = load();
  if (!db[guildId]) db[guildId] = {};
  db[guildId][ticketId] = data;
  save(db);
}

function getTicket(guildId, ticketId) {
  const db = load();
  return db[guildId]?.[ticketId];
}

module.exports = { createTicket, getTicket };
