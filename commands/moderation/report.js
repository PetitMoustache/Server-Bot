const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { checkAbuse } = require('../../utils/antiAbuse');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report a user to the moderation team')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to report')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for reporting')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('evidence')
                .setDescription('Additional text context or evidence')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Image evidence (screenshot)')
                .setRequired(false)),
    async execute(interaction, client) {
        // Anti-Abuse Check
        if (checkAbuse(interaction, 'report', interaction.options.getString('reason'))) return;

        const reportedUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const evidenceText = interaction.options.getString('evidence');
        const evidenceImage = interaction.options.getAttachment('image');
        
        const settings = db.getSettings(interaction.guild.id);
        const reportsChannelId = settings.reportsChannel;

        if (!reportsChannelId) {
            return interaction.reply({ content: 'Reports channel is not configured for this server. Please ask an admin to set it up using `/set channels`.', ephemeral: true });
        }

        const channel = interaction.guild.channels.cache.get(reportsChannelId);
        
        if (!channel) {
            return interaction.reply({ content: 'Could not find the reports channel. Check my permissions.', ephemeral: true });
        }

        // Generate unique Report ID
        const reportId = Math.random().toString(36).substring(2, 10).toUpperCase();
        const nowSecs = Math.floor(Date.now() / 1000);

        const reportEmbed = new EmbedBuilder()
            .setColor('DarkRed')
            .setTitle(`🚨 New Player Report • #${reportId}`)
            .setDescription('A member has submitted a report. Please review it below.')
            .addFields(
                { name: '🎯 Reported User', value: `${reportedUser} (${reportedUser.username})\nID: ${reportedUser.id}`, inline: false },
                { name: '📢 Reported By', value: `${interaction.user} (${interaction.user.username})\nID: ${interaction.user.id}`, inline: false },
                { name: '🕐 Submitted', value: `<t:${nowSecs}:F>\n<t:${nowSecs}:R>`, inline: false },
                { name: '📋 Reason', value: reason, inline: false },
                { name: '🔍 Evidence / Context', value: evidenceText || 'No additional text context provided.', inline: false }
            )
            .setFooter({ text: `Report ID: ${reportId}` })
            .setTimestamp();

        // Attach image if provided
        if (evidenceImage && evidenceImage.contentType && evidenceImage.contentType.startsWith('image/')) {
            reportEmbed.setImage(evidenceImage.url);
        }

        try {
            await channel.send({ embeds: [reportEmbed] });
            
            const replyEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('Report Sent Successfully')
                .setDescription('Your report has been sent to the moderation team.\nThank you for helping keep the server safe.')
                .setTimestamp();
                
            await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error sending the report.', ephemeral: true });
        }
    },
};
