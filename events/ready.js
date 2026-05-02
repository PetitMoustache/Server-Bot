const { Events } = require('discord.js');
const statsUpdater = require('../utils/statsUpdater');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Initial update
        await statsUpdater.updateStats(client);

        // Update every 10 minutes
        setInterval(() => {
            statsUpdater.updateStats(client);
        }, 10 * 60 * 1000);

        // ⏱️ REAL-TIME AUTOMATION SYSTEM (Check every 30 seconds)
        setInterval(async () => {
            // 1. AUTO UNMUTE
            const mutesDb = require('../utils/mutes');
            const { sendToMailbox } = require('../utils/mailboxHelper');
            const logger = require('../utils/logger');
            const allMutes = mutesDb.load();
            const now = Date.now();

            for (const mute of allMutes) {
                if (now >= mute.expiresAt) {
                    const guild = client.guilds.cache.get(mute.guildId);
                    if (!guild) continue;

                    const member = await guild.members.fetch(mute.userId).catch(() => null);
                    const muteRole = guild.roles.cache.find(r => r.name === 'Muted');

                    if (member && muteRole && member.roles.cache.has(muteRole.id)) {
                        await member.roles.remove(muteRole, 'Mute expired (Auto)');
                        await sendToMailbox(guild, member.user, '🔊 UNMUTE NOTICE', 'Your mute duration has expired. You have been unmuted.', 'Green');
                        await logger.logAction(client, 'Auto Unmute', member.user, client.user, 'Duration expired', guild);
                    }
                    mutesDb.removeMute(mute.userId, mute.guildId);
                }
            }

            // 2. TICKET AUTO-ESCALATION
            const fs = require('fs');
            const path = require('path');
            const ticketsPath = path.join(__dirname, '..', 'data', 'tickets.json');
            if (fs.existsSync(ticketsPath)) {
                try {
                    const ticketsData = JSON.parse(fs.readFileSync(ticketsPath));
                    let changed = false;
                    for (const guildId in ticketsData) {
                        const guild = client.guilds.cache.get(guildId);
                        if (!guild) continue;
                        const guildSettings = require('../utils/db').getSettings(guildId);
                        for (const ticketId in ticketsData[guildId]) {
                            const ticket = ticketsData[guildId][ticketId];
                            if (ticket.status === 'pending' && now - ticket.createdAt > 10 * 60 * 1000 && !ticket.escalated) {
                                ticket.escalated = true;
                                changed = true;
                                const ticketsChannel = guild.channels.cache.get(guildSettings.ticketsChannel) || guild.channels.cache.find(c => c.name === 'tickets');
                                if (ticketsChannel) {
                                    await ticketsChannel.send(`🚨 **TICKET ESCALATED:** Ticket **#${ticketId}** from <@${ticket.userId}> has been unanswered for 10 minutes! <@&${guildSettings.modRole || ""}> <@&${guildSettings.supportRole || ""}>`);
                                }
                                await logger.logAction(client, 'Ticket Escalated', { tag: ticketId }, client.user, `Ticket #${ticketId} marked as ESCALATED due to inactivity.`, guild);
                            }
                        }
                    }
                    if (changed) fs.writeFileSync(ticketsPath, JSON.stringify(ticketsData, null, 2));
                } catch (e) { console.error('Escalation error:', e); }
            }
        }, 30 * 1000);
    },
};
