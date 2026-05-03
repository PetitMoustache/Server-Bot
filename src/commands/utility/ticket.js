const { SlashCommandBuilder } = require("discord.js");
const ticketSystem = require("../../systems/ticketSystem");

module.exports = {
  cooldown: 30, // Reduced for testing/usability
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket system management")
    .addSubcommand(sub =>
      sub
        .setName("open")
        .setDescription("Create a new support ticket")
        .addStringOption(o => o.setName("reason").setDescription("The reason for the ticket").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List your active tickets or all tickets (Staff)")
    )
    .addSubcommand(sub =>
      sub
        .setName("close")
        .setDescription("Close a specific ticket")
        .addStringOption(o => o.setName("id").setDescription("The ID of the ticket to close").setRequired(true))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === "open") {
      return ticketSystem.open(interaction, client);
    }

    if (sub === "list") {
      return ticketSystem.list(interaction);
    }

    if (sub === "close") {
      return ticketSystem.close(interaction);
    }
  }
};

