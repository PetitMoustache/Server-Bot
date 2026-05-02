const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('./logger');

// In-memory storage for abuse tracking
// userId -> { actionType, content, timestamp, count, isBlocked, blockExpiresAt }
const abuseTracker = new Map();

function checkAbuse(interaction, type, content) {
    const userId = interaction.user.id;
    const now = Date.now();
    const userData = abuseTracker.get(userId) || { count: 0, isBlocked: false, blockExpiresAt: 0 };

    // 1. Check if user is currently blocked
    if (userData.isBlocked) {
        if (now < userData.blockExpiresAt) {
            const timeLeft = Math.round((userData.blockExpiresAt - now) / 1000 / 60);
            const embed = new EmbedBuilder()
                .setTitle('⛔ Access Restricted')
                .setDescription(`You are temporarily restricted from using this command due to spam behavior.\n**Expires in:** ${timeLeft} minutes.`)
                .setColor('Red');
            interaction.reply({ embeds: [embed], ephemeral: true });
            return true; // Blocked
        } else {
            userData.isBlocked = false;
            userData.count = 0;
        }
    }

    // 2. Pattern detection
    const isSameAction = userData.lastAction === type && userData.lastContent === content;
    const isTooFast = userData.lastTimestamp && (now - userData.lastTimestamp < 5000); // 5 seconds window

    if (isSameAction && isTooFast) {
        userData.count++;
    } else {
        userData.count = Math.max(0, userData.count - 1); // Gradually decrease count if they behave
    }

    userData.lastAction = type;
    userData.lastContent = content;
    userData.lastTimestamp = now;

    // 3. Escalation
    if (userData.count >= 3) {
        userData.isBlocked = true;
        userData.blockExpiresAt = now + (15 * 60 * 1000); // 15 minutes block
        abuseTracker.set(userId, userData);

        // Notify User
        const blockEmbed = new EmbedBuilder()
            .setTitle('⚠️ Temporary Block Applied')
            .setDescription('⛔ You are temporarily restricted due to spam behavior. Staff has been notified.')
            .setColor('Red');
        interaction.reply({ embeds: [blockEmbed], ephemeral: true });

        // Alert Staff
        const staffEmbed = new EmbedBuilder()
            .setTitle('🚨 USER ABUSE DETECTED')
            .addFields(
                { name: 'User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: 'Type', value: `Spam ${type}`, inline: true },
                { name: 'Content', value: content.substring(0, 512) || 'None' },
                { name: 'Status', value: 'Temporarily Blocked (15 min)' }
            )
            .setColor('DarkRed')
            .setTimestamp();

        // Send to logs channel
        const db = require('./db');
        const settings = db.getSettings(interaction.guild.id);
        const logsChannel = interaction.guild.channels.cache.get(settings.logsChannel);
        if (logsChannel) logsChannel.send({ embeds: [staffEmbed] });

        return true; // Blocked
    }

    abuseTracker.set(userId, userData);
    return false; // Not blocked
}

module.exports = { checkAbuse };
