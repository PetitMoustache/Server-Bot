const db = require('./db');

module.exports = {
    updateStats: async (client, guildId = null) => {
        const guilds = guildId ? [client.guilds.cache.get(guildId)] : client.guilds.cache.values();

        for (const guild of guilds) {
            if (!guild) continue;

            const settings = db.getSettings(guild.id);
            if (!settings.statsEnabled) continue;

            try {
                // Fetch members to ensure presence data is available
                // Note: For very large servers, this might be heavy, but it's needed for Online count.
                // We only do this if online channel is configured.
                if (settings.statsOnlineChannelId) {
                    await guild.members.fetch();
                }

                const totalMembers = guild.memberCount;
                const onlineMembers = guild.members.cache.filter(m => 
                    m.presence && (m.presence.status === 'online' || m.presence.status === 'idle' || m.presence.status === 'dnd')
                ).size;

                // Update Total Channel
                if (settings.statsTotalChannelId) {
                    const totalChannel = guild.channels.cache.get(settings.statsTotalChannelId);
                    if (totalChannel) {
                        const newName = `👥 Total: ${totalMembers.toLocaleString()}`;
                        if (totalChannel.name !== newName) {
                            await totalChannel.setName(newName);
                        }
                    }
                }

                // Update Online Channel
                if (settings.statsOnlineChannelId) {
                    const onlineChannel = guild.channels.cache.get(settings.statsOnlineChannelId);
                    if (onlineChannel) {
                        const newName = `🟢 Online: ${onlineMembers.toLocaleString()}`;
                        if (onlineChannel.name !== newName) {
                            await onlineChannel.setName(newName);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error updating stats for guild ${guild.id}:`, error);
            }
        }
    }
};
