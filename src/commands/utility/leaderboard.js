const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top users in this server")
    .addStringOption(opt => 
        opt.setName("type")
           .setDescription("Category to view")
           .addChoices(
               { name: "Level/XP", value: "levels" },
               { name: "Reputation", value: "rep" }
           )
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const type = interaction.options.getString("type") || "levels";

    let leaderboardData;
    let title;
    let color;

    if (type === "levels") {
        leaderboardData = await User.find({ guildId })
            .sort({ level: -1, xp: -1 })
            .limit(10);
        title = `🏆 Top Levels - ${interaction.guild.name}`;
        color = '#5865F2';
    } else {
        leaderboardData = await User.find({ guildId })
            .sort({ rep: -1 })
            .limit(10);
        title = `⭐ Top Reputation - ${interaction.guild.name}`;
        color = '#F1C40F';
    }

    if (!leaderboardData || leaderboardData.length === 0) {
        return interaction.reply({ content: "❌ No one has earned any stats yet! Start talking to climb the ranks.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setTimestamp();

    let description = "";
    leaderboardData.forEach((user, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
      
      if (type === "levels") {
        description += `${medal} <@${user.userId}> • **Lv ${user.level}** (${user.xp} XP)\n`;
      } else {
        description += `${medal} <@${user.userId}> • **${user.rep}** ⭐ reputation\n`;
      }
    });

    embed.setDescription(description || "No data available.");

    return interaction.reply({ embeds: [embed] });
  }
};
