const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

/**
 * 📬 MAILX SYSTEM - PERSISTENT LAYER (MongoDB Migration)
 */

async function open(interaction) {
    const { createDashboard } = require('../utils/mailboxHelper');
    const dashboard = await createDashboard(interaction.user, interaction.guild);
    return interaction.reply({ ...dashboard, ephemeral: true });
}

async function compose(interaction) {
    const target = interaction.options.getUser('target');
    
    if (!target || target.bot) {
        return interaction.reply({ content: '❌ Invalid user.', ephemeral: true });
    }

    const modal = new ModalBuilder()
        .setCustomId(`mail_modal_${target.id}`)
        .setTitle(`Message to ${target.username}`);

    const subject = new TextInputBuilder()
        .setCustomId('subject')
        .setLabel('Subject')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const message = new TextInputBuilder()
        .setCustomId('message')
        .setLabel('Message Content')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(subject),
        new ActionRowBuilder().addComponents(message)
    );

    await interaction.showModal(modal);
}

async function read(interaction) {
    const { createInbox } = require('../utils/mailboxHelper');
    const inbox = await createInbox(interaction.user, interaction.guild);
    return interaction.reply({ ...inbox, ephemeral: true });
}

async function handleButtons(interaction) {
    const { createDashboard, createInbox, createMessageView } = require('../utils/mailboxHelper');
    const mailboxDb = require('../utils/mailboxDb');
    const [prefix, action, extra] = interaction.customId.split('_');

    if (action === 'dash') {
        const dashboard = await createDashboard(interaction.user, interaction.guild);
        return interaction.update(dashboard);
    }

    if (action === 'inbox') {
        const page = parseInt(extra) || 0;
        const inbox = await createInbox(interaction.user, interaction.guild, page);
        return interaction.update(inbox);
    }

    if (action === 'compose') {
        return interaction.reply({ content: '✍️ To send a message, please use `/mailbox compose target:@user`', ephemeral: true });
    }

    if (action === 'clear') {
        await mailboxDb.clearMailbox(interaction.user.id, interaction.guild.id);
        const dashboard = await createDashboard(interaction.user, interaction.guild);
        return interaction.update(dashboard);
    }

    if (action === 'delete') {
        await mailboxDb.deleteMessage(interaction.user.id, interaction.guild.id, extra);
        const inbox = await createInbox(interaction.user, interaction.guild, 0);
        return interaction.update(inbox);
    }

    if (action === 'reply') {
        const target = await interaction.client.users.fetch(extra).catch(() => null);
        if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

        const { compose } = require('./mailboxSystem');
        const mockInteraction = {
            ...interaction,
            options: { getUser: () => target },
            showModal: (modal) => interaction.showModal(modal)
        };
        return compose(mockInteraction);
    }
}

async function handleSelectMenu(interaction) {
    const { createMessageView } = require('../utils/mailboxHelper');
    const mailboxDb = require('../utils/mailboxDb');
    
    if (interaction.customId === 'mail_view_select') {
        const messageId = interaction.values[0];
        const message = await mailboxDb.getMessageById(interaction.user.id, interaction.guild.id, messageId);
        
        if (!message) return interaction.reply({ content: '❌ Message not found.', ephemeral: true });

        await mailboxDb.markAsRead(interaction.user.id, interaction.guild.id, messageId);
        const view = createMessageView(message);
        return interaction.update(view);
    }
}

module.exports = { open, compose, read, handleButtons, handleSelectMenu };
