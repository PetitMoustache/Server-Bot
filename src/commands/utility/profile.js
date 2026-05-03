const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const User = require("../../models/User");

function getBar(current, max, size = 10) {
  const percent = Math.min(Math.max(current / max, 0), 1);
  const filled = Math.round(size * percent);
  return "█".repeat(filled) + "░".repeat(size - filled);
}

function getTitle(level) {
  if (level >= 20) return "👑 Legend";
  if (level >= 10) return "🔥 Pro";
  if (level >= 5) return "⭐ Active";
  return "🌱 Beginner";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View user profile and stats")
    .addUserOption(o =>
      o.setName("user").setDescription("Target user").setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const data = await User.findOne({ userId: target.id, guildId: interaction.guild.id }) || {
      level: 1,
      xp: 0,
      rep: 0
    };

    const needed = (data.level || 1) * 100;
    const currentXp = data.xp || 0;
    const bar = getBar(currentXp, needed);
    const percent = Math.floor((currentXp / needed) * 100);
    const title = getTitle(data.level || 1);

    const isMod = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);

    const embed = new EmbedBuilder()
      .setTitle(`${target.username}'s Profile`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(`**${title}**`)
      .setColor(member?.displayHexColor || '#5865F2')
      .addFields(
        { name: "📊 Level", value: `**${data.level || 1}**`, inline: true },
        { name: "⭐ Rep", value: `**${data.rep || 0}**`, inline: true },
        { name: "📈 XP Progress", value: `\`${bar}\` ${percent}%`, inline: false }
      );

    // 🔐 Moderator/Advanced Info
    if (isMod && member) {
      const roles = member.roles.cache
        .filter(r => r.name !== "@everyone")
        .sort((a, b) => b.position - a.position)
        .map(r => r.name)
        .slice(0, 10)
        .join(", ") || "None";

      embed.addFields(
        { name: "🆔 User ID", value: `\`${target.id}\``, inline: true },
        { name: "📅 Joined", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: "🎭 Roles", value: roles, inline: false }
      );
    }

    embed.setImage(target.displayAvatarURL({ size: 1024, dynamic: true }));

    await interaction.reply({ embeds: [embed] });
  }
};
