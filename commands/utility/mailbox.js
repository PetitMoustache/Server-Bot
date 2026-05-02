const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getOrCreateMailbox, sendToMailbox } = require('../../utils/mailboxHelper');
const mailboxDb = require('../../utils/mailboxDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mailbox')
        .setDescription('Personal mailbox and notifications system')
        .addSubcommand(sub => 
            sub.setName('open')
                .setDescription('Open or create your personal private mailbox'))
        .addSubcommand(sub => 
            sub.setName('read')
                .setDescription('View your unread notifications'))
        .addSubcommand(sub => 
            sub.setName('clear')
                .setDescription('Clear your mailbox history'))
        .addSubcommand(sub => 
            sub.setName('send')
                .setDescription('Send a notification to a user\'s mailbox (Staff Only)')
                .addUserOption(opt => opt.setName('target').setDescription('The user to notify').setRequired(true))
                .addStringOption(opt => opt.setName('message').setDescription('The message to send').setRequired(true))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // All user actions (open, read, clear) are strictly linked to interaction.user
        if (subcommand === 'open') {
            const channel = await getOrCreateMailbox(interaction.guild, interaction.user);
            return interaction.reply({ content: `✅ Your private mailbox is ready: ${channel}`, ephemeral: true });
        }

        if (subcommand === 'read') {
            const messages = mailboxDb.getMessages(interaction.user.id, interaction.guild.id);
            const unread = messages.filter(m => m.status === 'unread');

            if (unread.length === 0) {
                return interaction.reply({ content: '📭 You have no unread messages.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('📬 Your Unread Notifications')
                .setColor('Blue')
                .setTimestamp();

            unread.forEach(m => {
                embed.addFields({ name: `${m.type} - <t:${Math.round(m.timestamp / 1000)}:R>`, value: m.content.substring(0, 1024) });
            });

            mailboxDb.markAllAsRead(interaction.user.id, interaction.guild.id);

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === 'clear') {
            mailboxDb.clearMailbox(interaction.user.id, interaction.guild.id);
            return interaction.reply({ content: '✅ Your mailbox history has been cleared.', ephemeral: true });
        }

        if (subcommand === 'send') {
            const db = require('../../utils/db');
            const settings = db.getSettings(interaction.guild.id);
            
            const isMod = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) || 
                          interaction.member.roles.cache.has(settings.modRole) ||
                          interaction.member.roles.cache.has(settings.adminRole) ||
                          interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            
            if (!isMod) {
                return interaction.reply({ content: "⛔ You don't have permission to use this command", ephemeral: true });
            }

            const target = interaction.options.getUser('target');
            const message = interaction.options.getString('message');

            const success = await sendToMailbox(interaction.guild, target, 'Staff Message', `**From Staff:** ${interaction.user.tag}\n\n${message}`, 'Purple');

            if (success) {
                return interaction.reply({ content: `✅ Message sent to ${target.tag}'s mailbox.`, ephemeral: true });
            } else {
                return interaction.reply({ content: `❌ Failed to send message. Make sure the user is in the server.`, ephemeral: true });
            }
        }
    }
};
