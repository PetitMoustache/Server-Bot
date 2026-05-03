const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const mailboxDb = require('./mailboxDb');

async function getOrCreateMailbox(guild, user) {
    const channelName = `mailbox-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    let channel = guild.channels.cache.find(c => c.name === channelName);

    if (!channel) {
        let category = guild.channels.cache.find(c => c.name === '📫 MAILBOXES' && c.type === ChannelType.GuildCategory);
        if (!category) {
            category = await guild.channels.create({
                name: '📫 MAILBOXES',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        deny: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.Speak
                        ]
                    }
                ]
            });
        }

        const db = require('../database/db');
        const settings = db.getSettings(guild.id);
        const staffRoles = [settings.modRole, settings.adminRole, settings.supportRole].filter(id => id);

        const overwrites = [
            {
                id: guild.id, // @everyone
                deny: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.AddReactions
                ]
            },
            {
                id: user.id, // Mailbox Owner
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                ],
                deny: [
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ManageMessages
                ]
            },
            {
                id: guild.members.me.id, // Bot
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels
                ]
            }
        ];

        staffRoles.forEach(roleId => {
            if (roleId !== user.id) {
                overwrites.push({
                    id: roleId,
                    deny: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                });
            }
        });

        channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: overwrites,
            topic: `Private Mailbox for ${user.tag}. 100% Secure.`,
            nsfw: false
        });

        const welcomeEmbed = new EmbedBuilder()
            .setTitle('📬 Personal Mailbox')
            .setDescription(`Welcome ${user}! This is your private inbox.\n\nUse \`/mailbox\` to access your interactive dashboard.`)
            .setColor('#2F3136')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'MailX - Secure Messaging System' })
            .setTimestamp();

        await channel.send({ embeds: [welcomeEmbed] });
    }

    return channel;
}

async function sendToMailbox(guild, user, type, details, color = '#5865F2', senderId = 'System', subject = null) {
    try {
        let category = "📌 System";
        if (type.toLowerCase() === "ticket") category = "🎫 Ticket";
        if (type.toLowerCase() === "mod" || type.toLowerCase() === "moderation") category = "🚨 Moderation";

        const finalSubject = subject || type || 'System Notification';
        const channel = await getOrCreateMailbox(guild, user);
        
        const embed = new EmbedBuilder()
            .setTitle(`📬 New Notification`)
            .setDescription(`
**Category:** ${category}
**Subject:** ${finalSubject}

${details}
            `)
            .setColor(color)
            .setTimestamp();

        if (senderId !== 'System') {
            embed.addFields({ name: 'From', value: `<@${senderId}>`, inline: true });
        }

        await channel.send({ embeds: [embed] });
        
        mailboxDb.addMessage(user.id, guild.id, type, details, senderId, finalSubject);

        return true;
    } catch (e) {
        console.error('Error sending to mailbox:', e);
        return false;
    }
}

function createDashboard(user, guild) {
    const messages = mailboxDb.getMessages(user.id, guild.id);
    const unreadCount = messages.filter(m => m.status === 'unread').length;

    const embed = new EmbedBuilder()
        .setTitle('📫 MailX Dashboard')
        .setDescription(`Hello **${user.username}**! Welcome to your advanced mailbox.\n\nYou have **${unreadCount}** unread messages.`)
        .addFields(
            { name: '📊 Statistics', value: `Total: \`${messages.length}\`\nUnread: \`${unreadCount}\``, inline: true },
            { name: '🔗 Quick Actions', value: 'Use the buttons below to manage your mail.', inline: true }
        )
        .setColor('#5865F2')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'MailX Premium' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('mail_inbox_0').setLabel('Inbox').setStyle(ButtonStyle.Primary).setEmoji('📥'),
        new ButtonBuilder().setCustomId('mail_compose').setLabel('Compose').setStyle(ButtonStyle.Success).setEmoji('✍️'),
        new ButtonBuilder().setCustomId('mail_clear').setLabel('Clear All').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );

    return { embeds: [embed], components: [row] };
}

function createInbox(user, guild, page = 0) {
    const messages = [...mailboxDb.getMessages(user.id, guild.id)].reverse();
    const perPage = 5;
    const totalPages = Math.ceil(messages.length / perPage);
    const start = page * perPage;
    const end = start + perPage;
    const pageMessages = messages.slice(start, end);

    const embed = new EmbedBuilder()
        .setTitle('📥 Your Inbox')
        .setDescription(messages.length === 0 ? 'Your inbox is empty.' : `Showing messages ${start + 1}-${Math.min(end, messages.length)} of ${messages.length}`)
        .setColor('#5865F2')
        .setFooter({ text: `Page ${page + 1} of ${Math.max(1, totalPages)}` });

    if (pageMessages.length > 0) {
        pageMessages.forEach((m, i) => {
            const status = m.status === 'unread' ? '🔵' : '⚪';
            embed.addFields({ 
                name: `${status} ${m.subject}`, 
                value: `**ID:** \`${m.id}\` | **From:** ${m.senderId === 'System' ? 'System' : `<@${m.senderId}>`}\n*${new Date(m.timestamp).toLocaleString()}*` 
            });
        });
    }

    const rows = [];
    
    if (pageMessages.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('mail_view_select')
            .setPlaceholder('Select a message to read')
            .addOptions(pageMessages.map(m => ({
                label: m.subject.substring(0, 100),
                description: `From: ${m.senderId === 'System' ? 'System' : m.senderId} | ID: ${m.id}`,
                value: m.id,
                emoji: m.status === 'unread' ? '🔵' : '⚪'
            })));
        rows.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`mail_inbox_${page - 1}`).setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('mail_dash').setLabel('Dashboard').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
        new ButtonBuilder().setCustomId(`mail_inbox_${page + 1}`).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
    );
    rows.push(navRow);

    return { embeds: [embed], components: rows };
}

function createMessageView(message) {
    const embed = new EmbedBuilder()
        .setTitle(`📖 ${message.subject}`)
        .setDescription(message.content)
        .addFields(
            { name: 'From', value: message.senderId === 'System' ? 'System' : `<@${message.senderId}>`, inline: true },
            { name: 'Sent', value: `<t:${Math.round(message.timestamp / 1000)}:F>`, inline: true },
            { name: 'Type', value: message.type, inline: true }
        )
        .setColor('#5865F2')
        .setFooter({ text: `Message ID: ${message.id}` });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('mail_inbox_0').setLabel('Back to Inbox').setStyle(ButtonStyle.Secondary).setEmoji('⬅️'),
        new ButtonBuilder().setCustomId(`mail_reply_${message.senderId}`).setLabel('Reply').setStyle(ButtonStyle.Primary).setEmoji('↩️').setDisabled(message.senderId === 'System'),
        new ButtonBuilder().setCustomId(`mail_delete_${message.id}`).setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );

    return { embeds: [embed], components: [row] };
}

module.exports = { getOrCreateMailbox, sendToMailbox, createDashboard, createInbox, createMessageView };
