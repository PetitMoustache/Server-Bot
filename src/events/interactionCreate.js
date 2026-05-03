const { Events, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuildData, load, save } = require('../database/db');
const ticketSystem = require('../systems/ticketSystem');

const userCommands = [
  "ticket",
  "leaderboard",
  "help",
  "mailbox",
  "profile",
  "report",
  "reputation",
  "suggest"
];

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.guild) return;

        // 1. Slash Commands
        if (interaction.isChatInputCommand()) {
            const isMod = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);

            if (!isMod && !userCommands.includes(interaction.commandName)) {
                return interaction.reply({
                    content: "Only moderators can use this command ❌",
                    ephemeral: true
                });
            }

            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[COMMAND ERROR] ${interaction.commandName}:`, error);
                const reply = { content: 'There was an error executing this command!', ephemeral: true };
                if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
                else await interaction.reply(reply);
            }
        } 
        
        // 2. Buttons
        else if (interaction.isButton()) {
            // Ticket System Buttons
            if (interaction.customId.startsWith('ticket_')) {
                return ticketSystem.handleButtons(interaction);
            }

            // Mailbox Logic (Optional: can be moved to mailboxSystem too)
            if (interaction.customId.startsWith('mail_')) {
                // handle mailbox buttons...
            }
        // 3. Modals
        else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('mail_modal_')) {
                const targetId = interaction.customId.split('_')[2];
                const subject = interaction.fields.getTextInputValue('subject');
                const content = interaction.fields.getTextInputValue('message');

                const { sendToMailbox } = require('../utils/mailboxHelper');
                const success = await sendToMailbox(interaction.guild, { id: targetId }, "Direct Message", content, "#5865F2", interaction.user.id, subject);

                if (success) {
                    return interaction.reply({ content: "✅ Message sent successfully and saved in database.", ephemeral: true });
                } else {
                    return interaction.reply({ content: "❌ Error sending message. Make sure the user has a mailbox channel.", ephemeral: true });
                }
            }
        }
    }
};


