const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getStaffStats, load } = require("../../utils/staffStats");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("staffstats")
    .setDescription("View staff performance metrics (Staff Only)")
    .addUserOption(o =>
      o.setName("staff").setDescription("The staff member to view").setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: "⛔ You don't have permission to view staff stats.", ephemeral: true });
    }

    const target = interaction.options.getUser("staff") || interaction.user;
    const stats = getStaffStats(interaction.guild.id, target.id);

    if (!stats) {
        return interaction.reply({ content: `No stats found for **${target.username}**. They might not have handled any tickets yet.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(`👮 Staff Performance: ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setColor('#5865F2')
        .addFields(
            { name: '🎫 Tickets Resolved', value: `\`${stats.ticketsResolved}\``, inline: true },
            { name: '🕒 Avg Response Time', value: `\`${stats.avgResponseTime} minutes\``, inline: true },
            { name: '⭐ Avg Rating', value: `\`${stats.avgRating} / 5.0\``, inline: true }
        )
        .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
