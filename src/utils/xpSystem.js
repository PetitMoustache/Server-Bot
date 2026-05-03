const { load, save } = require("./xpDb");

const xpCooldown = new Map();

function addXP(userId, guildId) {
  const db = load();

  if (!db[guildId]) db[guildId] = {};
  if (!db[guildId][userId]) {
    db[guildId][userId] = {
      xp: 0,
      level: 1,
      rep: 0
    };
  }

  const key = `${userId}_${guildId}`;
  const now = Date.now();

  // 10 second cooldown for XP gain
  if (xpCooldown.has(key) && now - xpCooldown.get(key) < 10000) {
    return null;
  }

  xpCooldown.set(key, now);

  const user = db[guildId][userId];

  const gain = Math.floor(Math.random() * 10) + 5;
  user.xp += gain;

  const needed = user.level * 100;

  let leveledUp = false;

  if (user.xp >= needed) {
    user.xp = 0;
    user.level++;
    leveledUp = true;
  }

  save(db);

  return { gain, level: user.level, leveledUp };
}

module.exports = { addXP };
