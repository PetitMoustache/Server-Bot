const { Events, EmbedBuilder, PermissionFlagsBits, Collection } = require('discord.js');
const { load } = require('../database/db');
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

// ⏱️ GLOBAL COOLDOWN SYSTEM
const cooldowns = new Collection();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.guild) return;

        // 🧠 3. SISTEMA DE DEBUG (Logs de interacción)
        if (interaction.isChatInputCommand()) {
            console.log(`[COMMAND] /${interaction.commandName} used by ${interaction.user.tag} in ${interaction.guild.name}`);
        } else if (interaction.isButton()) {
            console.log(`[BUTTON] ${interaction.customId} clicked by ${interaction.user.tag} in ${interaction.guild.name}`);
        }

        // 1. Slash Commands
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;
            const isMod = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);

            // Permission Check
            if (!isMod && !userCommands.includes(commandName)) {
                return interaction.reply({
                    content: "❌ Only moderators can use this command.",
                    ephemeral: true
                });
            }

            const command = client.commands.get(commandName);
            if (!command) return;

            // Cooldown Logic
            if (!cooldowns.has(commandName)) {
                cooldowns.set(commandName, new Collection());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(commandName);
            const cooldownAmount = (command.cooldown || 3) * 1000; // Default 3s

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return interaction.reply({
                        content: `⏳ Please wait **${timeLeft.toFixed(1)}** more seconds before using \`/${commandName}\` again.`,
                        ephemeral: true
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[COMMAND ERROR] ${commandName}:`, error);
                const reply = { content: '❌ There was an error executing this command!', ephemeral: true };
                if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
                else await interaction.reply(reply);
            }
        } 
        
        // 2. Buttons
        else if (interaction.isButton()) {
            if (interaction.customId.startsWith('ticket_')) {
                return ticketSystem.handleButtons(interaction);
            }

            if (interaction.customId.startsWith('mail_')) {
                const mailboxSystem = require('../systems/mailboxSystem');
                return mailboxSystem.handleButtons(interaction);
            }
        }
        
        // 3. Select Menus
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('mail_')) {
                const mailboxSystem = require('../systems/mailboxSystem');
                return mailboxSystem.handleSelectMenu(interaction);
            }
        }
        
        // 4. Modals
        else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('mail_modal_')) {
                const targetId = interaction.customId.split('_')[2];
                const subject = interaction.fields.getTextInputValue('subject');
                const content = interaction.fields.getTextInputValue('message');

                const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
                if (!targetUser) return interaction.reply({ content: "❌ Target user not found.", ephemeral: true });

                const { sendToMailbox } = require('../utils/mailboxHelper');
                const success = await sendToMailbox(interaction.guild, targetUser, "Direct Message", content, "#5865F2", interaction.user.id, subject);

                if (success) {
                    return interaction.reply({ content: "✅ **Message sent!** It has been saved in the user's mailbox.", ephemeral: true });
                } else {
                    return interaction.reply({ content: "❌ Error sending message. Check bot permissions.", ephemeral: true });
                }
            }
        }
    }
};
