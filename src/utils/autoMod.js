const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const FORBIDDEN_WORDS = ['spam', 'scam', 'hack', 'nitro', 'free']; // Example words
const userMessageHistory = new Map();

async function checkMessage(message) {
    if (message.author.bot || !message.guild || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

    const content = message.content.toLowerCase();
    
    // 1. Forbidden Words
    const hasForbidden = FORBIDDEN_WORDS.some(word => content.includes(word));
    if (hasForbidden) {
        await message.delete().catch(() => {});
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setDescription(`⚠️ ${message.author}, your message contained forbidden content and was removed.`);
        const warnMsg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return true;
    }

    // 2. Spam Detection (Simple rate limiting)
    const key = `${message.author.id}_${message.guild.id}`;
    const now = Date.now();
    const history = userMessageHistory.get(key) || [];
    
    // Keep only messages from the last 5 seconds
    const recentMessages = history.filter(time => now - time < 5000);
    recentMessages.push(now);
    userMessageHistory.set(key, recentMessages);

    if (recentMessages.length > 5) {
        await message.delete().catch(() => {});
        const embed = new EmbedBuilder()
            .setColor('Orange')
            .setDescription(`🚫 ${message.author}, please stop spamming! You are messaging too fast.`);
        const warnMsg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        return true;
    }

    return false;
}

module.exports = { checkMessage };
