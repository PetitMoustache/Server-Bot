const { Events } = require('discord.js');
const statsUpdater = require('../utils/statsUpdater');
const db = require('../database/db');
const logger = require('../utils/logger');
const { sendToMailbox } = require('../utils/mailboxHelper');
const mutesDb = require('../utils/mutes');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[BOT] Ready! Logged in as ${client.user.tag}`);

        // Initial update
        await statsUpdater.updateStats(client);

        // Update every 10 minutes
        setInterval(() => {
            statsUpdater.updateStats(client);
        }, 10 * 60 * 1000);

        // ⏱️ REAL-TIME AUTOMATION SYSTEM (Check every 30 seconds)
        setInterval(async () => {
            const now = Date.now();

            // 1. AUTO UNMUTE
            const allMutes = mutesDb.load();
            for (const mute of allMutes) {
                if (now >= mute.expiresAt) {
                    const guild = client.guilds.cache.get(mute.guildId);
                    if (!guild) continue;

                    const member = await guild.members.fetch(mute.userId).catch(() => null);
                    const muteRole = guild.roles.cache.find(r => r.name === 'Muted');

                    if (member && muteRole && member.roles.cache.has(muteRole.id)) {
                        await member.roles.remove(muteRole, 'Mute expired (Auto)');
                        await sendToMailbox(guild, member.user, 'Moderation', '🔊 **Your mute duration has expired.** You have been unmuted.', 'Green', 'System', 'Mute Expired 🔊');
                        await logger.logAction(client, 'Auto Unmute', member.user, client.user, 'Duration expired', guild);
                    }
                    mutesDb.removeMute(mute.userId, mute.guildId);
                }
            }

            // 2. TICKET AUTO-ESCALATION (from guilds.json)
            const guildsData = db.load("guilds");
            let changed = false;

            for (const guildId in guildsData) {
                const guild = client.guilds.cache.get(guildId);
                if (!guild || !guildsData[guildId].tickets) continue;

                const settings = guildsData[guildId].settings || {};
                
                for (const ticket of guildsData[guildId].tickets) {
                    // Escalate if pending and older than 10 minutes
                    if (ticket.status === 'pending' && now - ticket.createdAt > 10 * 60 * 1000 && !ticket.escalated) {
                        ticket.escalated = true;
                        changed = true;

                        const ticketsChannel = guild.channels.cache.get(settings.ticketsChannel) || 
                                             guild.channels.cache.find(c => c.name.toLowerCase() === 'tickets');
                        
                        if (ticketsChannel) {
                            await ticketsChannel.send(`🚨 **TICKET ESCALATED:** Ticket **#${ticket.id}** from <@${ticket.userId}> has been unanswered for 10 minutes!`);
                        }
                        
                        await logger.logAction(client, 'Ticket Escalated', { id: ticket.userId, tag: `Ticket #${ticket.id}` }, client.user, `Inactivity escalation for #${ticket.id}`, guild);
                    }
                }
            }

            if (changed) db.save("guilds", guildsData);

        }, 30 * 1000);
    },
};
