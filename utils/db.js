const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'settings.json');

// Ensure data directory and file exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}), 'utf-8');
}

module.exports = {
    getSettings: (guildId) => {
        try {
            const data = fs.readFileSync(dbPath, 'utf-8');
            const settings = JSON.parse(data);
            return settings[guildId] || {};
        } catch (error) {
            console.error('Error reading database:', error);
            return {};
        }
    },
    saveSettings: (guildId, newSettings) => {
        try {
            const data = fs.readFileSync(dbPath, 'utf-8');
            const settings = JSON.parse(data);
            
            settings[guildId] = {
                ...settings[guildId],
                ...newSettings
            };

            fs.writeFileSync(dbPath, JSON.stringify(settings, null, 4), 'utf-8');
            return true;
        } catch (error) {
            console.error('Error writing to database:', error);
            return false;
        }
    }
};
