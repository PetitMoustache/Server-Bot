const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { randomUUID } = require("crypto");
const { load, save } = require("../database/db");

async function open(interaction, client) {
    const reason = interaction.options.getString("reason");
    const guildId = interaction.guild.id;
    const db = load("guilds");
    
    if (!db[guildId]) db[guildId] = { settings: {}, tickets: [], members: {} };
    const settings = db[guildId].settings || {};
    
    const id = randomUUID().slice(0, 8).toUpperCase();
    const channelId = settings.ticketsChannel;
    let channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) {
        channel = interaction.guild.channels.cache.find(c => c.name === "tickets");
    }

    if (!channel) {
        return interaction.reply({ content: "Tickets channel not configured. Contact an admin.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(`🆘 Ticket • #${id}`)
        .addFields(
            { name: "User", value: `${interaction.user.tag} (${interaction.user.id})` },
            { name: "Reason", value: reason }
        )
        .setColor("Orange")
        .setFooter({ text: `Ticket ID: ${id}` })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ticket_accept_${interaction.user.id}_${id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ticket_deny_${interaction.user.id}_${id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
    );

    try {
        const ticketMessage = await channel.send({ embeds: [embed], components: [row] });

        if (!db[guildId].tickets) db[guildId].tickets = [];
        db[guildId].tickets.push({
            id,
            userId: interaction.user.id,
            reason,
            status: "pending",
            createdAt: Date.now(),
            messageId: ticketMessage.id,
            channelId: channel.id
        });
        save("guilds", db);

        // ⏱️ AUTO-ESCALATION SYSTEM (10 minutes)
        setTimeout(async () => {
            const currentDb = load("guilds");
            const currentTicket = currentDb[guildId]?.tickets?.find(t => t.id === id);
            
            if (currentTicket && currentTicket.status === "pending") {
                const logger = require('../utils/logger');
                await logger.logAction(client, 'Unanswered Ticket', interaction.user, client.user, `🚨 Ticket #${id} has been unanswered for 10 minutes!`, interaction.guild);
                
                try {
                    await channel.send(`⚠️ **Escalation:** Ticket #${id} from ${interaction.user} needs attention! <@&${settings.modRole || ""}>`);
                } catch (e) {}
            }
        }, 10 * 60 * 1000);

        return interaction.reply({ content: "Ticket sent to support.", ephemeral: true });
    } catch (error) {
        console.error("Error creating ticket:", error);
        return interaction.reply({ content: "Error sending ticket.", ephemeral: true });
    }
}

async function close(interaction) {
    const id = interaction.options.getString("id");
    const guildId = interaction.guild.id;
    const db = load("guilds");
    
    const ticketIndex = db[guildId]?.tickets?.findIndex(t => t.id === id);
    if (ticketIndex === -1 || ticketIndex === undefined) {
        return interaction.reply({ content: "Ticket not found.", ephemeral: true });
    }

    db[guildId].tickets[ticketIndex].status = "closed";
    db[guildId].tickets[ticketIndex].closedAt = Date.now();
    save("guilds", db);

    return interaction.reply({ content: `Ticket #${id} closed successfully.`, ephemeral: true });
}

async function list(interaction) {
    const guildId = interaction.guild.id;
    const db = load("guilds");
    const tickets = db[guildId]?.tickets || [];
    
    if (tickets.length === 0) {
        return interaction.reply({ content: "No tickets found.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket List")
        .setColor("Blue")
        .setDescription(tickets.slice(-10).map(t => `\`#${t.id}\` | <@${t.userId}> | **${t.status}**`).join("\n") || "No recent tickets.");

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { open, close, list };

