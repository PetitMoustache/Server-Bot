const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const { randomUUID } = require("crypto");
const { createTicket } = require("../../utils/config");
const { checkAbuse } = require("../../utils/antiAbuse");

module.exports = {
  cooldown: 300, // 5 minute cooldown
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Create a support ticket")
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const reason = interaction.options.getString("reason");

    // Anti-Abuse Check
    if (checkAbuse(interaction, 'ticket', reason)) return;

    const id = randomUUID().slice(0, 8).toUpperCase();

    const embed = new EmbedBuilder()
      .setTitle(`🆘 Ticket • #${id}`)
      .addFields(
        { name: "User", value: `${interaction.user.tag} (${interaction.user.id})` },
        { name: "Reason", value: reason }
      )
      .setColor("Orange")
      .setFooter({ text: `Ticket ID: ${id}` })
      .setTimestamp();

    const row = {
      type: 1,
      components: [
        {
          type: 2,
          style: 3, // Success
          label: "Accept",
          custom_id: `ticket_accept_${interaction.user.id}_${id}`
        },
        {
          type: 2,
          style: 4, // Danger
          label: "Deny",
          custom_id: `ticket_deny_${interaction.user.id}_${id}`
        }
      ]
    };

    const db = require('../../utils/db');
    const settings = db.getSettings(interaction.guild.id);
    const channelId = settings.ticketsChannel;
    let channel = interaction.guild.channels.cache.get(channelId);
    
    if (!channel) {
        channel = interaction.guild.channels.cache.find(c => c.name === "tickets");
    }

    if (!channel) {
      return interaction.reply({
        content: "Tickets channel not set.",
        ephemeral: true
      });
    }

    try {
        const ticketMessage = await channel.send({ embeds: [embed], components: [row] });

        createTicket(interaction.guild.id, id, {
          userId: interaction.user.id,
          reason,
          status: "pending",
          createdAt: Date.now(),
          guildId: interaction.guild.id,
          messageId: ticketMessage.id,
          channelId: channel.id
        });

        // ⏱️ AUTO-ESCALATION SYSTEM (10 minutes)
        setTimeout(async () => {
            const { getTicket } = require("../../utils/config");
            const currentTicket = getTicket(interaction.guild.id, id);
            
            if (currentTicket && currentTicket.status === "pending") {
                const logger = require('../../utils/logger');
                await logger.logAction(client, 'Unanswered Ticket', interaction.user, client.user, `🚨 Ticket #${id} has been unanswered for 10 minutes!`, interaction.guild);
                
                // Optional: Ping staff in the tickets channel
                try {
                    await channel.send(`⚠️ **Escalation:** Ticket #${id} from ${interaction.user} needs attention! <@&${settings.modRole || ""}>`);
                } catch (e) {}
            }
        }, 10 * 60 * 1000);

        return interaction.reply({
          content: "Ticket sent to support.",
          ephemeral: true
        });
    } catch (error) {
        console.error("Error sending ticket:", error);
        return interaction.reply({
            content: "Error sending ticket.",
            ephemeral: true
        });
    }
  }
};
