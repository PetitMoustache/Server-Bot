const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createDashboard } = require('../utils/mailboxHelper');

module.exports = {
    async open(interaction) {
        const dashboard = createDashboard(interaction.user, interaction.guild);
        return interaction.reply({ ...dashboard, ephemeral: true });
    },

    async compose(interaction) {
        const target = interaction.options.getUser('target');
        
        if (!target) {
            return interaction.reply({ content: 'Please specify a user to message.', ephemeral: true });
        }

        if (target.bot) {
            return interaction.reply({ content: 'You cannot send messages to bots.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId(`mail_compose_modal_${target.id}`)
            .setTitle(`Message to ${target.username}`);

        const subjectInput = new TextInputBuilder()
            .setCustomId('mail_subject')
            .setLabel('Subject')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter subject...')
            .setRequired(true)
            .setMaxLength(100);

        const contentInput = new TextInputBuilder()
            .setCustomId('mail_content')
            .setLabel('Message')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Type your message here...')
            .setRequired(true)
            .setMaxLength(2000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(subjectInput),
            new ActionRowBuilder().addComponents(contentInput)
        );

        await interaction.showModal(modal);
    },

    async read(interaction) {
        const { createInbox } = require('../utils/mailboxHelper');
        const inbox = createInbox(interaction.user, interaction.guild);
        return interaction.reply({ ...inbox, ephemeral: true });
    }
};

