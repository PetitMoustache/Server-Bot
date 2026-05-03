const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const logger = require("../../utils/logger");
const { sendToMailbox } = require("../../utils/mailboxHelper");

const cooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reputation")
    .setDescription("Reputation system management")
    .addSubcommand(s =>
      s.setName("give")
        .setDescription("Give +1 reputation to a user")
        .addUserOption(o => o.setName("user").setDescription("The user to give reputation to").setRequired(true))
    )
    .addSubcommand(s =>
      s.setName("view")
        .setDescription("View a user's reputation")
        .addUserOption(o => o.setName("user").setDescription("The user to view reputation for").setRequired(false))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // GIVE REP
    if (sub === "give") {
      const giver = interaction.user;
      const target = interaction.options.getUser("user");

      if (target.bot) {
        return interaction.reply({ content: "❌ You can't give reputation to bots!", ephemeral: true });
      }

      if (giver.id === target.id) {
        return interaction.reply({ content: "❌ You can't give reputation to yourself!", ephemeral: true });
      }

      // cooldown 1 por día
      const key = `${giver.id}_${guildId}`;
      const now = Date.now();

      if (cooldown.has(key) && now - cooldown.get(key) < 86400000) {
        const remaining = 86400000 - (now - cooldown.get(key));
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        return interaction.reply({ content: `⏳ You already gave reputation today.\nTry again in **${hours}h ${minutes}m**.`, ephemeral: true });
      }

      cooldown.set(key, now);

      let user = await User.findOne({ userId: target.id, guildId });
      if (!user) {
        user = await User.create({ userId: target.id, guildId });
      }

      user.rep = (user.rep || 0) + 1;
      await user.save();

      // LOGGING
      await logger.logAction(interaction.client, "Reputation Given", target, giver, "+1 Reputation point", interaction.guild);

      // MAILBOX
      await sendToMailbox(interaction.guild, target, "Reputation", `⭐ **${giver.tag}** gave you +1 reputation point!`, "Gold", giver.id, "You received reputation! ⭐");

      return interaction.reply(`⭐ **+1 reputation** given to **${target.username}**!`);
    }

    // VIEW REP
    if (sub === "view") {
      const target = interaction.options.getUser("user") || interaction.user;
      const user = await User.findOne({ userId: target.id, guildId });
      const rep = user?.rep || 0;

      const embed = new EmbedBuilder()
        .setTitle(`⭐ Reputation: ${target.username}`)
        .setDescription(`Current Reputation: **${rep}** points.`)
        .setColor("Gold")
        .setThumbnail(target.displayAvatarURL());

      return interaction.reply({ embeds: [embed] });
    }
  }
};
