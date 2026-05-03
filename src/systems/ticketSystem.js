const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const { getGuildData, getSettings } = require("../database/db");
const logger = require("../utils/logger");
const { sendToMailbox } = require("../utils/mailboxHelper");

/**
 * 🎫 TICKET SYSTEM - LOGIC LAYER (MongoDB Migration)
 */

async function open(interaction) {
    const reason = interaction.options.getString("reason") || "No reason provided";
    const guild = interaction.guild;
    const db = await getGuildData(guild.id);
    
    if (!db) return interaction.reply({ content: "❌ Database error. Please try again later.", ephemeral: true });
    
    const settings = db.settings || {};
    
    // VALIDATION: No duplicar tickets
    const existingTicket = db.tickets?.find(t => t.userId === interaction.user.id && (t.status === "pending" || t.status === "active"));
    if (existingTicket) {
        return interaction.reply({ 
            content: `❌ **You already have an open ticket!** (#${existingTicket.id})\nWait for staff to respond or close your current ticket.`, 
            ephemeral: true 
        });
    }

    // 1. Buscar canal de destino
    let channelId = settings.ticketsChannel;
    let targetChannel = guild.channels.cache.get(channelId);

    // Fallback: Si no hay canal configurado, buscar uno por nombre
    if (!targetChannel) {
        targetChannel = guild.channels.cache.find(c => c.name.toLowerCase() === "tickets" && c.type === ChannelType.GuildText);
    }

    if (!targetChannel) {
        return interaction.reply({ 
            content: "❌ **Setup Error:** The tickets channel is not configured and I couldn't find a channel named `#tickets`. Please use `/set channel` and select a channel for tickets.", 
            ephemeral: true 
        });
    }

    // 2. Generar Ticket
    const ticketId = Math.random().toString(16).slice(2, 10).toUpperCase();
    
    const ticketEmbed = new EmbedBuilder()
        .setTitle(`🆘 New Ticket • #${ticketId}`)
        .setDescription(`A user has requested support.`)
        .addFields(
            { name: "👤 User", value: `${interaction.user} (${interaction.user.tag})`, inline: true },
            { name: "🆔 User ID", value: `\`${interaction.user.id}\``, inline: true },
            { name: "📋 Reason", value: `\`\`\`${reason}\`\`\`` }
        )
        .setColor("Orange")
        .setFooter({ text: "Click the button below to claim this ticket." })
        .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket_accept_${interaction.user.id}_${ticketId}`)
            .setLabel("Accept Ticket")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅"),
        new ButtonBuilder()
            .setCustomId(`ticket_deny_${interaction.user.id}_${ticketId}`)
            .setLabel("Deny")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("✖️")
    );

    try {
        const msg = await targetChannel.send({ embeds: [ticketEmbed], components: [buttons] });

        // Guardar en DB
        db.tickets.push({
            id: ticketId,
            userId: interaction.user.id,
            reason: reason,
            status: "pending",
            messageId: msg.id,
            createdAt: Date.now()
        });
        await db.save();

        // LOGGING
        await logger.logAction(interaction.client, "Ticket Opened", interaction.user, interaction.user, `Ticket #${ticketId} created. Reason: ${reason}`, guild);

        return interaction.reply({ 
            content: `✅ **Success!** Your ticket (#${ticketId}) has been sent to the staff.`, 
            ephemeral: true 
        });
    } catch (err) {
        console.error("[TICKET SYSTEM] Error sending message:", err);
        return interaction.reply({ content: "❌ Error sending ticket to the staff channel.", ephemeral: true });
    }
}

async function close(interaction) {
    const id = interaction.options.getString("id").toUpperCase();
    const db = await getGuildData(interaction.guild.id);
    if (!db) return interaction.reply({ content: "❌ Database error.", ephemeral: true });

    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) return interaction.reply({ content: "❌ Ticket not found.", ephemeral: true });

    ticket.status = "closed";
    ticket.closedAt = Date.now();
    await db.save();

    // Si estamos en un canal de ticket, podemos intentar borrarlo
    if (interaction.channel.name.includes("ticket-")) {
        await interaction.reply("🔒 Closing ticket in 5 seconds...");
        
        // LOGGING
        const targetUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
        await logger.logAction(interaction.client, "Ticket Closed", targetUser || { id: ticket.userId, tag: "Unknown" }, interaction.user, `Ticket #${id} closed.`, interaction.guild);

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    } else {
        return interaction.reply({ content: `✅ Ticket #${id} marked as closed.`, ephemeral: true });
    }
}

async function list(interaction) {
    const db = await getGuildData(interaction.guild.id);
    if (!db || db.tickets.length === 0) return interaction.reply({ content: "No tickets in database.", ephemeral: true });

    const recent = db.tickets.slice(-10).reverse();
    const listEmbed = new EmbedBuilder()
        .setTitle("🎫 Recent Tickets")
        .setColor("Blue")
        .setDescription(recent.map(t => `**#${t.id}** | <@${t.userId}> | \`${t.status}\``).join("\n"));

    return interaction.reply({ embeds: [listEmbed], ephemeral: true });
}

/**
 * 🖱️ Button Handler Logic
 */
async function handleButtons(interaction) {
    const [prefix, action, userId, ticketId] = interaction.customId.split("_");
    if (prefix !== "ticket") return;

    await interaction.deferReply({ ephemeral: true });
    const db = await getGuildData(interaction.guild.id);
    if (!db) return interaction.editReply("❌ Database error.");
    
    const guild = interaction.guild;

    // 1. ACEPTAR TICKET
    if (action === "accept") {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return interaction.editReply("❌ User left the server.");

        try {
            const channel = await guild.channels.create({
                name: `ticket-${member.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            // Update DB
            const t = db.tickets.find(x => x.id === ticketId);
            if (t) {
                t.status = "active";
                t.channelId = channel.id;
                await db.save();
            }

            const welcome = new EmbedBuilder()
                .setTitle(`🎫 Ticket #${ticketId}`)
                .setDescription(`Hello ${member}, staff is here to help.\n\n**Claimed by:** ${interaction.user}`)
                .setColor("Green")
                .setTimestamp();

            // Crear botón de cierre
            const closeButton = new ButtonBuilder()
                .setCustomId(`ticket_close_${ticketId}`)
                .setLabel("Close Ticket")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔒");

            const row = new ActionRowBuilder().addComponents(closeButton);

            await channel.send({ 
                content: `👋 ${member}, un moderador ha aceptado tu ticket.`, 
                embeds: [welcome], 
                components: [row] 
            });

            await interaction.editReply(`✅ **Ticket accepted!** Access it here: ${channel}`);
            
            // Quitar botones del mensaje original de staff
            await interaction.message.edit({ components: [] }).catch(() => {});

            // LOGGING
            await logger.logAction(interaction.client, "Ticket Accepted", member.user, interaction.user, `Ticket #${ticketId} accepted by staff.`, guild);
            
            // MAILBOX
            await sendToMailbox(guild, member.user, "Ticket", `Your ticket **#${ticketId}** has been accepted by **${interaction.user.tag}**.\n\nChannel: ${channel}`, "Green", interaction.user.id, "Ticket Accepted ✅");

        } catch (err) {
            console.error("[TICKET] Failed to create channel:", err);
            return interaction.editReply("❌ Internal error creating channel. Check bot permissions.");
        }
    }

    // 2. DENEGAR TICKET
    if (action === "deny") {
        const t = db.tickets.find(x => x.id === ticketId);
        if (t) {
            t.status = "denied";
            await db.save();
        }
        await interaction.message.delete().catch(() => {});
        await interaction.editReply("❌ **Ticket denied.** The user has been notified.");

        // LOGGING
        const member = await guild.members.fetch(userId).catch(() => null);
        await logger.logAction(interaction.client, "Ticket Denied", member?.user || { id: userId, tag: "Unknown" }, interaction.user, `Ticket #${ticketId} denied.`, guild);

        // MAILBOX
        if (member) {
            await sendToMailbox(guild, member.user, "Ticket", `Your ticket **#${ticketId}** was denied by staff.`, "Red", interaction.user.id, "Ticket Denied ❌");
        }
    }

    // 3. CERRAR TICKET (Boton dentro del canal)
    if (action === "close") {
        // Solo moderadores (check con roles configurados)
        const staffRoles = [db.settings.modRole, db.settings.adminRole].filter(id => id);
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) || 
                        interaction.member.roles.cache.some(r => staffRoles.includes(r.id));

        if (!isStaff) {
            return interaction.editReply("❌ Only staff can close tickets.");
        }

        const t = db.tickets.find(x => x.id === userId); // En este caso, el ID del ticket viene en la posicion de userId por el split
        if (t) {
            t.status = "closed";
            t.closedAt = Date.now();
            await db.save();
        }

        await interaction.editReply("🔒 **Closing ticket in 5 seconds...**");
        
        // LOGGING
        const targetUser = t ? await interaction.client.users.fetch(t.userId).catch(() => null) : null;
        await logger.logAction(interaction.client, "Ticket Closed", targetUser || { id: "Unknown", tag: "Unknown" }, interaction.user, `Ticket #${userId} closed.`, guild);

        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
}

module.exports = { open, close, list, handleButtons };
