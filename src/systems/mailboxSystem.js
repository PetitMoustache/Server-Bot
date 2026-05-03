const { load, save } = require("../database/db");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

/**
 * 📬 MAILX SYSTEM - PERSISTENT LAYER
 */

async function open(interaction) {
    const { createDashboard } = require('../utils/mailboxHelper');
    const dashboard = createDashboard(interaction.user, interaction.guild);
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

// Función para guardar mensajes físicamente
function saveMessage(fromId, toId, subject, content) {
    const db = load("mailbox");
    if (!db[toId]) db[toId] = [];
    
    db[toId].push({
        id: Math.random().toString(36).slice(2, 9).toUpperCase(),
        fromId,
        subject,
        content,
        timestamp: Date.now(),
        read: false
    });
    
    save("mailbox", db);
}

module.exports = { open, compose, saveMessage };
