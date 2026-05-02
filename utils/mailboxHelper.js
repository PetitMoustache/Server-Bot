const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const mailboxDb = require('./mailboxDb');

async function getOrCreateMailbox(guild, user) {
    const channelName = `mailbox-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    let channel = guild.channels.cache.find(c => c.name === channelName);

    if (!channel) {
        // 1. Find or create Category with Strict Deny
        let category = guild.channels.cache.find(c => c.name === '📫 MAILBOXES' && c.type === ChannelType.GuildCategory);
        if (!category) {
            category = await guild.channels.create({
                name: '📫 MAILBOXES',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });
        }

        // 2. Create Channel with explicitly restricted permissions
        channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.id, // Deny for EVERYONE baseline
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id, // Allow ONLY for the owner
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                    deny: [PermissionFlagsBits.SendMessages] // Owner reads only
                },
                {
                    id: guild.members.me.id, // Allow for the BOT
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
                }
            ]
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('📬 Personal Mailbox')
            .setDescription(`Welcome ${user}! This is your private inbox.\nOnly you and the bot can see this channel.`)
            .setColor('Blue')
            .setTimestamp();

        await channel.send({ embeds: [welcomeEmbed] });
    }

    return channel;
}

async function sendToMailbox(guild, user, type, details, color = 'Blue') {
    try {
        const channel = await getOrCreateMailbox(guild, user);
        const embed = new EmbedBuilder()
            .setTitle(`📬 Notification: ${type}`)
            .setDescription(details)
            .setColor(color)
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        
        // Save to Database
        mailboxDb.addMessage(user.id, guild.id, type, details);

        return true;
    } catch (e) {
        console.error('Error sending to mailbox:', e);
        return false;
    }
}

module.exports = { getOrCreateMailbox, sendToMailbox };
