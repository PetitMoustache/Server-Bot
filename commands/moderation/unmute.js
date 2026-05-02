const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const { sendToMailbox } = require('../../utils/mailboxHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a user')
        .addUserOption(option => option.setName('target').setDescription('The user to unmute').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the unmute')),
    async execute(interaction, client) {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        if (!target) {
            return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
        }

        const muteRole = interaction.guild.roles.cache.find(r => r.name === 'Muted');

        if (!muteRole || !target.roles.cache.has(muteRole.id)) {
            return interaction.reply({ content: 'This user is not muted.', ephemeral: true });
        }

        try {
            await target.roles.remove(muteRole, reason);

            const embed = new EmbedBuilder()
                .setTitle('🔊 User Unmuted')
                .setColor('Green')
                .setThumbnail(target.user.displayAvatarURL())
                .addFields(
                    { name: 'User', value: `${target} (${target.user.tag})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Log action
            await logger.logAction(client, 'User Unmuted', target.user, interaction.user, reason, interaction.guild);

            // Send to Mailbox
            await sendToMailbox(interaction.guild, target.user, '🔊 UNMUTE NOTICE', `You have been unmuted.\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`, 'Green');

        } catch (error) {
            console.error(error);
            interaction.reply({ content: 'There was an error while unmuting the user.', ephemeral: true });
        }
    }
};
