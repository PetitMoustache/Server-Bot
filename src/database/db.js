const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

function getFilePath(fileName) {
  return path.join(DATA_DIR, fileName.endsWith(".json") ? fileName : `${fileName}.json`);
}

function load(fileName) {
  const file = getFilePath(fileName);
  if (!fs.existsSync(file)) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, "{}");
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    console.error(`Error loading ${fileName}:`, e);
    return {};
  }
}

function save(fileName, data) {
  const file = getFilePath(fileName);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error(`Error saving ${fileName}:`, e);
    return false;
  }
}

// Guild-specific helper
function getGuildData(guildId) {
  const db = load("guilds");
  if (!db[guildId]) {
    db[guildId] = {
      settings: {
        ticketsChannel: null,
        logsChannel: null,
        reportsChannel: null,
        statsEnabled: false
      },
      xp: {}
    };
    save("guilds", db);
  }
  return db[guildId];
}

function updateGuildData(guildId, newData) {
  const db = load("guilds");
  db[guildId] = { ...db[guildId], ...newData };
  return save("guilds", db);
}

// Compatibility Layer
function getSettings(guildId) {
  const data = getGuildData(guildId);
  return data.settings || {};
}

function saveSettings(guildId, newSettings) {
  const data = getGuildData(guildId);
  data.settings = { ...data.settings, ...newSettings };
  return updateGuildData(guildId, data);
}

module.exports = { load, save, getGuildData, updateGuildData, getSettings, saveSettings };
