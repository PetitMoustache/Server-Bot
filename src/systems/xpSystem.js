const User = require("../models/User");

const xpCooldown = new Map();

async function addXP(userId, guildId) {
  try {
    let user = await User.findOne({ userId, guildId });
    
    if (!user) {
      user = await User.create({ userId, guildId });
    }

    const key = `${userId}_${guildId}`;
    const now = Date.now();

    // 10 second cooldown for XP gain
    if (xpCooldown.has(key) && now - xpCooldown.get(key) < 10000) {
      return null;
    }

    xpCooldown.set(key, now);

    const gain = Math.floor(Math.random() * 10) + 5;
    user.xp += gain;

    const needed = user.level * 100;
    let leveledUp = false;

    if (user.xp >= needed) {
      user.xp = 0;
      user.level++;
      leveledUp = true;
    }

    await user.save();

    return { gain, level: user.level, leveledUp };
  } catch (err) {
    console.error(`[XP SYSTEM] Error adding XP for ${userId}:`, err);
    return null;
  }
}

module.exports = { addXP };
