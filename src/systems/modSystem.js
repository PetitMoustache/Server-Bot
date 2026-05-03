const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const { sendToMailbox } = require('../utils/mailboxHelper');
const mutesDb = require('../utils/mutes');

async function mute(interaction) {
    const client = interaction.client;
    const target = interaction.options.getMember('target');
    const durationStr = interaction.options.getString('time'); // Option name in user's example is 'time'
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

        await logger.logAction(client, 'User Muted', target.user, interaction.user, `Duration: ${durationStr}. Reason: ${reason}`, interaction.guild);
        await sendToMailbox(interaction.guild, target.user, '🔇 MUTE NOTICE', `**Duration:** ${durationStr}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`, 'Red');
        mutesDb.addMute(target.id, interaction.guild.id, Date.now() + ms);

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

async function unmute(interaction) {
    const client = interaction.client;
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

        await logger.logAction(client, 'User Unmuted', target.user, interaction.user, reason, interaction.guild);
        await sendToMailbox(interaction.guild, target.user, '🔊 UNMUTE NOTICE', `You have been unmuted.\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`, 'Green');

    } catch (error) {
        console.error(error);
        interaction.reply({ content: 'There was an error while unmuting the user.', ephemeral: true });
    }
}

module.exports = { mute, unmute };
