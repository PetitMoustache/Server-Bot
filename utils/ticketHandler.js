const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { getTicket } = require("./config");
const { sendToMailbox } = require("./mailboxHelper");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  const parts = interaction.customId.split("_");
  if (parts[0] !== "ticket") return;

  const type = parts[1];
  const userId = parts[2];
  const ticketId = parts[3];

  const guild = interaction.guild;

  console.log("TICKET BUTTON:", interaction.customId);

  // ---------------- RATING HANDLING ----------------
  if (type === "rate") {
    const score = parts[2]; // score (1-5)
    const tId = parts[3]; // ticketId
    const modId = parts[4]; // modId

    await interaction.update({ content: `✅ Thank you for your feedback! You rated us **${score} ⭐**.`, components: [] });

    // Log rating
    const logger = require('./logger');
    const mod = await interaction.client.users.fetch(modId).catch(() => ({ tag: 'Unknown' }));
    await logger.logAction(interaction.client, 'Ticket Rated', interaction.user, mod, `Ticket #${tId} rated with ${score} stars.`, interaction.guild);
    return;
  }

  // ---------------- ACCEPT ----------------
  if (type === "accept") {
    const { getTicket, save } = require("./config");
    const db = require('./config'); // Using it as an object
    const ticket = getTicket(guild.id, ticketId);
    
    if (!ticket) {
        return interaction.reply({ content: "Ticket data not found.", ephemeral: true });
    }

    try {
      console.log("TRYING TO CREATE CHANNEL");
      const user = await guild.members.fetch(userId).catch(() => null);
      if (!user) {
          return interaction.reply({ content: "User not found.", ephemeral: true });
      }

      // Update status in DB
      const allData = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, "..", "data", "tickets.json")));
      allData[guild.id][ticketId].status = "accepted";
      allData[guild.id][ticketId].acceptedBy = interaction.user.id;
      require('fs').writeFileSync(require('path').join(__dirname, "..", "data", "tickets.json"), JSON.stringify(allData, null, 2));

      const channel = await guild.channels.create({
        name: `Ticket With ${user.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
              id: interaction.client.user.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle("🆘 Support Ticket")
        .setDescription("Private ticket created between user and moderator.")
        .addFields(
            { name: '👤 User', value: `${user}`, inline: true },
            { name: '👮 Moderator', value: `${interaction.user}`, inline: true },
            { name: '🆔 Ticket ID', value: ticketId, inline: true }
        )
        .setColor("Green")
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${channel.id}_${user.id}_${ticketId}`)
          .setLabel("Close Ticket")
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ content: `<@${user.id}> <@${interaction.user.id}>`, embeds: [embed], components: [row] });

      // Mailbox Notification
      await sendToMailbox(guild, user.user, '🆘 TICKET ACCEPTED', `Your ticket **#${ticketId}** has been accepted by **${interaction.user.tag}**.\nJoin the conversation here: ${channel}`, 'Green');

      const oldEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(oldEmbed)
          .setColor('Green')
          .setTitle(oldEmbed.title + ' [ACCEPTED]')
          .addFields({ name: '✅ Status', value: `Accepted by ${interaction.user}.` });
      
      await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

      return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });

    } catch (err) {
      console.error(err);
      if (!interaction.replied) interaction.reply({ content: "Error. Check permissions.", ephemeral: true });
    }
  }

  // ---------------- DENY ----------------
  if (type === "deny") {
    // Update status in DB
    const allData = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, "..", "data", "tickets.json")));
    if (allData[guild.id]?.[ticketId]) {
        allData[guild.id][ticketId].status = "denied";
        require('fs').writeFileSync(require('path').join(__dirname, "..", "data", "tickets.json"), JSON.stringify(allData, null, 2));
    }

    const oldEmbed = interaction.message.embeds[0];
    const updatedEmbed = EmbedBuilder.from(oldEmbed)
        .setColor('Red')
        .setTitle(oldEmbed.title + ' [DENIED]')
        .addFields({ name: '❌ Status', value: `Denied by ${interaction.user}` });
    
    await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
    await interaction.reply({ content: "Ticket denied", ephemeral: true });

    try {
        const user = await guild.members.fetch(userId).catch(() => null);
        if (user) {
            await sendToMailbox(guild, user.user, '❌ TICKET DENIED', `Your ticket **#${ticketId}** in **${guild.name}** was denied by **${interaction.user.tag}**.`, 'Red');
        }
    } catch (e) {}
  }

  // ---------------- CLOSE ----------------
  if (type === "close") {
    const channelId = parts[2];
    const ownerId = parts[3];
    const tId = parts[4];

    const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const isOwner = interaction.user.id === ownerId;

    if (!isStaff && !isOwner) return interaction.reply({ content: 'Only owner or staff can close.', ephemeral: true });

    await interaction.reply("🔒 **Closing ticket in 5 seconds...**");

    // Send rating buttons to user
    try {
        const owner = await guild.members.fetch(ownerId).catch(() => null);
        if (owner) {
            const ratingEmbed = new EmbedBuilder()
                .setTitle("⭐ Rate Your Support")
                .setDescription(`Thank you for using our support system. Please rate your experience with the staff member for Ticket **#${tId}**.`)
                .setColor("Gold");

            const ratingRow = new ActionRowBuilder().addComponents(
                [1, 2, 3, 4, 5].map(star => 
                    new ButtonBuilder()
                        .setCustomId(`ticket_rate_${star}_${tId}_${interaction.user.id}`)
                        .setLabel(`${star} ⭐`)
                        .setStyle(ButtonStyle.Secondary)
                )
            );

            await owner.send({ embeds: [ratingEmbed], components: [ratingRow] }).catch(() => console.log("Could not DM rating."));
        }
    } catch (e) {
        console.error("Error sending rating DM:", e);
    }

    setTimeout(async () => {
      try {
          const channel = interaction.guild.channels.cache.get(channelId) || interaction.channel;
          if (channel) await channel.delete();
      } catch (err) {}
    }, 5000);
  }
};
