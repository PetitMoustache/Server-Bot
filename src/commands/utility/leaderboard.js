const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { load } = require("../../utils/xpDb");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top users in this server"),

  async execute(interaction) {
    const db = load();
    const guildData = db[interaction.guild.id];

    if (!guildData || Object.keys(guildData).length === 0) {
        return interaction.reply({ content: "No one has earned any XP yet! Start talking to climb the ranks.", ephemeral: true });
    }

    const sorted = Object.entries(guildData)
      .sort((a, b) => b[1].level - a[1].level || b[1].xp - a[1].xp)
      .slice(0, 10);

    const embed = new EmbedBuilder()
        .setTitle(`🏆 Server Leaderboard - ${interaction.guild.name}`)
        .setColor('#FFD700')
        .setTimestamp();

    let description = "";
    for (let i = 0; i < sorted.length; i++) {
      const [id, data] = sorted[i];
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      description += `${medal} <@${id}> - **Lv ${data.level}** (${data.xp} XP) | **${data.rep}** ⭐\n`;
    }

    embed.setDescription(description || "No data available.");

    interaction.reply({ embeds: [embed] });
  }
};
