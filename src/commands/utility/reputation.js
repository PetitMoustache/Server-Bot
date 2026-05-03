const { SlashCommandBuilder } = require("discord.js");
const { load, save } = require("../../database/db");

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
    const db = load("guilds");
    const guildId = interaction.guild.id;

    if (!db[guildId]) db[guildId] = { settings: {}, tickets: [], members: {} };
    if (!db[guildId].members) db[guildId].members = {};

    // GIVE REP
    if (sub === "give") {
      const giver = interaction.user.id;
      const target = interaction.options.getUser("user");

      if (target.bot) {
        return interaction.reply({ content: "You can't give reputation to bots!", ephemeral: true });
      }

      if (giver === target.id) {
        return interaction.reply({ content: "You can't give reputation to yourself!", ephemeral: true });
      }

      // cooldown 1 por día
      const key = `${giver}_${guildId}`;
      const now = Date.now();

      if (cooldown.has(key) && now - cooldown.get(key) < 86400000) {
        const remaining = 86400000 - (now - cooldown.get(key));
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        return interaction.reply({ content: `You already gave reputation today ⏳\nWait: **${hours}h ${minutes}m**`, ephemeral: true });
      }

      cooldown.set(key, now);

      if (!db[guildId].members[target.id]) {
        db[guildId].members[target.id] = { xp: 0, level: 1, rep: 0 };
      }

      db[guildId].members[target.id].rep = (db[guildId].members[target.id].rep || 0) + 1;

      save("guilds", db);

      return interaction.reply(`⭐ **+1 reputation** to ${target.username}!`);
    }

    // VIEW REP
    if (sub === "view") {
      const target = interaction.options.getUser("user") || interaction.user;
      const rep = db[guildId]?.members?.[target.id]?.rep || 0;

      return interaction.reply(`⭐ **${target.username}** has **${rep}** reputation.`);
    }
  }
};
