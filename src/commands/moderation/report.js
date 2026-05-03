const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');
const { checkAbuse } = require('../../utils/antiAbuse');
const logger = require('../../utils/logger');

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
            const targetMember = interaction.options.getMember('target');
            const reason = interaction.options.getString('reason');
            const evidenceText = interaction.options.getString('evidence');
            const evidenceImage = interaction.options.getAttachment('image');
            
            // VALIDATIONS (Point 6)
            if (reportedUser.id === interaction.user.id) {
                return interaction.reply({ content: "❌ You cannot report yourself!", ephemeral: true });
            }

            if (reportedUser.bot) {
                return interaction.reply({ content: "❌ You cannot report bots!", ephemeral: true });
            }

            if (targetMember && targetMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({ content: "❌ You cannot report staff members through this command. Contact an administrator directly.", ephemeral: true });
            }
            
            // Anti-Abuse Check
            if (await checkAbuse(interaction, 'report', reason)) return;


            const settings = await db.getSettings(interaction.guild.id);
            const reportsChannelId = settings.reportsChannel;


            if (!reportsChannelId) {
                return interaction.reply({ content: '❌ Reports channel is not configured. Ask an admin to use `/set channel`.', ephemeral: true });
            }

            const channel = interaction.guild.channels.cache.get(reportsChannelId);
            if (!channel) return interaction.reply({ content: '❌ Reports channel not found.', ephemeral: true });

            const reportId = Math.random().toString(36).substring(2, 10).toUpperCase();

            const reportEmbed = new EmbedBuilder()
                .setColor('DarkRed')
                .setTitle(`🚨 New Player Report • #${reportId}`)
                .addFields(
                    { name: '🎯 Target', value: `${reportedUser} (\`${reportedUser.id}\`)`, inline: true },
                    { name: '📢 Reporter', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                    { name: '📋 Reason', value: `\`\`\`${reason}\`\`\``, inline: false },
                    { name: '🔍 Evidence', value: evidenceText || 'No extra context provided.', inline: false }
                )
                .setFooter({ text: `Report ID: ${reportId}` })
                .setTimestamp();

            if (evidenceImage?.contentType?.startsWith('image/')) {
                reportEmbed.setImage(evidenceImage.url);
            }

            await channel.send({ embeds: [reportEmbed] });

            // LOGGING
            await logger.logAction(interaction.client, "Report Submitted", reportedUser, interaction.user, `Report ID: #${reportId}. Reason: ${reason}`, interaction.guild);

            return interaction.reply({ content: '✅ **Report submitted!** Your report has been sent to the moderation team. Thank you!', ephemeral: true });
        }

        if (sub === 'view') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({ content: '❌ You do not have permission to view reports.', ephemeral: true });
            }
            
            const settings = await db.getSettings(interaction.guild.id);
            const reportsChannelId = settings.reportsChannel;

            
            if (!reportsChannelId) return interaction.reply({ content: '❌ Reports channel not configured.', ephemeral: true });
            
            return interaction.reply({ content: `📜 Please check the <#${reportsChannelId}> channel to view all active reports.`, ephemeral: true });
        }
    },
};
