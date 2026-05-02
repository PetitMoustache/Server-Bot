const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const { sendToMailbox } = require('../../utils/mailboxHelper');
const mutesDb = require('../../utils/mutes');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user for a specific duration')
        .addUserOption(option => option.setName('target').setDescription('The user to mute').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 10m, 2h, 1d)').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the mute')),
    async execute(interaction, client) {
        const target = interaction.options.getMember('target');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        if (!target) {
            return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
        }

        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: 'You cannot mute this user as they have a higher or equal role.', ephemeral: true });
        }

        // Parse duration
        const timeValue = parseInt(durationStr);
        const timeUnit = durationStr.slice(-1).toLowerCase();
        let ms = 0;

        if (timeUnit === 'm') ms = timeValue * 60 * 1000;
        else if (timeUnit === 'h') ms = timeValue * 60 * 60 * 1000;
        else if (timeUnit === 'd') ms = timeValue * 24 * 60 * 60 * 1000;
        else {
            return interaction.reply({ content: 'Invalid time format. Use m, h, or d (e.g., 10m, 2h, 1d).', ephemeral: true });
        }

        if (isNaN(ms) || ms <= 0) {
            return interaction.reply({ content: 'Invalid duration value.', ephemeral: true });
        }

        try {
            let muteRole = interaction.guild.roles.cache.find(r => r.name === 'Muted');

            if (!muteRole) {
                muteRole = await interaction.guild.roles.create({
                    name: 'Muted',
                    color: '#818386',
                    reason: 'Mute system setup'
                });

                // Update channel overwrites
                interaction.guild.channels.cache.forEach(async (channel) => {
                    if (channel.isTextBased()) {
                        await channel.permissionOverwrites.edit(muteRole, {
                            SendMessages: false,
                            AddReactions: false,
                            CreatePublicThreads: false,
                            CreatePrivateThreads: false
                        }).catch(console.error);
                    }
                });
            }

            await target.roles.add(muteRole, reason);

            const embed = new EmbedBuilder()
                .setTitle('🔇 User Muted')
                .setColor('Red')
                .setThumbnail(target.user.displayAvatarURL())
                .addFields(
                    { name: 'User', value: `${target} (${target.user.tag})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: 'Duration', value: durationStr, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Log action
            await logger.logAction(client, 'User Muted', target.user, interaction.user, `Duration: ${durationStr}. Reason: ${reason}`, interaction.guild);

            // Send to Mailbox
            await sendToMailbox(interaction.guild, target.user, '🔇 MUTE NOTICE', `**Duration:** ${durationStr}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`, 'Red');

            // Add to Database for background checking
            mutesDb.addMute(target.id, interaction.guild.id, Date.now() + ms);

            // Auto unmute
            setTimeout(async () => {
                const checkTarget = await interaction.guild.members.fetch(target.id).catch(() => null);
                if (checkTarget && checkTarget.roles.cache.has(muteRole.id)) {
                    await checkTarget.roles.remove(muteRole, 'Mute duration expired');
                    await logger.logAction(client, 'User Unmuted (Auto)', target.user, client.user, 'Duration expired', interaction.guild);
                    await sendToMailbox(interaction.guild, target.user, '🔊 UNMUTE NOTICE', 'Your mute duration has expired. You have been unmuted.', 'Green');
                }
            }, ms);

        } catch (error) {
            console.error(error);
            interaction.reply({ content: 'There was an error while muting the user.', ephemeral: true });
        }
    }
};
