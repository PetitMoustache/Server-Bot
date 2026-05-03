const { SlashCommandBuilder } = require("discord.js");
const ticketSystem = require("../../systems/ticketSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Support ticket system")
    
    .addSubcommand(sub =>
      sub.setName("open")
        .setDescription("Open a new support ticket")
        .addStringOption(opt => opt.setName("reason").setDescription("Reason for support").setRequired(true))
    )
    
    .addSubcommand(sub =>
      sub.setName("close")
        .setDescription("Close a support ticket")
        .addStringOption(opt => opt.setName("id").setDescription("The Ticket ID (e.g. 4631118F)").setRequired(true))
    )
    
    .addSubcommand(sub =>
      sub.setName("list")
        .setDescription("List recent support tickets")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const isMod = interaction.member.permissions.has("ModerateMembers");

    // Restringir close y list solo a Staff
    if ((sub === "close" || sub === "list") && !isMod) {
        return interaction.reply({ 
            content: "❌ Only staff can use this subcommand.", 
            ephemeral: true 
        });
    }

    switch (sub) {
        case "open":
            return ticketSystem.open(interaction);
        case "close":
            return ticketSystem.close(interaction);
        case "list":
            return ticketSystem.list(interaction);
        default:
            return interaction.reply({ content: "Unknown subcommand.", ephemeral: true });
    }
  }
};

