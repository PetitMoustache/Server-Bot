const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const mailboxDb = require('./mailboxDb');

async function getOrCreateMailbox(guild, user) {
    const channelName = `mailbox-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    let channel = guild.channels.cache.find(c => c.name === channelName);

    if (!channel) {
        // Find or create Category
        let category = guild.channels.cache.find(c => c.name === '📫 MAILBOXES' && c.type === ChannelType.GuildCategory);
        if (!category) {
            category = await guild.channels.create({
                name: '📫 MAILBOXES',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });
        }

        channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                    deny: [PermissionFlagsBits.SendMessages]
                },
                {
                    id: guild.members.me.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }
            ]
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('📬 Your Personal Mailbox')
            .setDescription(`Welcome ${user}! This is your private inbox where you will receive important notifications from the server staff and system.`)
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
