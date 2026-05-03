const Guild = require("../models/Guild");

/**
 * 🛠️ DATABASE SERVICE (MongoDB Migration)
 * All functions are now ASYNC.
 */

async function getGuildData(guildId) {
  try {
    let data = await Guild.findOne({ guildId });
    if (!data) {
      data = await Guild.create({ 
        guildId,
        settings: {
          ticketsChannel: null,
          logsChannel: null,
          reportsChannel: null,
          statsEnabled: false
        }
      });
    }
    return data;
  } catch (err) {
    console.error(`Error getting guild data for ${guildId}:`, err);
    return null;
  }
}

async function updateGuildData(guildId, newData) {
  try {
    return await Guild.findOneAndUpdate({ guildId }, newData, { new: true, upsert: true });
  } catch (err) {
    console.error(`Error updating guild data for ${guildId}:`, err);
    return null;
  }
}

async function getSettings(guildId) {
  const data = await getGuildData(guildId);
  return data?.settings || {};
}

async function saveSettings(guildId, newSettings) {
  try {
    const data = await getGuildData(guildId);
    if (data) {
      data.settings = { ...data.settings, ...newSettings };
      await data.save();
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error saving settings for ${guildId}:`, err);
    return false;
  }
}

// Legacy Compatibility Layer (No longer uses files)
async function load(fileName) {
    console.warn(`[DB] load("${fileName}") called. JSON storage is deprecated. Please use Models directly.`);
    // Returns an empty object or handled specifically if needed
    // In this migration, we are moving away from the "all-in-one-json" approach
    return {}; 
}

async function save(fileName, data) {
    console.warn(`[DB] save("${fileName}") called. JSON storage is deprecated.`);
    return true;
}

module.exports = { 
  getGuildData, 
  updateGuildData, 
  getSettings, 
  saveSettings,
  load,
  save 
};
