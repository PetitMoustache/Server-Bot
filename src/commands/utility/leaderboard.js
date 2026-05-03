const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { load } = require("../../database/db");

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
    const db = load("guilds");
    const guildId = interaction.guild.id;
    const memberData = db[guildId]?.members || {};
    
    const type = interaction.options.getString("type") || "levels";

    const leaderboardData = Object.entries(memberData).map(([id, data]) => ({
        id,
        level: data.level || 1,
        xp: data.xp || 0,
        rep: data.rep || 0
    }));

    if (leaderboardData.length === 0) {
        return interaction.reply({ content: "❌ No one has earned any stats yet! Start talking to climb the ranks.", ephemeral: true });
    }

    let sorted;
    let title;
    let color;

    if (type === "levels") {
        sorted = leaderboardData.sort((a, b) => b.level - a.level || b.xp - a.xp).slice(0, 10);
        title = `🏆 Top Levels - ${interaction.guild.name}`;
        color = '#5865F2';
    } else {
        sorted = leaderboardData.sort((a, b) => b.rep - a.rep).slice(0, 10);
        title = `⭐ Top Reputation - ${interaction.guild.name}`;
        color = '#F1C40F';
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setTimestamp();

    let description = "";
    for (let i = 0; i < sorted.length; i++) {
      const user = sorted[i];
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
      
      if (type === "levels") {
        description += `${medal} <@${user.id}> • **Lv ${user.level}** (${user.xp} XP)\n`;
      } else {
        description += `${medal} <@${user.id}> • **${user.rep}** ⭐ reputation\n`;
      }
    }

    embed.setDescription(description || "No data available.");

    return interaction.reply({ embeds: [embed] });
  }
};
