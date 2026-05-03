const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
    logAction: async (client, action, user, moderator, reason, guild) => {
        const settings = db.getSettings(guild.id);
        const logChannelId = settings.logsChannel;
        
        if (!logChannelId) {
            console.log(`[LOG] ${action}: ${user.tag} by ${moderator.tag}. Reason: ${reason}`);
            return;
        }

        try {
            const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle(`📝 Log Action: ${action}`)
                .setColor('#F1C40F') // Yellow/Gold for logs
                .addFields(
                    { name: '👤 Target', value: `${user} (\`${user.id}\`)`, inline: true },
                    { name: '👮 Moderator', value: `${moderator} (\`${moderator.id}\`)`, inline: true },
                    { name: '📄 Reason', value: `\`\`\`${reason || 'No reason provided'}\`\`\`` }
                )
                .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
                .setTimestamp();
            
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('[LOGGER ERROR] Failed to send log:', error);
        }
    }
};
