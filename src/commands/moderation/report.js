const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { checkAbuse } = require('../../utils/antiAbuse');

module.exports = {
    cooldown: 300,
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report system management')
        .addSubcommand(sub =>
            sub
                .setName('user')
                .setDescription('Report a user to the moderation team')
                .addUserOption(opt => opt.setName('target').setDescription('The user to report').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('The reason for reporting').setRequired(true))
                .addStringOption(opt => opt.setName('evidence').setDescription('Additional context').setRequired(false))
                .addAttachmentOption(opt => opt.setName('image').setDescription('Screenshot evidence').setRequired(false))
        )
        .addSubcommand(sub =>
            sub
                .setName('view')
                .setDescription('View reports (Staff Only)')
        ),
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'user') {
            const reportedUser = interaction.options.getUser('target');
            const reason = interaction.options.getString('reason');
            const evidenceText = interaction.options.getString('evidence');
            const evidenceImage = interaction.options.getAttachment('image');
            
            // Anti-Abuse Check
            if (checkAbuse(interaction, 'report', reason)) return;

            const settings = db.getSettings(interaction.guild.id);
            const reportsChannelId = settings.reportsChannel;

            if (!reportsChannelId) {
                return interaction.reply({ content: 'Reports channel is not configured. Ask an admin to use `/set channel`.', ephemeral: true });
            }

            const channel = interaction.guild.channels.cache.get(reportsChannelId);
            if (!channel) return interaction.reply({ content: 'Reports channel not found.', ephemeral: true });

            const reportId = Math.random().toString(36).substring(2, 10).toUpperCase();
            const nowSecs = Math.floor(Date.now() / 1000);

            const reportEmbed = new EmbedBuilder()
                .setColor('DarkRed')
                .setTitle(`🚨 New Player Report • #${reportId}`)
                .addFields(
                    { name: '🎯 Target', value: `${reportedUser} (${reportedUser.id})`, inline: true },
                    { name: '📢 Reporter', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                    { name: '📋 Reason', value: reason, inline: false },
                    { name: '🔍 Evidence', value: evidenceText || 'None', inline: false }
                )
                .setFooter({ text: `Report ID: ${reportId}` })
                .setTimestamp();

            if (evidenceImage?.contentType?.startsWith('image/')) {
                reportEmbed.setImage(evidenceImage.url);
            }

            await channel.send({ embeds: [reportEmbed] });
            return interaction.reply({ content: 'Your report has been sent to the moderation team. Thank you! ✅', ephemeral: true });
        }

        if (sub === 'view') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({ content: 'You do not have permission to view reports.', ephemeral: true });
            }
            
            const settings = db.getSettings(interaction.guild.id);
            const reportsChannelId = settings.reportsChannel;
            
            if (!reportsChannelId) return interaction.reply({ content: 'Reports channel not configured.', ephemeral: true });
            
            return interaction.reply({ content: `Please check the <#${reportsChannelId}> channel to view all active reports.`, ephemeral: true });
        }
    },
};

