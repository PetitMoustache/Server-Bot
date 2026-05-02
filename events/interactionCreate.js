const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const ticketHandler = require('../utils/ticketHandler');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Log all interactions for debugging
        console.log("INTERACTION RECEIVED:", interaction.customId || (interaction.isCommand() ? interaction.commandName : "UNKNOWN"));

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            // Cooldown handling
            const { cooldowns } = client;
            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Map());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const defaultCooldownDuration = 3;
            const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

            // Global Permission Check for Moderation Commands
            const modCommands = ['mute', 'unmute', 'kick', 'ban', 'clear', 'set', 'post', 'mailbox'];
            if (modCommands.includes(command.data.name)) {
                const db = require('../utils/db');
                const settings = db.getSettings(interaction.guild.id);
                
                const isMod = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) || 
                              interaction.member.roles.cache.has(settings.modRole) ||
                              interaction.member.roles.cache.has(settings.adminRole) ||
                              interaction.member.permissions.has(PermissionFlagsBits.Administrator);
                
                if (!isMod) {
                    const noPermEmbed = new EmbedBuilder()
                        .setColor('Red')
                        .setDescription("⛔ You don't have permission to use this command");
                    return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
                }
            }

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    // Bypass cooldown for Admins and Moderators
                    const isMod = interaction.member && (
                        interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                        interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
                        interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
                    );

                    if (!isMod) {
                        const expiredTimestamp = Math.round(expirationTime / 1000);
                        return interaction.reply({ 
                            content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, 
                            ephemeral: true 
                        });
                    }
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);
                
                const errorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Error')
                    .setDescription('There was an error while executing this command!');

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            // Priority: Check if it's a ticket interaction
            if (interaction.customId.startsWith('ticket_')) {
                return await ticketHandler(interaction);
            }

            // Handle role claim buttons
            if (interaction.customId.startsWith('claim_role_')) {
                const claimData = client.roleClaims.get(interaction.message.id);
                
                if (!claimData) {
                    return interaction.reply({ content: 'This role claim has expired or is invalid.', ephemeral: true });
                }

                if (Date.now() > claimData.expiresAt) {
                    return interaction.reply({ content: 'This role claim has expired.', ephemeral: true });
                }

                const roleId = claimData.roleId;
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.reply({ content: 'The role no longer exists.', ephemeral: true });
                }

                const member = interaction.member;

                if (member.roles.cache.has(role.id)) {
                    return interaction.reply({ content: 'You already have this role!', ephemeral: true });
                }

                try {
                    await member.roles.add(role);
                    await interaction.reply({ content: `You have successfully claimed the ${role.name} role!`, ephemeral: true });
                } catch (error) {
                    console.error(error);
                    await interaction.reply({ content: 'There was an error giving you the role. Please check my permissions.', ephemeral: true });
                }
            }
        }
    },
};
