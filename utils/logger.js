const { EmbedBuilder } = require('discord.js');
const db = require('./db');

module.exports = {
    logAction: async (client, action, user, moderator, reason, guild) => {
        const settings = db.getSettings(guild.id);
        const logChannelId = settings.logsChannel;
        if (!logChannelId) {
            console.log(`[Moderation Action] ${action} on ${user.tag} by ${moderator.tag}. Reason: ${reason}`);
            return;
        }

        try {
            const logChannel = await guild.channels.fetch(logChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle(`Action: ${action}`)
                    .setColor('Orange')
                    .addFields(
                        { name: 'User', value: `${user} (${user.id})`, inline: true },
                        { name: 'Moderator', value: `${moderator} (${moderator.id})`, inline: true },
                        { name: 'Reason', value: reason || 'No reason provided' }
                    )
                    .setTimestamp();
                
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Failed to send log message:', error);
        }
    }
};
