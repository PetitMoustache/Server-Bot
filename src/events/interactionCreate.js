const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildData } = require('../database/db');
const { sendToMailbox } = require('../systems/mailboxSystem');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.guild) return;

        const guildData = getGuildData(interaction.guild.id);
        const settings = guildData.settings;

        // 1. Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // Permission Check for Admin/Mod Commands
            const adminOnly = ['set'];
            if (adminOnly.includes(command.data.name) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "⛔ You need Administrator permissions for this.", ephemeral: true });
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
            }
        } 
        
        // 2. Buttons & Select Menus
        else if (interaction.isButton() || interaction.isStringSelectMenu()) {
            // Mailbox Logic (Simplified for brevity, can be expanded)
            if (interaction.customId.startsWith('mail_')) {
                // handle mailbox interactions using mailboxSystem
            }

            // Ticket Logic (Forward to ticket system)
            if (interaction.customId.startsWith('ticket_')) {
                // Logic for ticket buttons
            }
        }
    }
};
