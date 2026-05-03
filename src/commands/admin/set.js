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
    const db = load("guilds");
    const guildId = interaction.guild.id;

    if (!db[guildId]) db[guildId] = { settings: {}, tickets: [], members: {} };
    if (!db[guildId].settings) db[guildId].settings = {};

    const tickets = interaction.options.getChannel("tickets");
    const logs = interaction.options.getChannel("logs");
    const reports = interaction.options.getChannel("reports");

    let summary = [];
    if (tickets) { 
        db[guildId].settings.ticketsChannel = tickets.id; 
        summary.push(`🎫 Tickets: ${tickets}`);
    }
    if (logs) { 
        db[guildId].settings.logsChannel = logs.id; 
        summary.push(`📜 Logs: ${logs}`);
    }
    if (reports) { 
        db[guildId].settings.reportsChannel = reports.id; 
        summary.push(`🚨 Reports: ${reports}`);
    }

    if (summary.length > 0) {
        save("guilds", db);
        return interaction.reply({ 
            content: `**Configuration Updated ✅**\n${summary.join("\n")}\n\n*All settings saved persistently.*`, 
            ephemeral: true 
        });
    } else {
        return interaction.reply({ content: "❌ Please specify at least one channel to configure.", ephemeral: true });
    }
  }
};


