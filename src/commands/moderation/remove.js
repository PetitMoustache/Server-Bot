const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a role from a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to remove the role from')
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to remove')
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

        if (!user.roles.cache.has(role.id)) {
            return interaction.reply({ content: 'User does not have this role.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('Role Removed')
            .setDescription(`Successfully removed ${role} from ${user}.`)
            .setTimestamp();

        try {
            await user.roles.remove(role);
            await interaction.reply({ embeds: [embed] });
            
            const logger = require('../../utils/logger');
            await logger.logAction(interaction.client, 'Remove Role', user.user, interaction.user, `Removed role ${role.name}`, interaction.guild);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'I do not have permission to manage this role.', ephemeral: true });
        }
    },
};
