const db = require('../database/db');

module.exports = {
    updateStats: async (client, guildId = null) => {
        const guilds = guildId ? [client.guilds.cache.get(guildId)] : client.guilds.cache.values();

        for (const guild of guilds) {
            if (!guild) continue;

            const settings = await db.getSettings(guild.id);
            if (!settings.statsEnabled) continue;


            try {
                if (settings.statsOnlineChannelId) {
                    await guild.members.fetch();
                }

                const totalMembers = guild.memberCount;
                const onlineMembers = guild.members.cache.filter(m => 
                    m.presence && (m.presence.status === 'online' || m.presence.status === 'idle' || m.presence.status === 'dnd')
                ).size;

                if (settings.statsTotalChannelId) {
                    const totalChannel = guild.channels.cache.get(settings.statsTotalChannelId);
                    if (totalChannel) {
                        const newName = `👥 Total: ${totalMembers.toLocaleString()}`;
                        if (totalChannel.name !== newName) {
                            await totalChannel.setName(newName);
                        }
                    }
                }

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
                console.error(`[STATS ERROR] Guild ${guild.id}:`, error);
            }
        }
    }
};
