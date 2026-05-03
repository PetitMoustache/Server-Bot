const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { load, save } = require("../../database/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set")
    .setDescription("Server configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s =>
      s.setName("channel")
        .setDescription("Set bot channels")
        .addChannelOption(o => o.setName("tickets").setDescription("Tickets channel"))
        .addChannelOption(o => o.setName("logs").setDescription("Logs channel"))
        .addChannelOption(o => o.setName("reports").setDescription("Reports channel"))
    ),

  async execute(interaction) {
    const db = load("guilds"); // The db tool uses "guilds" etc.
    const guildId = interaction.guild.id;

    if (!db[guildId]) db[guildId] = { settings: {}, tickets: [], members: {} };
    if (!db[guildId].settings) db[guildId].settings = {};

    const tickets = interaction.options.getChannel("tickets");
    const logs = interaction.options.getChannel("logs");
    const reports = interaction.options.getChannel("reports");

    let changed = false;
    if (tickets) { db[guildId].settings.ticketsChannel = tickets.id; changed = true; }
    if (logs) { db[guildId].settings.logsChannel = logs.id; changed = true; }
    if (reports) { db[guildId].settings.reportsChannel = reports.id; changed = true; }

    if (changed) {
        save("guilds", db);
        return interaction.reply({ content: "Channels configured successfully ✅", ephemeral: true });
    } else {
        return interaction.reply({ content: "Please specify at least one channel to set.", ephemeral: true });
    }
  }
};

