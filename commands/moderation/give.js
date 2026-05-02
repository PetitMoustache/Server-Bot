const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give a role to a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to give the role to')
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to give')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor('Red')
                .setDescription('You do not have permission to use this command');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const user = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');

        if (!user) {
            return interaction.reply({ content: 'Could not find that user.', ephemeral: true });
        }

        if (user.roles.cache.has(role.id)) {
            return interaction.reply({ content: 'User already has this role.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('Role Given')
            .setDescription(`Successfully gave ${role} to ${user}.`)
            .setTimestamp();

        try {
            await user.roles.add(role);
            await interaction.reply({ embeds: [embed] });
            
            const logger = require('../../utils/logger');
            await logger.logAction(interaction.client, 'Give Role', user.user, interaction.user, `Gave role ${role.name}`, interaction.guild);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'I do not have permission to manage this role.', ephemeral: true });
        }
    },
};
